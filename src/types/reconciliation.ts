export type ReconciliationStatus = "reconciled" | "failed" | "pending";

export interface ContentMismatch {
  targetId: string;
  field: string;
  expected: unknown;
  actual: unknown;
}

export interface ReconciliationResult {
  runId: string;
  planId: string;
  status: ReconciliationStatus;
  expectedRecords: number;
  actualRecords: number;
  matchedRecords: number;
  missingRecords: string[];
  unexpectedRecords: string[];
  contentMismatches: ContentMismatch[];
  quarantinedRecordsPresent: string[];
  reconciledAt: string;
}
