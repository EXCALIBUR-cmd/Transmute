import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { MappingPlanModel, IMappingPlan } from "@/models/MappingPlan";
import { connectDB } from "@/lib/db";
import { logWorkflowEvent } from "@/lib/logger";

function formatPlan(doc: IMappingPlan) {
  return {
    id: doc._id.toString(),
    sourceCollection: doc.sourceCollection,
    targetCollection: doc.targetCollection,
    proposal: doc.proposal,
    status: doc.status,
    rejectionReason: doc.rejectionReason ?? null,
    createdAt: doc.createdAt.toISOString(),
    reviewedAt: doc.reviewedAt ? doc.reviewedAt.toISOString() : null,
  };
}

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { error: "Invalid plan ID format" },
      { status: 400 }
    );
  }

  try {
    await connectDB();
    const plan = await MappingPlanModel.findById(id).exec();

    if (!plan) {
      return NextResponse.json(
        { error: "Mapping plan not found" },
        { status: 404 }
      );
    }

    if (plan.status === "approved") {
      return NextResponse.json(
        { error: "Plan is already approved" },
        { status: 409 }
      );
    }

    if (plan.status === "rejected") {
      return NextResponse.json(
        { error: "Cannot approve a rejected plan" },
        { status: 409 }
      );
    }

    if (plan.status !== "pending") {
      return NextResponse.json(
        { error: `Cannot approve plan with current status: ${plan.status}` },
        { status: 400 }
      );
    }

    plan.status = "approved";
    plan.reviewedAt = new Date();
    await plan.save();

    logWorkflowEvent({
      event: "mapping_plan_approved",
      planId: plan._id.toString(),
      sourceCollection: plan.sourceCollection,
      targetCollection: plan.targetCollection,
      mappingCount: plan.proposal.mappings.length,
      status: plan.status,
    });

    return NextResponse.json(formatPlan(plan), { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to approve mapping plan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
