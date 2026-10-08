import { RollbackStatus } from "@/types/execution";

export interface RollbackResult {
  runId: string;
  planId: string;
  status: RollbackStatus;
  rolledBackCount: number;
  rollbackSkippedCount: number;
  targetCountBefore: number;
  targetCountAfter: number;
  startedAt: string;
  completedAt: string | null;
  failures: string[];
  message?: string;
}

export interface RollbackRequest {
  reason?: string;
}
