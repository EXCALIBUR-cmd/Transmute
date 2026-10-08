import assert from "node:assert/strict";
import mongoose from "mongoose";
import { connectDB } from "../lib/db";
import { Customer } from "../models/Customer";
import { User } from "../models/User";
import { MappingPlanModel } from "../models/MappingPlan";
import { inspectModel } from "../lib/schema/inspect";
import {
  identity,
  concat_with_space,
  extract_year,
  trim,
  lowercase,
  uppercase,
  to_string,
  to_number,
  format_date,
  TransformationError,
} from "../lib/migration/transform";
import { validateTargetRecord } from "../lib/migration/validator";
import { executeDryRun, DryRunError } from "../lib/migration/dry-run";
import { MappingProposal } from "../types/mapping";

async function runTests() {
  assert.equal(identity(["test-value"]), "test-value");
  assert.equal(identity([]), undefined);

  assert.equal(concat_with_space(["Aarav", "Sharma"]), "Aarav Sharma");
  assert.equal(concat_with_space(["OnlyOne"]), "OnlyOne");

  assert.equal(extract_year(["1990-03-15"]), 1990);
  assert.equal(extract_year([null]), null);

  assert.equal(trim(["  padded string  "]), "padded string");

  assert.equal(lowercase(["TransMute"]), "transmute");

  assert.equal(uppercase(["TransMute"]), "TRANSMUTE");

  assert.equal(to_string([2024]), "2024");

  assert.equal(to_number(["1985"]), 1985);

  assert.equal(format_date(["1990-03-15"]), "1990-03-15");

  assert.throws(() => to_number(["not-a-number"]), TransformationError);

  assert.throws(() => extract_year(["not-a-date"]), TransformationError);
  assert.throws(() => extract_year(["1985-13-45"]), TransformationError);

  const targetMeta = inspectModel(User);

  const missingRequiredErrors = validateTargetRecord(
    { full_name: "Jane Doe" },
    targetMeta
  );
  assert.ok(
    missingRequiredErrors.some(
      (e) => e.field === "user_id" && e.category === "missing_required_field"
    )
  );

  const typeMismatchErrors = validateTargetRecord(
    {
      user_id: "U-1",
      full_name: "Jane Doe",
      birth_year: "not-a-number" as unknown as number,
    },
    targetMeta
  );
  assert.ok(
    typeMismatchErrors.some(
      (e) => e.field === "birth_year" && e.category === "type_mismatch"
    )
  );

  const invalidEmailErrors = validateTargetRecord(
    {
      user_id: "U-1",
      full_name: "Jane Doe",
      email_address: "not-an-email",
    },
    targetMeta
  );
  assert.ok(
    invalidEmailErrors.some(
      (e) =>
        e.field === "email_address" && e.category === "format_validation_error"
    )
  );

  const multiIssueErrors = validateTargetRecord(
    {
      user_id: "U-2",
      full_name: "Ali Yilmaz",
      phone_number: "???",
      birth_year: 9999,
    },
    targetMeta
  );
  assert.ok(
    multiIssueErrors.some(
      (e) =>
        e.field === "phone_number" && e.category === "format_validation_error"
    )
  );
  assert.ok(
    multiIssueErrors.some(
      (e) => e.field === "birth_year" && e.category === "format_validation_error"
    )
  );

  await connectDB();

  const sourceBefore = await Customer.countDocuments();
  const targetBefore = await User.countDocuments();

  assert.equal(sourceBefore, 50);
  assert.equal(targetBefore, 43);

  const createdPlanIds: mongoose.Types.ObjectId[] = [];

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
    const approvedPlan = await MappingPlanModel.create({
      sourceCollection: "source_customers",
      targetCollection: "target_users",
      proposal: testProposal,
      status: "approved",
      reviewedAt: new Date(),
    });
    createdPlanIds.push(approvedPlan._id);

    const dryRunResult1 = await executeDryRun(approvedPlan._id.toString());
    assert.equal(dryRunResult1.totalRecords, 50);
    assert.equal(
      dryRunResult1.validRecords + dryRunResult1.invalidRecords,
      50
    );
    assert.ok(dryRunResult1.validRecords > 0);
    assert.ok(dryRunResult1.invalidRecords > 0);
    assert.ok(dryRunResult1.quarantinedRecords.length > 0);

    const cust048 = dryRunResult1.quarantinedRecords.find(
      (r) => r.sourceId === "CUST-048"
    );
    assert.ok(cust048);
    assert.ok(cust048.failedFields.includes("birth_year"));
    assert.ok(cust048.categories.includes("transformation_error"));

    const cust050 = dryRunResult1.quarantinedRecords.find(
      (r) => r.sourceId === "CUST-050"
    );
    assert.ok(cust050);
    assert.ok(cust050.errors.length >= 2);

    const pendingPlan = await MappingPlanModel.create({
      sourceCollection: "source_customers",
      targetCollection: "target_users",
      proposal: testProposal,
      status: "pending",
    });
    createdPlanIds.push(pendingPlan._id);

    await assert.rejects(
      async () => executeDryRun(pendingPlan._id.toString()),
      (err: unknown) => err instanceof DryRunError && err.status === 409
    );

    const rejectedPlan = await MappingPlanModel.create({
      sourceCollection: "source_customers",
      targetCollection: "target_users",
      proposal: testProposal,
      status: "rejected",
      rejectionReason: "Test rejection",
      reviewedAt: new Date(),
    });
    createdPlanIds.push(rejectedPlan._id);

    await assert.rejects(
      async () => executeDryRun(rejectedPlan._id.toString()),
      (err: unknown) => err instanceof DryRunError && err.status === 409
    );

    const targetAfter = await User.countDocuments();
    assert.equal(targetAfter, 43);

    const sourceAfter = await Customer.countDocuments();
    assert.equal(sourceAfter, 50);

    const dryRunResult2 = await executeDryRun(approvedPlan._id.toString());
    assert.equal(dryRunResult1.totalRecords, dryRunResult2.totalRecords);
    assert.equal(dryRunResult1.validRecords, dryRunResult2.validRecords);
    assert.equal(dryRunResult1.invalidRecords, dryRunResult2.invalidRecords);
    assert.equal(
      dryRunResult1.statistics.transformationFailures,
      dryRunResult2.statistics.transformationFailures
    );
    assert.equal(
      dryRunResult1.statistics.validationFailures,
      dryRunResult2.statistics.validationFailures
    );
  } finally {
    if (createdPlanIds.length > 0) {
      await MappingPlanModel.deleteMany({ _id: { $in: createdPlanIds } });
    }
    await mongoose.disconnect();
  }

  console.log("ALL_DRY_RUN_TESTS_PASSED");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
