import { NextRequest, NextResponse } from "next/server";
import { Customer } from "@/models/Customer";
import { User } from "@/models/User";
import { MappingPlanModel, IMappingPlan } from "@/models/MappingPlan";
import { inspectModel } from "@/lib/schema/inspect";
import { validateMappingProposal } from "@/lib/ai/validator";
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

export async function GET() {
  try {
    await connectDB();
    const plans = await MappingPlanModel.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .exec();

    return NextResponse.json({
      plans: plans.map((p) => formatPlan(p)),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to retrieve mapping plans";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body in request" },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid request: body must be a JSON object" },
        { status: 400 }
      );
    }

    const rec = body as Record<string, unknown>;
    const { sourceCollection, targetCollection, proposal } = rec;

    if (typeof sourceCollection !== "string" || !sourceCollection.trim()) {
      return NextResponse.json(
        { error: "sourceCollection is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    if (typeof targetCollection !== "string" || !targetCollection.trim()) {
      return NextResponse.json(
        { error: "targetCollection is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    if (!proposal || typeof proposal !== "object" || Array.isArray(proposal)) {
      return NextResponse.json(
        { error: "proposal is required and must be an object" },
        { status: 400 }
      );
    }

    const sourceMeta = inspectModel(Customer);
    const targetMeta = inspectModel(User);

    if (sourceCollection.trim() !== sourceMeta.collection) {
      return NextResponse.json(
        {
          error: `Invalid source collection "${sourceCollection}". Expected "${sourceMeta.collection}".`,
        },
        { status: 400 }
      );
    }

    if (targetCollection.trim() !== targetMeta.collection) {
      return NextResponse.json(
        {
          error: `Invalid target collection "${targetCollection}". Expected "${targetMeta.collection}".`,
        },
        { status: 400 }
      );
    }

    let validatedProposal;
    try {
      validatedProposal = validateMappingProposal(
        proposal,
        sourceMeta,
        targetMeta
      );
    } catch (valErr) {
      const msg =
        valErr instanceof Error ? valErr.message : "Invalid mapping proposal";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    await connectDB();

    const plan = await MappingPlanModel.create({
      sourceCollection: sourceCollection.trim(),
      targetCollection: targetCollection.trim(),
      proposal: validatedProposal,
      status: "pending",
      rejectionReason: null,
      reviewedAt: null,
    });

    logWorkflowEvent({
      event: "mapping_proposal_persisted",
      planId: plan._id.toString(),
      sourceCollection: plan.sourceCollection,
      targetCollection: plan.targetCollection,
      mappingCount: plan.proposal.mappings.length,
      status: plan.status,
    });

    return NextResponse.json(formatPlan(plan), { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
