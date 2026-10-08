import assert from "node:assert/strict";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { connectDB } from "../lib/db";
import { Customer } from "../models/Customer";
import { User } from "../models/User";
import { MappingPlanModel } from "../models/MappingPlan";
import { inspectModel } from "../lib/schema/inspect";
import { validateMappingProposal } from "../lib/ai/validator";
import { MappingProposal } from "../types/mapping";
import { POST as createPlanHandler } from "../app/api/mapping/plans/route";
import { GET as getPlanHandler } from "../app/api/mapping/plans/[id]/route";
import { POST as approvePlanHandler } from "../app/api/mapping/plans/[id]/approve/route";
import { POST as rejectPlanHandler } from "../app/api/mapping/plans/[id]/reject/route";

async function runTests() {
  await connectDB();

  const sourceMeta = inspectModel(Customer);
  const targetMeta = inspectModel(User);

  const initialSourceCount = await Customer.countDocuments();
  const initialTargetCount = await User.countDocuments();

  assert.equal(initialSourceCount, 50, "Initial source count must be 50");
  assert.equal(initialTargetCount, 43, "Initial target count must be 43");

  const createdPlanIds: mongoose.Types.ObjectId[] = [];

  const validProposal: MappingProposal = {
    mappings: [
      {
        sourceFields: ["id"],
        targetField: "user_id",
        transformation: "identity",
        confidence: 1.0,
        rationale: "Direct identifier mapping",
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
        rationale: "Email address mapping",
      },
    ],
    unmappedSourceFields: ["phone", "date_of_birth"],
    unmappedTargetFields: ["phone_number", "birth_year"],
    risks: ["Sample test risk"],
  };

  try {
    const validated = validateMappingProposal(
      validProposal,
      sourceMeta,
      targetMeta
    );
    const plan = await MappingPlanModel.create({
      sourceCollection: sourceMeta.collection,
      targetCollection: targetMeta.collection,
      proposal: validated,
      status: "pending",
      rejectionReason: null,
      reviewedAt: null,
    });
    createdPlanIds.push(plan._id);

    assert.equal(plan.status, "pending");
    assert.equal(plan.sourceCollection, "source_customers");
    assert.equal(plan.targetCollection, "target_users");
    assert.equal(plan.proposal.mappings.length, 3);
    assert.equal(plan.reviewedAt, null);

    assert.throws(
      () =>
        validateMappingProposal(
          { mappings: "not an array" },
          sourceMeta,
          targetMeta
        ),
      /Invalid proposal/
    );

    assert.throws(
      () =>
        validateMappingProposal(
          {
            ...validProposal,
            mappings: [
              {
                sourceFields: ["non_existent_source_field"],
                targetField: "user_id",
                transformation: "identity",
                confidence: 1.0,
                rationale: "Invalid source field",
              },
            ],
          },
          sourceMeta,
          targetMeta
        ),
      /unknown source field/
    );

    assert.throws(
      () =>
        validateMappingProposal(
          {
            ...validProposal,
            mappings: [
              {
                sourceFields: ["id"],
                targetField: "non_existent_target_field",
                transformation: "identity",
                confidence: 1.0,
                rationale: "Invalid target field",
              },
            ],
          },
          sourceMeta,
          targetMeta
        ),
      /unknown target field/
    );

    assert.throws(
      () =>
        validateMappingProposal(
          {
            ...validProposal,
            mappings: [
              {
                sourceFields: ["id"],
                targetField: "user_id",
                transformation: "unsupported_eval_code",
                confidence: 1.0,
                rationale: "Invalid transform",
              },
            ],
          },
          sourceMeta,
          targetMeta
        ),
      /unsupported transformation/
    );

    assert.throws(
      () =>
        validateMappingProposal(
          {
            ...validProposal,
            mappings: [
              {
                sourceFields: ["id"],
                targetField: "user_id",
                transformation: "identity",
                confidence: 1.5,
                rationale: "Invalid confidence",
              },
            ],
          },
          sourceMeta,
          targetMeta
        ),
      /confidence must be a number between 0 and 1/
    );

    const planCreateReq = new NextRequest("http://localhost/api/mapping/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceCollection: "source_customers",
        targetCollection: "target_users",
        proposal: validProposal,
      }),
    });
    const planCreateRes = await createPlanHandler(planCreateReq);
    assert.equal(planCreateRes.status, 201);
    const createdData = await planCreateRes.json();
    assert.equal(createdData.status, "pending");
    assert.ok(createdData.id);
    createdPlanIds.push(new mongoose.Types.ObjectId(createdData.id));

    const badCollectionReq = new NextRequest("http://localhost/api/mapping/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceCollection: "invalid_source",
        targetCollection: "target_users",
        proposal: validProposal,
      }),
    });
    const badCollectionRes = await createPlanHandler(badCollectionReq);
    assert.equal(badCollectionRes.status, 400);

    const getPlanReq = new NextRequest(`http://localhost/api/mapping/plans/${createdData.id}`);
    const getPlanRes = await getPlanHandler(getPlanReq, {
      params: Promise.resolve({ id: createdData.id }),
    });
    assert.equal(getPlanRes.status, 200);
    const retrievedData = await getPlanRes.json();
    assert.equal(retrievedData.id, createdData.id);
    assert.equal(retrievedData.status, "pending");

    const approveReq = new NextRequest(
      `http://localhost/api/mapping/plans/${createdData.id}/approve`,
      { method: "POST" }
    );
    const approveRes = await approvePlanHandler(approveReq, {
      params: Promise.resolve({ id: createdData.id }),
    });
    assert.equal(approveRes.status, 200);
    const approvedData = await approveRes.json();
    assert.equal(approvedData.status, "approved");
    assert.ok(approvedData.reviewedAt);

    const dupApproveReq = new NextRequest(
      `http://localhost/api/mapping/plans/${createdData.id}/approve`,
      { method: "POST" }
    );
    const dupApproveRes = await approvePlanHandler(dupApproveReq, {
      params: Promise.resolve({ id: createdData.id }),
    });
    assert.equal(dupApproveRes.status, 409);

    const rejectApprovedReq = new NextRequest(
      `http://localhost/api/mapping/plans/${createdData.id}/reject`,
      { method: "POST" }
    );
    const rejectApprovedRes = await rejectPlanHandler(rejectApprovedReq, {
      params: Promise.resolve({ id: createdData.id }),
    });
    assert.equal(rejectApprovedRes.status, 409);

    const planForRejectReq = new NextRequest("http://localhost/api/mapping/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceCollection: "source_customers",
        targetCollection: "target_users",
        proposal: validProposal,
      }),
    });
    const planForRejectRes = await createPlanHandler(planForRejectReq);
    assert.equal(planForRejectRes.status, 201);
    const planForRejectData = await planForRejectRes.json();
    createdPlanIds.push(new mongoose.Types.ObjectId(planForRejectData.id));

    const rejectReq = new NextRequest(
      `http://localhost/api/mapping/plans/${planForRejectData.id}/reject`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Field mappings are suboptimal" }),
      }
    );
    const rejectRes = await rejectPlanHandler(rejectReq, {
      params: Promise.resolve({ id: planForRejectData.id }),
    });
    assert.equal(rejectRes.status, 200);
    const rejectedData = await rejectRes.json();
    assert.equal(rejectedData.status, "rejected");
    assert.equal(rejectedData.rejectionReason, "Field mappings are suboptimal");
    assert.ok(rejectedData.reviewedAt);

    const dupRejectReq = new NextRequest(
      `http://localhost/api/mapping/plans/${planForRejectData.id}/reject`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Second reject attempt" }),
      }
    );
    const dupRejectRes = await rejectPlanHandler(dupRejectReq, {
      params: Promise.resolve({ id: planForRejectData.id }),
    });
    assert.equal(dupRejectRes.status, 409);

    const approveRejectedReq = new NextRequest(
      `http://localhost/api/mapping/plans/${planForRejectData.id}/approve`,
      { method: "POST" }
    );
    const approveRejectedRes = await approvePlanHandler(approveRejectedReq, {
      params: Promise.resolve({ id: planForRejectData.id }),
    });
    assert.equal(approveRejectedRes.status, 409);

    const fakeId = new mongoose.Types.ObjectId().toString();
    const missingGetReq = new NextRequest(`http://localhost/api/mapping/plans/${fakeId}`);
    const missingGetRes = await getPlanHandler(missingGetReq, {
      params: Promise.resolve({ id: fakeId }),
    });
    assert.equal(missingGetRes.status, 404);

    const invalidIdReq = new NextRequest("http://localhost/api/mapping/plans/invalid-id-123");
    const invalidIdRes = await getPlanHandler(invalidIdReq, {
      params: Promise.resolve({ id: "invalid-id-123" }),
    });
    assert.equal(invalidIdRes.status, 400);

    const afterSourceCount = await Customer.countDocuments();
    const afterTargetCount = await User.countDocuments();
    assert.equal(afterSourceCount, 50, "Source count must remain 50");
    assert.equal(afterTargetCount, 43, "Target count must remain 43");

    const finalGetRes = await getPlanHandler(getPlanReq, {
      params: Promise.resolve({ id: createdData.id }),
    });
    assert.equal(finalGetRes.status, 200);
    const finalData = await finalGetRes.json();
    assert.equal(finalData.status, "approved");
    assert.equal(finalData.proposal.mappings.length, 3);
  } finally {
    if (createdPlanIds.length > 0) {
      await MappingPlanModel.deleteMany({ _id: { $in: createdPlanIds } });
    }
    await mongoose.disconnect();
  }

  console.log("ALL_PLAN_TESTS_PASSED");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
