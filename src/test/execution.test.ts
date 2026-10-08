import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import { connectDB } from "../lib/db";
import { Customer } from "../models/Customer";
import { User } from "../models/User";
import { MappingPlanModel } from "../models/MappingPlan";
import { MigrationRunModel } from "../models/MigrationRun";
import {
  executeMigration,
  processRecordExecution,
  ExecutionError,
} from "../lib/migration/execute";
import { inspectModel } from "../lib/schema/inspect";
import { MappingProposal } from "../types/mapping";

async function runTests() {
  const executeFilePath = path.join(process.cwd(), "src", "lib", "migration", "execute.ts");
  const executeFileContent = fs.readFileSync(executeFilePath, "utf-8");
  assert.ok(!executeFileContent.includes("@google/genai"));
  assert.ok(!executeFileContent.includes("GoogleGenAI"));
  assert.ok(!executeFileContent.includes("gemini"));

  const targetMeta = inspectModel(User);

  const testMappings = [
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
      rationale: "Combine first and last names",
    },
    {
      sourceFields: ["email"],
      targetField: "email_address",
      transformation: "identity",
      confidence: 0.9,
      rationale: "Email mapping",
    },
    {
      sourceFields: ["date_of_birth"],
      targetField: "birth_year",
      transformation: "extract_year",
      confidence: 0.85,
      rationale: "Extract birth year",
    },
  ];

  const seenIds = new Set<string>();

  const validRecordResult = processRecordExecution(
    {
      id: "CUST-999",
      first_name: "Test",
      last_name: "User",
      email: "test.user@example.com",
      date_of_birth: "1990-01-01",
    },
    testMappings,
    targetMeta,
    seenIds
  );
  assert.equal(validRecordResult.outcome.status, "migrated");
  assert.equal(validRecordResult.targetId, "CUST-999");
  assert.ok(seenIds.has("CUST-999"));

  const duplicateRecordResult = processRecordExecution(
    {
      id: "CUST-999",
      first_name: "Another",
      last_name: "User",
      email: "another.user@example.com",
      date_of_birth: "1992-02-02",
    },
    testMappings,
    targetMeta,
    seenIds
  );
  assert.equal(duplicateRecordResult.outcome.status, "failed");
  assert.equal(duplicateRecordResult.outcome.category, "duplicate_identity");

  const transformFailResult = processRecordExecution(
    {
      id: "CUST-998",
      first_name: "Invalid",
      last_name: "Date",
      email: "valid@example.com",
      date_of_birth: "not-a-date",
    },
    testMappings,
    targetMeta,
    seenIds
  );
  assert.equal(transformFailResult.outcome.status, "quarantined");
  assert.equal(transformFailResult.outcome.category, "transformation_error");

  const validationFailResult = processRecordExecution(
    {
      id: "CUST-997",
      first_name: "Invalid",
      last_name: "Email",
      email: "not-an-email",
      date_of_birth: "1990-01-01",
    },
    testMappings,
    targetMeta,
    seenIds
  );
  assert.equal(validationFailResult.outcome.status, "quarantined");
  assert.equal(validationFailResult.outcome.category, "validation_error");

  const missingIdentityResult = processRecordExecution(
    {
      first_name: "No",
      last_name: "Id",
      email: "no.id@example.com",
    },
    [
      {
        sourceFields: ["first_name", "last_name"],
        targetField: "full_name",
        transformation: "concat_with_space",
        confidence: 0.95,
        rationale: "Name mapping",
      },
    ],
    targetMeta,
    seenIds
  );
  assert.equal(missingIdentityResult.outcome.status, "quarantined");

  await connectDB();

  const sourceBefore = await Customer.countDocuments();
  const targetBefore = await User.countDocuments();

  assert.equal(sourceBefore, 50);

  const createdPlanIds: mongoose.Types.ObjectId[] = [];
  const createdRunIds: mongoose.Types.ObjectId[] = [];

  const standardProposal: MappingProposal = {
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
        rationale: "Combine first and last names",
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
        rationale: "Extract birth year",
      },
    ],
    unmappedSourceFields: [],
    unmappedTargetFields: [],
    risks: ["Date format parsing assumptions may lose precision"],
  };

  try {
    await assert.rejects(
      async () => executeMigration("invalid-object-id"),
      (err: unknown) => err instanceof ExecutionError && err.status === 400
    );

    const nonExistentId = new mongoose.Types.ObjectId().toString();
    await assert.rejects(
      async () => executeMigration(nonExistentId),
      (err: unknown) => err instanceof ExecutionError && err.status === 404
    );

    const pendingPlan = await MappingPlanModel.create({
      sourceCollection: "source_customers",
      targetCollection: "target_users",
      proposal: standardProposal,
      status: "pending",
    });
    createdPlanIds.push(pendingPlan._id);

    await assert.rejects(
      async () => executeMigration(pendingPlan._id.toString()),
      (err: unknown) => err instanceof ExecutionError && err.status === 409
    );

    const rejectedPlan = await MappingPlanModel.create({
      sourceCollection: "source_customers",
      targetCollection: "target_users",
      proposal: standardProposal,
      status: "rejected",
      rejectionReason: "Test rejection",
      reviewedAt: new Date(),
    });
    createdPlanIds.push(rejectedPlan._id);

    await assert.rejects(
      async () => executeMigration(rejectedPlan._id.toString()),
      (err: unknown) => err instanceof ExecutionError && err.status === 409
    );

    const approvedPlan = await MappingPlanModel.create({
      sourceCollection: "source_customers",
      targetCollection: "target_users",
      proposal: standardProposal,
      status: "approved",
      reviewedAt: new Date(),
    });
    createdPlanIds.push(approvedPlan._id);

    const result = await executeMigration(approvedPlan._id.toString());
    createdRunIds.push(new mongoose.Types.ObjectId(result.runId));

    assert.equal(result.status, "completed");
    assert.equal(result.totalRecords, 50);
    assert.equal(result.migratedRecords + result.skippedRecords, 43);
    assert.equal(result.quarantinedRecords, 7);
    assert.equal(result.failedRecords, 0);
    assert.equal(
      result.totalRecords,
      result.migratedRecords + result.skippedRecords + result.quarantinedRecords + result.failedRecords
    );

    const cust001 = await User.findOne({ user_id: "CUST-001" }).lean();
    assert.ok(cust001);
    assert.equal(cust001.user_id, "CUST-001");
    assert.equal(cust001.full_name, "Aarav Sharma");
    assert.equal(cust001.email_address, "aarav.sharma@example.com");
    assert.equal(cust001.phone_number, "+1-555-0101");
    assert.equal(cust001.birth_year, 1990);

    const badEmailUser = await User.findOne({ user_id: "CUST-041" });
    assert.equal(badEmailUser, null);

    const badDateUser = await User.findOne({ user_id: "CUST-048" });
    assert.equal(badDateUser, null);

    const badPhoneUser = await User.findOne({ user_id: "CUST-049" });
    assert.equal(badPhoneUser, null);

    const multiIssueUser = await User.findOne({ user_id: "CUST-050" });
    assert.equal(multiIssueUser, null);

    const cust048Outcome = result.recordResults.find((r) => r.sourceId === "CUST-048");
    assert.ok(cust048Outcome);
    assert.equal(cust048Outcome.status, "quarantined");
    assert.equal(cust048Outcome.category, "transformation_error");
    assert.ok(
      cust048Outcome.errors?.some((e) => e.field === "birth_year")
    );

    const cust041Outcome = result.recordResults.find((r) => r.sourceId === "CUST-041");
    assert.ok(cust041Outcome);
    assert.equal(cust041Outcome.status, "quarantined");
    assert.equal(cust041Outcome.category, "validation_error");
    assert.ok(
      cust041Outcome.errors?.some((e) => e.field === "email_address")
    );

    const persistedRun = await MigrationRunModel.findById(result.runId).lean();
    assert.ok(persistedRun);
    assert.equal(persistedRun.status, "completed");
    assert.equal(persistedRun.totalRecords, 50);
    assert.equal(persistedRun.migratedRecords + persistedRun.skippedRecords, 43);
    assert.equal(persistedRun.quarantinedRecords, 7);
    assert.equal(persistedRun.failedRecords, 0);
    assert.equal(persistedRun.recordResults.length, 50);

    const sourceAfter = await Customer.countDocuments();
    assert.equal(sourceAfter, 50);

    const targetUsers = await User.find().lean();
    assert.equal(targetUsers.length, 43);
    for (const u of targetUsers) {
      assert.equal(typeof u.user_id, "string");
      assert.ok(u.user_id.length > 0);
      assert.equal(typeof u.full_name, "string");
      assert.ok(u.full_name.length > 0);
      if (u.birth_year !== null) {
        assert.equal(typeof u.birth_year, "number");
        assert.ok(u.birth_year >= 1850 && u.birth_year <= 2050);
      }
    }
  } finally {
    if (createdPlanIds.length > 0) {
      await MappingPlanModel.deleteMany({ _id: { $in: createdPlanIds } });
    }
    if (createdRunIds.length > 0) {
      await MigrationRunModel.deleteMany({ _id: { $in: createdRunIds } });
    }
    if (targetBefore === 0) {
      await User.deleteMany({});
    }
    await mongoose.disconnect();
  }

  console.log("ALL_EXECUTION_TESTS_PASSED");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
