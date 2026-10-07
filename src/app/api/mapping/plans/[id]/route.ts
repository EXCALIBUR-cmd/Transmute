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

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    logWorkflowEvent({
      event: "mapping_plan_fetch_failed",
      planId: id,
      error: "Invalid plan ID format",
    });
    return NextResponse.json(
      { error: "Invalid plan ID format" },
      { status: 400 }
    );
  }

  try {
    await connectDB();
    const plan = await MappingPlanModel.findById(id).exec();

    if (!plan) {
      logWorkflowEvent({
        event: "mapping_plan_fetch_failed",
        planId: id,
        error: "Mapping plan not found",
      });
      return NextResponse.json(
        { error: "Mapping plan not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(formatPlan(plan));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to retrieve mapping plan";
    logWorkflowEvent({
      event: "mapping_plan_fetch_failed",
      planId: id,
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
