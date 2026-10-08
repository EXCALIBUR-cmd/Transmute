import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { MigrationRunModel } from "@/models/MigrationRun";
import { User } from "@/models/User";
import { logWorkflowEvent } from "@/lib/logger";
import { RollbackResult, RollbackRequest } from "@/types/rollback";
import { RollbackStatus } from "@/types/execution";

export class RollbackError extends Error {
  status: number;
  constructor(message: string, status: number = 400) {
    super(message);
    this.name = "RollbackError";
    this.status = status;
  }
}

export async function rollbackMigrationRun(
  runId: string,
  options?: RollbackRequest
): Promise<RollbackResult> {
  if (!runId || !mongoose.Types.ObjectId.isValid(runId)) {
    throw new RollbackError("Invalid run ID format", 400);
  }

  await connectDB();

  const run = await MigrationRunModel.findById(runId).exec();
  if (!run) {
    logWorkflowEvent({
      event: "migration_rollback_failed",
      runId,
      error: "Migration run not found",
    });
    throw new RollbackError("Migration run not found", 404);
  }

  if (run.status !== "completed") {
    logWorkflowEvent({
      event: "migration_rollback_failed",
      runId,
      planId: run.planId.toString(),
      status: run.status,
      error: "Only completed migration runs can be rolled back",
    });
    throw new RollbackError(
      "Only completed migration runs can be rolled back",
      409
    );
  }

  const targetCountBefore = await User.countDocuments();

  if (run.rollbackStatus === "rolled_back") {
    logWorkflowEvent({
      event: "migration_rollback_completed",
      runId,
      planId: run.planId.toString(),
      status: "rolled_back",
      rolledBackCount: 0,
      rollbackSkippedCount: run.rollbackSkippedCount || 0,
    });

    return {
      runId,
      planId: run.planId.toString(),
      status: "rolled_back",
      rolledBackCount: 0,
      rollbackSkippedCount: run.rollbackSkippedCount || 0,
      targetCountBefore,
      targetCountAfter: targetCountBefore,
      startedAt: run.rollbackStartedAt?.toISOString() || new Date().toISOString(),
      completedAt: run.rollbackCompletedAt?.toISOString() || new Date().toISOString(),
      failures: [],
      message: "Migration run was already rolled back",
    };
  }

  const createdCandidates = run.recordResults.filter(
    (r) => r.action === "created"
  );

  if (createdCandidates.length === 0) {
    const hasSkipped = run.recordResults.some((r) => r.action === "skipped");
    const errorMessage = hasSkipped
      ? "No target records were created by this run; rollback cannot delete existing records"
      : "Run lacks verified ownership metadata and cannot be safely rolled back";

    logWorkflowEvent({
      event: "migration_rollback_failed",
      runId,
      planId: run.planId.toString(),
      error: errorMessage,
    });
    throw new RollbackError(errorMessage, 409);
  }

  const startedAt = new Date();
  run.rollbackStartedAt = startedAt;
  run.rollbackStatus = "pending";
  if (options?.reason) {
    run.rollbackReason = options.reason;
  }
  await run.save();

  logWorkflowEvent({
    event: "migration_rollback_started",
    runId,
    planId: run.planId.toString(),
    totalRecords: createdCandidates.length,
  });

  let rolledBackCount = 0;
  let rollbackSkippedCount = 0;
  const failures: string[] = [];

  for (const outcome of createdCandidates) {
    const targetId = outcome.targetId;
    if (!targetId) {
      continue;
    }

    if (outcome.rolledBack) {
      rollbackSkippedCount += 1;
      continue;
    }

    const existingDoc = await User.findOne({ user_id: targetId }).lean().exec();
    if (!existingDoc) {
      rollbackSkippedCount += 1;
      logWorkflowEvent({
        event: "migration_record_rollback_skipped",
        runId,
        targetId,
        reason: "target_not_found",
      });
      continue;
    }

    const laterRuns = await MigrationRunModel.find({
      _id: { $ne: run._id },
      createdAt: { $gt: run.createdAt },
      status: "completed",
      "recordResults.targetId": targetId,
      "recordResults.action": "created",
    }).lean();

    if (laterRuns.length > 0) {
      rollbackSkippedCount += 1;
      failures.push(`Target identity "${targetId}" was modified by a later migration run`);
      logWorkflowEvent({
        event: "migration_record_rollback_skipped",
        runId,
        targetId,
        reason: "superseded_by_later_run",
      });
      continue;
    }

    try {
      await User.deleteOne({ user_id: targetId });
      rolledBackCount += 1;
      outcome.rolledBack = true;

      logWorkflowEvent({
        event: "migration_record_rolled_back",
        runId,
        targetId,
      });
    } catch (delErr: unknown) {
      rollbackSkippedCount += 1;
      const msg = delErr instanceof Error ? delErr.message : String(delErr);
      failures.push(`Failed to delete target "${targetId}": ${msg}`);
    }
  }

  const completedAt = new Date();
  const targetCountAfter = await User.countDocuments();
  const finalStatus: RollbackStatus =
    failures.length > 0 ? "rollback_partial" : "rolled_back";

  run.rollbackStatus = finalStatus;
  run.rollbackCompletedAt = completedAt;
  run.rolledBackCount = rolledBackCount;
  run.rollbackSkippedCount = rollbackSkippedCount;
  run.rollbackFailures = failures;
  run.markModified("recordResults");
  await run.save();

  logWorkflowEvent({
    event: "migration_rollback_completed",
    runId,
    planId: run.planId.toString(),
    status: finalStatus,
    rolledBackCount,
    rollbackSkippedCount,
    durationMs: completedAt.getTime() - startedAt.getTime(),
  });

  return {
    runId,
    planId: run.planId.toString(),
    status: finalStatus,
    rolledBackCount,
    rollbackSkippedCount,
    targetCountBefore,
    targetCountAfter,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    failures,
  };
}
