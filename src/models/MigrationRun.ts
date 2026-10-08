import mongoose, { Schema, Document, Model } from "mongoose";
import {
  ExecutionStatus,
  RecordExecutionOutcome,
  RollbackStatus,
} from "@/types/execution";

export interface IMigrationRun extends Document {
  planId: mongoose.Types.ObjectId;
  sourceCollection: string;
  targetCollection: string;
  status: ExecutionStatus;
  totalRecords: number;
  migratedRecords: number;
  skippedRecords: number;
  quarantinedRecords: number;
  failedRecords: number;
  startedAt: Date;
  completedAt?: Date | null;
  recordResults: RecordExecutionOutcome[];
  error?: string | null;
  rollbackStatus?: RollbackStatus | null;
  rollbackStartedAt?: Date | null;
  rollbackCompletedAt?: Date | null;
  rolledBackCount?: number;
  rollbackSkippedCount?: number;
  rollbackFailures?: string[];
  rollbackReason?: string | null;
  reconciliationResult?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

const ValidationErrorSubSchema = new Schema(
  {
    field: { type: String, required: true },
    message: { type: String, required: true },
    category: { type: String, required: true },
  },
  { _id: false }
);

const RecordExecutionOutcomeSubSchema = new Schema(
  {
    sourceId: { type: String, required: true },
    status: {
      type: String,
      enum: ["migrated", "skipped", "quarantined", "failed"],
      required: true,
    },
    action: {
      type: String,
      enum: ["created", "skipped", "conflict", "quarantined", "failed"],
      default: null,
    },
    targetId: { type: String, default: null },
    category: {
      type: String,
      enum: [
        "transformation_error",
        "validation_error",
        "target_write_error",
        "duplicate_identity",
        "execution_error",
        "conflict",
        null,
      ],
      default: null,
    },
    reason: { type: String, default: null },
    rolledBack: { type: Boolean, default: false },
    errors: {
      type: [ValidationErrorSubSchema],
      default: [],
    },
  },
  { _id: false, suppressReservedKeysWarning: true }
);

const MigrationRunSchema = new Schema<IMigrationRun>(
  {
    planId: {
      type: Schema.Types.ObjectId,
      ref: "MappingPlan",
      required: true,
      index: true,
    },
    sourceCollection: {
      type: String,
      required: true,
      trim: true,
    },
    targetCollection: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "running", "completed", "failed"],
      default: "pending",
      required: true,
      index: true,
    },
    totalRecords: {
      type: Number,
      default: 0,
    },
    migratedRecords: {
      type: Number,
      default: 0,
    },
    skippedRecords: {
      type: Number,
      default: 0,
    },
    quarantinedRecords: {
      type: Number,
      default: 0,
    },
    failedRecords: {
      type: Number,
      default: 0,
    },
    startedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    recordResults: {
      type: [RecordExecutionOutcomeSubSchema],
      default: [],
    },
    error: {
      type: String,
      default: null,
    },
    rollbackStatus: {
      type: String,
      enum: ["pending", "rolled_back", "rollback_partial", "rollback_failed", null],
      default: null,
      index: true,
    },
    rollbackStartedAt: {
      type: Date,
      default: null,
    },
    rollbackCompletedAt: {
      type: Date,
      default: null,
    },
    rolledBackCount: {
      type: Number,
      default: 0,
    },
    rollbackSkippedCount: {
      type: Number,
      default: 0,
    },
    rollbackFailures: {
      type: [String],
      default: [],
    },
    rollbackReason: {
      type: String,
      default: null,
    },
    reconciliationResult: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    collection: "migration_runs",
    timestamps: true,
    versionKey: false,
  }
);

export const MigrationRunModel: Model<IMigrationRun> =
  mongoose.models.MigrationRun ||
  mongoose.model<IMigrationRun>("MigrationRun", MigrationRunSchema);
