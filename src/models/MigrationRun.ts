import mongoose, { Schema, Document, Model } from "mongoose";
import {
  ExecutionStatus,
  RecordExecutionOutcome,
} from "@/types/execution";

export interface IMigrationRun extends Document {
  planId: mongoose.Types.ObjectId;
  sourceCollection: string;
  targetCollection: string;
  status: ExecutionStatus;
  totalRecords: number;
  migratedRecords: number;
  quarantinedRecords: number;
  failedRecords: number;
  startedAt: Date;
  completedAt?: Date | null;
  recordResults: RecordExecutionOutcome[];
  error?: string | null;
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
      enum: ["migrated", "quarantined", "failed"],
      required: true,
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
        null,
      ],
      default: null,
    },
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
