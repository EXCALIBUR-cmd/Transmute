export type WorkflowLogEvent =
  | "mapping_proposal_persisted"
  | "mapping_plan_approved"
  | "mapping_plan_rejected"
  | "mapping_plan_fetch_failed";

export interface WorkflowLogPayload {
  event: WorkflowLogEvent;
  planId?: string;
  sourceCollection?: string;
  targetCollection?: string;
  mappingCount?: number;
  status?: string;
  rejectionReason?: string | null;
  error?: string;
  timestamp?: string;
}

export function logWorkflowEvent(payload: WorkflowLogPayload): void {
  const entry = {
    ...payload,
    timestamp: payload.timestamp || new Date().toISOString(),
  };
  console.log(JSON.stringify(entry));
}
