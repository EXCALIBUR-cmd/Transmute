import assert from "node:assert/strict";
import mongoose from "mongoose";
import { connectDB } from "../lib/db";
import { Customer } from "../models/Customer";
import { User } from "../models/User";
import { MappingPlanModel } from "../models/MappingPlan";
import { MigrationRunModel } from "../models/MigrationRun";
import {
  processRecordExecution,
  executeMigration,
} from "../lib/migration/execute";
import {
  reconcileMigrationRun,
  ReconciliationError,
} from "../lib/migration/reconcile";
import {
  rollbackMigrationRun,
  RollbackError,
} from "../lib/migration/rollback";
import { backfillLegacyRunOwnership } from "../lib/migration/backfill";
import { inspectModel } from "../lib/schema/inspect";
import { MappingProposal } from "../types/mapping";

async function runTests() {
  await connectDB();

  const targetMeta = inspectModel(User);

  const testProposal: MappingProposal = {
    mappings: [
      {
        sourceFields: ["id"],
        targetField: "user_id",
        transformation: "identity",
        confidence: 1.0,
        rationale: "Direct key mapping",
      },
      {
        sourceFields: ["first_name", "last_name"],
        targetField: "full_name",
        transformation: "concat_with_space",
        confidence: 0.95,
        rationale: "Combine names",
      },
      {
        sourceFields: ["email"],
        targetField: "email_address",
        transformation: "identity",
        confidence: 0.9,
        rationale: "Email mapping",
      },
      {
        sourceFields: ["phone"],
        targetField: "phone_number",
        transformation: "identity",
        confidence: 0.9,
        rationale: "Phone mapping",
      },
      {
        sourceFields: ["date_of_birth"],
        targetField: "birth_year",
        transformation: "extract_year",
        confidence: 0.85,
        rationale: "Extract year",
      },
    ],
    unmappedSourceFields: [],
    unmappedTargetFields: [],
    risks: [],
  };

  const rawDoc = {
    id: "TEST-IDEMP-01",
    first_name: "John",
    last_name: "Doe",
    email: "john.doe@example.com",
    phone: "+1-555-9999",
    date_of_birth: "1990-05-20",
  };

  const seen1 = new Set<string>();
  const firstResult = processRecordExecution(
    rawDoc,
    testProposal.mappings,
    targetMeta,
    seen1,
    null
  );
  assert.equal(firstResult.outcome.status, "migrated");
  assert.equal(firstResult.outcome.action, "created");

  const matchingTarget = {
    user_id: "TEST-IDEMP-01",
    full_name: "John Doe",
    email_address: "john.doe@example.com",
    phone_number: "+1-555-9999",
    birth_year: 1990,
  };

  const seen2 = new Set<string>();
  const secondResult = processRecordExecution(
    rawDoc,
    testProposal.mappings,
    targetMeta,
    seen2,
    matchingTarget
  );
  assert.equal(secondResult.outcome.status, "skipped");
  assert.equal(secondResult.outcome.action, "skipped");
  assert.equal(secondResult.outcome.reason, "already_migrated");

  const conflictingTarget = {
    user_id: "TEST-IDEMP-01",
    full_name: "Different Name",
    email_address: "john.doe@example.com",
    phone_number: "+1-555-9999",
    birth_year: 1990,
  };

  const seen3 = new Set<string>();
  const conflictResult = processRecordExecution(
    rawDoc,
    testProposal.mappings,
    targetMeta,
    seen3,
    conflictingTarget
  );
  assert.equal(conflictResult.outcome.status, "failed");
  assert.equal(conflictResult.outcome.action, "conflict");
  assert.equal(conflictResult.outcome.reason, "content_mismatch");

  const createdPlanIds: mongoose.Types.ObjectId[] = [];
  const createdRunIds: mongoose.Types.ObjectId[] = [];
  const tempTargetIds: string[] = [];

  try {
    const testPlan = await MappingPlanModel.create({
      sourceCollection: "source_customers",
      targetCollection: "target_users",
      proposal: testProposal,
      status: "approved",
      reviewedAt: new Date(),
    });
    createdPlanIds.push(testPlan._id);

    const runDoc1 = await MigrationRunModel.create({
      planId: testPlan._id,
      sourceCollection: "source_customers",
      targetCollection: "target_users",
      status: "completed",
      totalRecords: 2,
      migratedRecords: 2,
      skippedRecords: 0,
      quarantinedRecords: 0,
      failedRecords: 0,
      startedAt: new Date(),
      completedAt: new Date(),
      recordResults: [
        {
          sourceId: "CUST-001",
          status: "migrated",
          action: "created",
          targetId: "CUST-001",
        },
        {
          sourceId: "CUST-002",
          status: "migrated",
          action: "created",
          targetId: "CUST-002",
        },
      ],
    });
    createdRunIds.push(runDoc1._id);

    const reconcileResult1 = await reconcileMigrationRun(runDoc1._id.toString());
    assert.equal(reconcileResult1.status, "reconciled");
    assert.equal(reconcileResult1.matchedRecords, 2);
    assert.equal(reconcileResult1.missingRecords.length, 0);
    assert.equal(reconcileResult1.contentMismatches.length, 0);
    assert.equal(reconcileResult1.quarantinedRecordsPresent.length, 0);

    const runDocMissing = await MigrationRunModel.create({
      planId: testPlan._id,
      sourceCollection: "source_customers",
      targetCollection: "target_users",
      status: "completed",
      totalRecords: 1,
      migratedRecords: 1,
      skippedRecords: 0,
      quarantinedRecords: 0,
      failedRecords: 0,
      startedAt: new Date(),
      completedAt: new Date(),
      recordResults: [
        {
          sourceId: "NON-EXISTENT",
          status: "migrated",
          action: "created",
          targetId: "NON-EXISTENT-TARGET",
        },
      ],
    });
    createdRunIds.push(runDocMissing._id);

    const reconcileMissing = await reconcileMigrationRun(runDocMissing._id.toString());
    assert.equal(reconcileMissing.status, "failed");
    assert.ok(reconcileMissing.missingRecords.includes("NON-EXISTENT-TARGET"));

    const runDocMismatch = await MigrationRunModel.create({
      planId: testPlan._id,
      sourceCollection: "source_customers",
      targetCollection: "target_users",
      status: "completed",
      totalRecords: 1,
      migratedRecords: 1,
      skippedRecords: 0,
      quarantinedRecords: 0,
      failedRecords: 0,
      startedAt: new Date(),
      completedAt: new Date(),
      recordResults: [
        {
          sourceId: "CUST-001",
          status: "migrated",
          action: "created",
          targetId: "CUST-002",
        },
      ],
    });
    createdRunIds.push(runDocMismatch._id);

    const reconcileMismatch = await reconcileMigrationRun(runDocMismatch._id.toString());
    assert.equal(reconcileMismatch.status, "failed");
    assert.ok(reconcileMismatch.contentMismatches.length > 0);

    const targetBeforeRecon = await User.countDocuments();
    const sourceBeforeRecon = await Customer.countDocuments();
    await reconcileMigrationRun(runDoc1._id.toString());
    const targetAfterRecon = await User.countDocuments();
    const sourceAfterRecon = await Customer.countDocuments();
    assert.equal(targetBeforeRecon, targetAfterRecon);
    assert.equal(sourceBeforeRecon, sourceAfterRecon);

    const testTargetId1 = "TEST-ROLLBACK-TARGET-01";
    const testTargetId2 = "TEST-ROLLBACK-TARGET-02";
    const preExistingId = "TEST-PRE-EXISTING-TARGET";
    tempTargetIds.push(testTargetId1, testTargetId2, preExistingId);

    await User.create({
      user_id: testTargetId1,
      full_name: "Rollback User 1",
      email_address: "rb1@example.com",
      phone_number: "+1-555-1111",
      birth_year: 1991,
    });

    await User.create({
      user_id: testTargetId2,
      full_name: "Rollback User 2",
      email_address: "rb2@example.com",
      phone_number: "+1-555-2222",
      birth_year: 1992,
    });

    await User.create({
      user_id: preExistingId,
      full_name: "Pre Existing",
      email_address: "pre@example.com",
      phone_number: "+1-555-0000",
      birth_year: 1980,
    });

    const runForRollback = await MigrationRunModel.create({
      planId: testPlan._id,
      sourceCollection: "source_customers",
      targetCollection: "target_users",
      status: "completed",
      totalRecords: 4,
      migratedRecords: 2,
      skippedRecords: 1,
      quarantinedRecords: 1,
      failedRecords: 0,
      startedAt: new Date(),
      completedAt: new Date(),
      recordResults: [
        {
          sourceId: "TEMP-SRC-01",
          status: "migrated",
          action: "created",
          targetId: testTargetId1,
        },
        {
          sourceId: "TEMP-SRC-02",
          status: "migrated",
          action: "created",
          targetId: testTargetId2,
        },
        {
          sourceId: "TEMP-SRC-03",
          status: "skipped",
          action: "skipped",
          targetId: preExistingId,
        },
        {
          sourceId: "TEMP-SRC-04",
          status: "quarantined",
          action: "quarantined",
          targetId: null,
        },
      ],
    });
    createdRunIds.push(runForRollback._id);

    const rollbackResult = await rollbackMigrationRun(runForRollback._id.toString());
    assert.equal(rollbackResult.status, "rolled_back");
    assert.equal(rollbackResult.rolledBackCount, 2);

    const rbTarget1 = await User.findOne({ user_id: testTargetId1 });
    assert.equal(rbTarget1, null);

    const rbTarget2 = await User.findOne({ user_id: testTargetId2 });
    assert.equal(rbTarget2, null);

    const preExistingDoc = await User.findOne({ user_id: preExistingId });
    assert.ok(preExistingDoc);
    assert.equal(preExistingDoc.user_id, preExistingId);

    const secondRollbackResult = await rollbackMigrationRun(runForRollback._id.toString());
    assert.equal(secondRollbackResult.status, "rolled_back");
    assert.equal(secondRollbackResult.rolledBackCount, 0);

    const persistedRollbackRun = await MigrationRunModel.findById(runForRollback._id);
    assert.ok(persistedRollbackRun);
    assert.equal(persistedRollbackRun.rollbackStatus, "rolled_back");
    assert.equal(persistedRollbackRun.rolledBackCount, 2);
    assert.ok(persistedRollbackRun.rollbackCompletedAt);

    const runSkippedOnly = await MigrationRunModel.create({
      planId: testPlan._id,
      sourceCollection: "source_customers",
      targetCollection: "target_users",
      status: "completed",
      totalRecords: 1,
      migratedRecords: 0,
      skippedRecords: 1,
      quarantinedRecords: 0,
      failedRecords: 0,
      startedAt: new Date(),
      completedAt: new Date(),
      recordResults: [
        {
          sourceId: "TEMP-SRC-05",
          status: "skipped",
          action: "skipped",
          targetId: preExistingId,
        },
      ],
    });
    createdRunIds.push(runSkippedOnly._id);

    await assert.rejects(
      async () => rollbackMigrationRun(runSkippedOnly._id.toString()),
      (err: unknown) => err instanceof RollbackError && err.status === 409
    );

    const runUnverifiedLegacy = await MigrationRunModel.create({
      planId: testPlan._id,
      sourceCollection: "source_customers",
      targetCollection: "target_users",
      status: "completed",
      totalRecords: 1,
      migratedRecords: 1,
      skippedRecords: 0,
      quarantinedRecords: 0,
      failedRecords: 0,
      startedAt: new Date(),
      completedAt: new Date(),
      recordResults: [
        {
          sourceId: "LEGACY-01",
          status: "migrated",
          targetId: "LEGACY-TARGET-01",
        },
      ],
    });
    createdRunIds.push(runUnverifiedLegacy._id);

    await assert.rejects(
      async () => rollbackMigrationRun(runUnverifiedLegacy._id.toString()),
      (err: unknown) => err instanceof RollbackError && err.status === 409
    );

    const backfillResult = await backfillLegacyRunOwnership("6ac742e5264bca96e009f5fb");
    assert.equal(backfillResult.success, true);
    assert.equal(backfillResult.backfilledCount, 43);

    const legacyRunAfterBackfill = await MigrationRunModel.findById("6ac742e5264bca96e009f5fb");
    assert.ok(legacyRunAfterBackfill);
    const createdCount = legacyRunAfterBackfill.recordResults.filter((r) => r.action === "created").length;
    assert.equal(createdCount, 43);
  } finally {
    if (tempTargetIds.length > 0) {
      await User.deleteMany({ user_id: { $in: tempTargetIds } });
    }
    if (createdRunIds.length > 0) {
      await MigrationRunModel.deleteMany({ _id: { $in: createdRunIds } });
    }
    if (createdPlanIds.length > 0) {
      await MappingPlanModel.deleteMany({ _id: { $in: createdPlanIds } });
    }
    await mongoose.disconnect();
  }

  console.log("ALL_SAFETY_TESTS_PASSED");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
