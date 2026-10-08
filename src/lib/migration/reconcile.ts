import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { MigrationRunModel } from "@/models/MigrationRun";
import { MappingPlanModel } from "@/models/MappingPlan";
import { Customer } from "@/models/Customer";
import { User } from "@/models/User";
import { inspectModel } from "@/lib/schema/inspect";
import { executeTransformation } from "@/lib/migration/transform";
import { getTargetRecordMismatches } from "@/lib/migration/compare";
import { logWorkflowEvent } from "@/lib/logger";
import {
  ReconciliationResult,
  ReconciliationStatus,
  ContentMismatch,
} from "@/types/reconciliation";

export class ReconciliationError extends Error {
  status: number;
  constructor(message: string, status: number = 400) {
    super(message);
    this.name = "ReconciliationError";
    this.status = status;
  }
}

export async function reconcileMigrationRun(
  runId: string
): Promise<ReconciliationResult> {
  if (!runId || !mongoose.Types.ObjectId.isValid(runId)) {
    throw new ReconciliationError("Invalid run ID format", 400);
  }

  await connectDB();

  const run = await MigrationRunModel.findById(runId).exec();
  if (!run) {
    logWorkflowEvent({
      event: "migration_reconciliation_failed",
      runId,
      error: "Migration run not found",
    });
    throw new ReconciliationError("Migration run not found", 404);
  }

  if (run.status !== "completed") {
    logWorkflowEvent({
      event: "migration_reconciliation_failed",
      runId,
      planId: run.planId.toString(),
      status: run.status,
      error: "Run is not completed and cannot be reconciled",
    });
    throw new ReconciliationError(
      "Run is not completed and cannot be reconciled",
      409
    );
  }

  const plan = await MappingPlanModel.findById(run.planId).exec();
  if (!plan) {
    logWorkflowEvent({
      event: "migration_reconciliation_failed",
      runId,
      error: "Associated mapping plan not found",
    });
    throw new ReconciliationError("Associated mapping plan not found", 404);
  }

  logWorkflowEvent({
    event: "migration_reconciliation_started",
    runId,
    planId: plan._id.toString(),
    sourceCollection: run.sourceCollection,
    targetCollection: run.targetCollection,
  });

  const allTargetDocs = await User.find().lean().exec();
  const targetDocMap = new Map<string, Record<string, unknown>>(
    allTargetDocs.map((d) => [d.user_id, d as unknown as Record<string, unknown>])
  );

  const allSourceDocs = await Customer.find().lean().exec();
  const sourceDocMap = new Map<string, Record<string, unknown>>(
    allSourceDocs.map((s) => [
      String(s.id || s._id),
      s as unknown as Record<string, unknown>,
    ])
  );

  const targetMeta = inspectModel(User);

  const expectedMigratedOutcomes = run.recordResults.filter(
    (r) =>
      r.status === "migrated" ||
      r.action === "created" ||
      r.action === "skipped"
  );

  const quarantinedOutcomes = run.recordResults.filter(
    (r) => r.status === "quarantined" || r.action === "quarantined"
  );

  const quarantinedRecordsPresent: string[] = [];
  for (const q of quarantinedOutcomes) {
    const checkId = q.targetId || q.sourceId;
    if (targetDocMap.has(checkId)) {
      quarantinedRecordsPresent.push(checkId);
    }
  }

  const expectedTargetIds = new Set<string>();
  let matchedRecords = 0;
  const missingRecords: string[] = [];
  const contentMismatches: ContentMismatch[] = [];

  for (const outcome of expectedMigratedOutcomes) {
    const targetId = outcome.targetId || outcome.sourceId;
    expectedTargetIds.add(targetId);

    const existingTarget = targetDocMap.get(targetId);
    if (!existingTarget) {
      missingRecords.push(targetId);
      continue;
    }

    const sourceDoc = sourceDocMap.get(outcome.sourceId);
    if (sourceDoc) {
      const candidate: Record<string, unknown> = {};
      for (const mapping of plan.proposal.mappings) {
        const sourceValues = mapping.sourceFields.map((f) => sourceDoc[f]);
        try {
          const val = executeTransformation(mapping.transformation, sourceValues);
          if (val !== undefined) {
            candidate[mapping.targetField] = val;
          }
        } catch {
        }
      }

      const mismatches = getTargetRecordMismatches(
        targetId,
        existingTarget,
        candidate,
        targetMeta
      );

      if (mismatches.length > 0) {
        contentMismatches.push(...mismatches);
      } else {
        matchedRecords += 1;
      }
    } else {
      matchedRecords += 1;
    }
  }

  const unexpectedRecords: string[] = [];
  for (const doc of allTargetDocs) {
    if (!expectedTargetIds.has(doc.user_id)) {
      unexpectedRecords.push(doc.user_id);
    }
  }

  const isReconciled =
    missingRecords.length === 0 &&
    contentMismatches.length === 0 &&
    quarantinedRecordsPresent.length === 0;

  const reconciliationStatus: ReconciliationStatus = isReconciled
    ? "reconciled"
    : "failed";

  const result: ReconciliationResult = {
    runId,
    planId: plan._id.toString(),
    status: reconciliationStatus,
    expectedRecords: expectedTargetIds.size,
    actualRecords: allTargetDocs.length,
    matchedRecords,
    missingRecords,
    unexpectedRecords,
    contentMismatches,
    quarantinedRecordsPresent,
    reconciledAt: new Date().toISOString(),
  };

  run.reconciliationResult = result;
  run.markModified("reconciliationResult");
  await run.save();

  logWorkflowEvent({
    event: isReconciled
      ? "migration_reconciliation_completed"
      : "migration_reconciliation_failed",
    runId,
    planId: plan._id.toString(),
    status: reconciliationStatus,
    totalRecords: expectedTargetIds.size,
    validCount: matchedRecords,
    invalidCount: missingRecords.length + contentMismatches.length,
  });

  return result;
}
