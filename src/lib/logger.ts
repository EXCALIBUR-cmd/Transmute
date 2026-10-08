export type WorkflowLogEvent =
  | "mapping_proposal_persisted"
  | "mapping_plan_approved"
  | "mapping_plan_rejected"
  | "mapping_plan_fetch_failed"
  | "migration_dry_run_started"
  | "migration_dry_run_completed"
  | "migration_dry_run_failed"
  | "migration_execution_started"
  | "migration_record_migrated"
  | "migration_record_skipped"
  | "migration_record_quarantined"
  | "migration_record_failed"
  | "migration_execution_completed"
  | "migration_execution_failed"
  | "migration_reconciliation_started"
  | "migration_reconciliation_completed"
  | "migration_reconciliation_failed"
  | "migration_rollback_started"
  | "migration_record_rolled_back"
  | "migration_record_rollback_skipped"
  | "migration_rollback_completed"
  | "migration_rollback_failed";

export interface WorkflowLogPayload {
  event: WorkflowLogEvent;
  planId?: string;
  runId?: string;
  sourceCollection?: string;
  targetCollection?: string;
  mappingCount?: number;
  status?: string;
  rejectionReason?: string | null;
  error?: string;
  totalRecords?: number;
  validCount?: number;
  invalidCount?: number;
  migratedCount?: number;
  skippedCount?: number;
  quarantinedCount?: number;
  failedCount?: number;
  rolledBackCount?: number;
  rollbackSkippedCount?: number;
  sourceId?: string;
  targetId?: string;
  category?: string;
  action?: string;
  reason?: string;
  durationMs?: number;
  timestamp?: string;
}

export function logWorkflowEvent(payload: WorkflowLogPayload): void {
  const entry = {
    ...payload,
    timestamp: payload.timestamp || new Date().toISOString(),
  };
  console.log(JSON.stringify(entry));
}
