import mongoose, { Schema, Document, Model } from "mongoose";
import { MappingProposal } from "@/types/mapping";
import { MappingPlanStatus } from "@/types/plan";

export interface IMappingPlan extends Document {
  sourceCollection: string;
  targetCollection: string;
  proposal: MappingProposal;
  status: MappingPlanStatus;
  rejectionReason?: string | null;
  reviewedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const FieldMappingSubSchema = new Schema(
  {
    sourceFields: {
      type: [String],
      required: true,
      validate: {
        validator: (v: string[]) => Array.isArray(v) && v.length > 0,
        message: "sourceFields must not be empty",
      },
    },
    targetField: {
      type: String,
      required: true,
      trim: true,
    },
    transformation: {
      type: String,
      required: true,
      trim: true,
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    rationale: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const MappingProposalSubSchema = new Schema(
  {
    mappings: {
      type: [FieldMappingSubSchema],
      required: true,
    },
    unmappedSourceFields: {
      type: [String],
      default: [],
    },
    unmappedTargetFields: {
      type: [String],
      default: [],
    },
    risks: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const MappingPlanSchema = new Schema<IMappingPlan>(
  {
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
    proposal: {
      type: MappingProposalSubSchema,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      required: true,
      index: true,
    },
    rejectionReason: {
      type: String,
      default: null,
      trim: true,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: "mapping_plans",
    timestamps: true,
    versionKey: false,
  }
);

export const MappingPlanModel: Model<IMappingPlan> =
  mongoose.models.MappingPlan ||
  mongoose.model<IMappingPlan>("MappingPlan", MappingPlanSchema);
