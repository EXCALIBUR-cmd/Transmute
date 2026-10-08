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
  | "migration_record_quarantined"
  | "migration_record_failed"
  | "migration_execution_completed"
  | "migration_execution_failed";

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
  quarantinedCount?: number;
  failedCount?: number;
  sourceId?: string;
  targetId?: string;
  category?: string;
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
