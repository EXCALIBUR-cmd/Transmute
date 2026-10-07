import { MappingProposal } from "@/types/mapping";

export type MappingPlanStatus = "pending" | "approved" | "rejected";

export interface MappingPlan {
  id: string;
  sourceCollection: string;
  targetCollection: string;
  proposal: MappingProposal;
  status: MappingPlanStatus;
  rejectionReason?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
}

export interface CreateMappingPlanRequest {
  sourceCollection: string;
  targetCollection: string;
  proposal: MappingProposal;
}

export interface RejectMappingPlanRequest {
  reason?: string;
}
