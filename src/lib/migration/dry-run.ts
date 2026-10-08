import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { MappingPlanModel } from "@/models/MappingPlan";
import { Customer } from "@/models/Customer";
import { User } from "@/models/User";
import { inspectModel } from "@/lib/schema/inspect";
import { executeTransformation } from "@/lib/migration/transform";
import { validateTargetRecord } from "@/lib/migration/validator";
import { logWorkflowEvent } from "@/lib/logger";
import {
  DryRunResult,
  ValidTransformedRecord,
  QuarantinedRecord,
  RecordValidationError,
} from "@/types/dry-run";

export class DryRunError extends Error {
  status: number;
  constructor(message: string, status: number = 400) {
    super(message);
    this.name = "DryRunError";
    this.status = status;
  }
}

export async function executeDryRun(planId: string): Promise<DryRunResult> {
  const startTime = Date.now();

  if (!planId || !mongoose.Types.ObjectId.isValid(planId)) {
    throw new DryRunError("Invalid plan ID format", 400);
  }

  await connectDB();

  const plan = await MappingPlanModel.findById(planId).exec();

  if (!plan) {
    logWorkflowEvent({
      event: "migration_dry_run_failed",
      planId,
      error: "Mapping plan not found",
    });
    throw new DryRunError("Mapping plan not found", 404);
  }

  if (plan.status === "pending") {
    logWorkflowEvent({
      event: "migration_dry_run_failed",
      planId,
      status: plan.status,
      error: "Plan is pending approval and cannot be executed in dry run",
    });
    throw new DryRunError(
      "Plan is pending approval and cannot be executed in dry run",
      409
    );
  }

  if (plan.status === "rejected") {
    logWorkflowEvent({
      event: "migration_dry_run_failed",
      planId,
      status: plan.status,
      error: "Plan was rejected and cannot be executed in dry run",
    });
    throw new DryRunError(
      "Plan was rejected and cannot be executed in dry run",
      409
    );
  }

  if (plan.status !== "approved") {
    logWorkflowEvent({
      event: "migration_dry_run_failed",
      planId,
      status: plan.status,
      error: `Invalid plan status: ${plan.status}`,
    });
    throw new DryRunError(`Invalid plan status: ${plan.status}`, 400);
  }

  logWorkflowEvent({
    event: "migration_dry_run_started",
    planId,
    sourceCollection: plan.sourceCollection,
    targetCollection: plan.targetCollection,
  });

  const sourceDocs = await Customer.find().lean().exec();
  const targetMeta = inspectModel(User);

  const validRecords: ValidTransformedRecord[] = [];
  const quarantinedRecords: QuarantinedRecord[] = [];
  const allErrors: RecordValidationError[] = [];

  let transformationFailures = 0;
  let validationFailures = 0;

  for (const doc of sourceDocs) {
    const rawDoc = doc as unknown as Record<string, unknown>;
    const sourceId = String(rawDoc.id || rawDoc._id || "unknown");
    const transformed: Record<string, unknown> = {};
    const recordErrors: RecordValidationError[] = [];

    for (const mapping of plan.proposal.mappings) {
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
      const failedFields = Array.from(new Set(recordErrors.map((e) => e.field)));
      const categories = Array.from(new Set(recordErrors.map((e) => e.category)));

      quarantinedRecords.push({
        sourceId,
        failedFields,
        categories,
        errors: recordErrors,
      });

      allErrors.push(...recordErrors);

      if (categories.includes("transformation_error")) {
        transformationFailures += 1;
      }
      if (categories.some((c) => c !== "transformation_error")) {
        validationFailures += 1;
      }
    } else {
      validRecords.push({
        sourceId,
        transformed,
      });
    }
  }

  const totalRecords = sourceDocs.length;
  const validCount = validRecords.length;
  const invalidCount = quarantinedRecords.length;
  const durationMs = Date.now() - startTime;

  logWorkflowEvent({
    event: "migration_dry_run_completed",
    planId,
    sourceCollection: plan.sourceCollection,
    targetCollection: plan.targetCollection,
    totalRecords,
    validCount,
    invalidCount,
    durationMs,
  });

  return {
    planId,
    sourceCollection: plan.sourceCollection,
    targetCollection: plan.targetCollection,
    totalRecords,
    validRecords: validCount,
    invalidRecords: invalidCount,
    statistics: {
      totalRecords,
      validRecords: validCount,
      invalidRecords: invalidCount,
      quarantineCandidates: invalidCount,
      transformationFailures,
      validationFailures,
    },
    records: validRecords,
    quarantinedRecords,
    errors: allErrors,
  };
}
