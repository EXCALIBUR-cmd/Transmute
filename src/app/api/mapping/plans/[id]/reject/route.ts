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
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { error: "Invalid plan ID format" },
      { status: 400 }
    );
  }

  let reason: string | null = null;
  try {
    const text = await req.text();
    if (text && text.trim()) {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object" && "reason" in parsed) {
        if (typeof parsed.reason === "string") {
          reason = parsed.reason.trim() || null;
        } else if (parsed.reason !== null && parsed.reason !== undefined) {
          return NextResponse.json(
            { error: "Rejection reason must be a string" },
            { status: 400 }
          );
        }
      }
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
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

    if (plan.status === "rejected") {
      return NextResponse.json(
        { error: "Plan is already rejected" },
        { status: 409 }
      );
    }

    if (plan.status === "approved") {
      return NextResponse.json(
        { error: "Cannot reject an approved plan" },
        { status: 409 }
      );
    }

    if (plan.status !== "pending") {
      return NextResponse.json(
        { error: `Cannot reject plan with current status: ${plan.status}` },
        { status: 400 }
      );
    }

    plan.status = "rejected";
    plan.reviewedAt = new Date();
    plan.rejectionReason = reason;
    await plan.save();

    logWorkflowEvent({
      event: "mapping_plan_rejected",
      planId: plan._id.toString(),
      sourceCollection: plan.sourceCollection,
      targetCollection: plan.targetCollection,
      mappingCount: plan.proposal.mappings.length,
      status: plan.status,
      rejectionReason: reason,
    });

    return NextResponse.json(formatPlan(plan), { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reject mapping plan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
