export type FailureCategory =
  | "transformation_error"
  | "missing_required_field"
  | "type_mismatch"
  | "format_validation_error"
  | "schema_violation";

export interface RecordValidationError {
  field: string;
  message: string;
  category: FailureCategory;
}

export interface ValidTransformedRecord {
  sourceId: string;
  transformed: Record<string, unknown>;
}

export interface QuarantinedRecord {
  sourceId: string;
  failedFields: string[];
  categories: FailureCategory[];
  errors: RecordValidationError[];
}

export interface DryRunStatistics {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  quarantineCandidates: number;
  transformationFailures: number;
  validationFailures: number;
}

export interface DryRunResult {
  planId: string;
  sourceCollection: string;
  targetCollection: string;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  statistics: DryRunStatistics;
  records: ValidTransformedRecord[];
  quarantinedRecords: QuarantinedRecord[];
  errors: RecordValidationError[];
}

export interface DryRunRequest {
  planId: string;
}
