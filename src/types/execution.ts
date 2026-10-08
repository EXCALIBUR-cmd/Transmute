import { RecordValidationError } from "@/types/dry-run";

export type ExecutionStatus = "pending" | "running" | "completed" | "failed";

export type ExecutionOutcomeStatus =
  | "migrated"
  | "skipped"
  | "quarantined"
  | "failed";

export type RecordAction =
  | "created"
  | "skipped"
  | "conflict"
  | "quarantined"
  | "failed";

export type ExecutionFailureCategory =
  | "transformation_error"
  | "validation_error"
  | "target_write_error"
  | "duplicate_identity"
  | "execution_error"
  | "conflict";

export type RollbackStatus =
  | "pending"
  | "rolled_back"
  | "rollback_partial"
  | "rollback_failed";

export interface RecordExecutionOutcome {
  sourceId: string;
  status: ExecutionOutcomeStatus;
  action?: RecordAction;
  targetId?: string | null;
  category?: ExecutionFailureCategory | null;
  reason?: string | null;
  rolledBack?: boolean;
  errors?: RecordValidationError[];
}

export interface MigrationExecutionStatistics {
  totalRecords: number;
  migratedRecords: number;
  skippedRecords: number;
  quarantinedRecords: number;
  failedRecords: number;
}

export interface MigrationExecutionResult {
  runId: string;
  planId: string;
  sourceCollection: string;
  targetCollection: string;
  status: ExecutionStatus;
  totalRecords: number;
  migratedRecords: number;
  skippedRecords: number;
  quarantinedRecords: number;
  failedRecords: number;
  recordsBefore: {
    source: number;
    target: number;
  };
  recordsAfter: {
    source: number;
    target: number;
  };
  startedAt: string;
  completedAt: string | null;
  recordResults: RecordExecutionOutcome[];
  error?: string | null;
}

export interface ExecuteMigrationRequest {
  planId: string;
}
