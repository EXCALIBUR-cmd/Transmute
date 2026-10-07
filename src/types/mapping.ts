import { SchemaMetadata } from "@/types/schema";

export const ALLOWED_TRANSFORMATIONS = [
  "identity",
  "concat_with_space",
  "extract_year",
  "trim",
  "lowercase",
  "uppercase",
  "to_string",
  "to_number",
  "format_date",
] as const;

export type TransformationName = (typeof ALLOWED_TRANSFORMATIONS)[number];

export interface FieldMapping {
  sourceFields: string[];
  targetField: string;
  transformation: string;
  confidence: number;
  rationale: string;
}

export interface MappingProposal {
  mappings: FieldMapping[];
  unmappedSourceFields: string[];
  unmappedTargetFields: string[];
  risks: string[];
}

export interface ProposeMappingRequest {
  source: SchemaMetadata;
  target: SchemaMetadata;
}
