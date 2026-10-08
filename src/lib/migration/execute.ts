import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { MappingPlanModel } from "@/models/MappingPlan";
import { MigrationRunModel } from "@/models/MigrationRun";
import { Customer } from "@/models/Customer";
import { User } from "@/models/User";
import { inspectModel } from "@/lib/schema/inspect";
import { executeTransformation } from "@/lib/migration/transform";
import { validateTargetRecord } from "@/lib/migration/validator";
import { logWorkflowEvent } from "@/lib/logger";
import { FieldMapping } from "@/types/mapping";
import { SchemaMetadata } from "@/types/schema";
import { RecordValidationError } from "@/types/dry-run";
import {
  ExecutionStatus,
  ExecutionFailureCategory,
  RecordExecutionOutcome,
  MigrationExecutionResult,
} from "@/types/execution";

export class ExecutionError extends Error {
  status: number;
  constructor(message: string, status: number = 400) {
    super(message);
    this.name = "ExecutionError";
    this.status = status;
  }
}

export interface ProcessedRecordResult {
  sourceId: string;
  targetId: string | null;
  outcome: RecordExecutionOutcome;
  transformedRecord: Record<string, unknown> | null;
}

export function processRecordExecution(
  rawDoc: Record<string, unknown>,
  mappings: FieldMapping[],
  targetMeta: SchemaMetadata,
  seenTargetIds: Set<string>
): ProcessedRecordResult {
  const sourceId = String(rawDoc.id || rawDoc._id || "unknown");
  const transformed: Record<string, unknown> = {};
  const recordErrors: RecordValidationError[] = [];

  for (const mapping of mappings) {
    const sourceValues = mapping.sourceFields.map((f) => rawDoc[f]);
    try {
      const val = executeTransformation(mapping.transformation, sourceValues);
      if (val !== undefined) {
        transformed[mapping.targetField] = val;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      recordErrors.push({
        field: mapping.targetField,
        message: `Transformation "${mapping.transformation}" failed: ${message}`,
        category: "transformation_error",
      });
    }
  }

  const validationErrors = validateTargetRecord(transformed, targetMeta);
  recordErrors.push(...validationErrors);

  if (recordErrors.length > 0) {
    const hasTransformError = recordErrors.some(
      (e) => e.category === "transformation_error"
    );
    const failureCategory: ExecutionFailureCategory = hasTransformError
      ? "transformation_error"
      : "validation_error";

    return {
      sourceId,
      targetId: null,
      outcome: {
        sourceId,
        status: "quarantined",
        targetId: null,
        category: failureCategory,
        errors: recordErrors,
      },
      transformedRecord: null,
    };
  }

  const targetId = String(transformed.user_id || "");

  if (!targetId) {
    return {
      sourceId,
      targetId: null,
      outcome: {
        sourceId,
        status: "failed",
        targetId: null,
        category: "validation_error",
        errors: [
          {
            field: "user_id",
            message: "Missing target identity field user_id",
            category: "missing_required_field",
          },
        ],
      },
      transformedRecord: null,
    };
  }

  if (seenTargetIds.has(targetId)) {
    return {
      sourceId,
      targetId,
      outcome: {
        sourceId,
        status: "failed",
        targetId,
        category: "duplicate_identity",
        errors: [
          {
            field: "user_id",
            message: `Duplicate target identity collision for user_id "${targetId}"`,
            category: "schema_violation",
          },
        ],
      },
      transformedRecord: null,
    };
  }

  seenTargetIds.add(targetId);

  return {
    sourceId,
    targetId,
    outcome: {
      sourceId,
      status: "migrated",
      targetId,
      category: null,
      errors: [],
    },
    transformedRecord: transformed,
  };
}

export async function executeMigration(
  planId: string
): Promise<MigrationExecutionResult> {
  if (!planId || !mongoose.Types.ObjectId.isValid(planId)) {
    throw new ExecutionError("Invalid plan ID format", 400);
  }

  await connectDB();

  const plan = await MappingPlanModel.findById(planId).exec();

  if (!plan) {
    logWorkflowEvent({
      event: "migration_execution_failed",
      planId,
      error: "Mapping plan not found",
    });
    throw new ExecutionError("Mapping plan not found", 404);
  }

  if (plan.status === "pending") {
    logWorkflowEvent({
      event: "migration_execution_failed",
      planId,
      status: plan.status,
      error: "Plan is pending approval and cannot be executed",
    });
    throw new ExecutionError(
      "Plan is pending approval and cannot be executed",
      409
    );
  }

  if (plan.status === "rejected") {
    logWorkflowEvent({
      event: "migration_execution_failed",
      planId,
      status: plan.status,
      error: "Plan was rejected and cannot be executed",
    });
    throw new ExecutionError(
      "Plan was rejected and cannot be executed",
      409
    );
  }

  if (plan.status !== "approved") {
    logWorkflowEvent({
      event: "migration_execution_failed",
      planId,
      status: plan.status,
      error: `Invalid plan status: ${plan.status}`,
    });
    throw new ExecutionError(`Invalid plan status: ${plan.status}`, 400);
  }

  const sourceBefore = await Customer.countDocuments();
  const targetBefore = await User.countDocuments();

  const run = await MigrationRunModel.create({
    planId: plan._id,
    sourceCollection: plan.sourceCollection,
    targetCollection: plan.targetCollection,
    status: "running",
    startedAt: new Date(),
  });

  logWorkflowEvent({
    event: "migration_execution_started",
    planId,
    runId: run._id.toString(),
    sourceCollection: plan.sourceCollection,
    targetCollection: plan.targetCollection,
    totalRecords: sourceBefore,
  });

  try {
    const sourceDocs = await Customer.find().lean().exec();
    const targetMeta = inspectModel(User);

    const recordResults: RecordExecutionOutcome[] = [];
    const seenTargetIds = new Set<string>();

    let migratedCount = 0;
    let quarantinedCount = 0;
    let failedCount = 0;

    for (const doc of sourceDocs) {
      const rawDoc = doc as unknown as Record<string, unknown>;
      const processed = processRecordExecution(
        rawDoc,
        plan.proposal.mappings,
        targetMeta,
        seenTargetIds
      );

      if (processed.outcome.status === "quarantined") {
        quarantinedCount += 1;
        recordResults.push(processed.outcome);
        logWorkflowEvent({
          event: "migration_record_quarantined",
          planId,
          runId: run._id.toString(),
          sourceId: processed.sourceId,
          category: processed.outcome.category || undefined,
        });
        continue;
      }

      if (processed.outcome.status === "failed") {
        failedCount += 1;
        recordResults.push(processed.outcome);
        logWorkflowEvent({
          event: "migration_record_failed",
          planId,
          runId: run._id.toString(),
          sourceId: processed.sourceId,
          targetId: processed.targetId || undefined,
          category: processed.outcome.category || undefined,
        });
        continue;
      }

      if (processed.outcome.status === "migrated" && processed.transformedRecord) {
        try {
          await User.updateOne(
            { user_id: processed.targetId },
            { $set: processed.transformedRecord },
            { upsert: true }
          );

          migratedCount += 1;
          recordResults.push(processed.outcome);

          logWorkflowEvent({
            event: "migration_record_migrated",
            planId,
            runId: run._id.toString(),
            sourceId: processed.sourceId,
            targetId: processed.targetId || undefined,
          });
        } catch (writeErr: unknown) {
          const isDup = (writeErr as { code?: number })?.code === 11000;
          const writeCategory: ExecutionFailureCategory = isDup
            ? "duplicate_identity"
            : "target_write_error";
          const writeMsg =
            writeErr instanceof Error ? writeErr.message : String(writeErr);

          failedCount += 1;
          recordResults.push({
            sourceId: processed.sourceId,
            status: "failed",
            targetId: processed.targetId,
            category: writeCategory,
            errors: [
              {
                field: "user_id",
                message: writeMsg,
                category: "schema_violation",
              },
            ],
          });

          logWorkflowEvent({
            event: "migration_record_failed",
            planId,
            runId: run._id.toString(),
            sourceId: processed.sourceId,
            targetId: processed.targetId || undefined,
            category: writeCategory,
          });
        }
      }
    }

    const targetAfter = await User.countDocuments();
    const sourceAfter = await Customer.countDocuments();
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - run.startedAt.getTime();

    const finalStatus: ExecutionStatus =
      failedCount > 0 && migratedCount === 0 ? "failed" : "completed";

    run.status = finalStatus;
    run.totalRecords = sourceDocs.length;
    run.migratedRecords = migratedCount;
    run.quarantinedRecords = quarantinedCount;
    run.failedRecords = failedCount;
    run.completedAt = completedAt;
    run.recordResults = recordResults;
    await run.save();

    logWorkflowEvent({
      event: "migration_execution_completed",
      planId,
      runId: run._id.toString(),
      sourceCollection: plan.sourceCollection,
      targetCollection: plan.targetCollection,
      totalRecords: sourceDocs.length,
      migratedCount,
      quarantinedCount,
      failedCount,
      durationMs,
    });

    return {
      runId: run._id.toString(),
      planId,
      sourceCollection: plan.sourceCollection,
      targetCollection: plan.targetCollection,
      status: finalStatus,
      totalRecords: sourceDocs.length,
      migratedRecords: migratedCount,
      quarantinedRecords: quarantinedCount,
      failedRecords: failedCount,
      recordsBefore: {
        source: sourceBefore,
        target: targetBefore,
      },
      recordsAfter: {
        source: sourceAfter,
        target: targetAfter,
      },
      startedAt: run.startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      recordResults,
      error: null,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    run.status = "failed";
    run.error = errorMsg;
    run.completedAt = new Date();
    await run.save().catch(() => {});

    logWorkflowEvent({
      event: "migration_execution_failed",
      planId,
      runId: run._id.toString(),
      error: errorMsg,
    });

    if (err instanceof ExecutionError) {
      throw err;
    }
    throw new ExecutionError(errorMsg, 500);
  }
}
