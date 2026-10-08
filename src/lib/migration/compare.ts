import { SchemaMetadata } from "@/types/schema";
import { ContentMismatch } from "@/types/reconciliation";

export function getTargetRecordMismatches(
  targetId: string,
  existingRecord: Record<string, unknown>,
  candidateRecord: Record<string, unknown>,
  targetMeta: SchemaMetadata
): ContentMismatch[] {
  const mismatches: ContentMismatch[] = [];

  for (const field of targetMeta.fields) {
    const fieldName = field.name;
    const existingVal = existingRecord[fieldName] ?? null;
    const candidateVal = candidateRecord[fieldName] ?? null;

    if (existingVal !== candidateVal) {
      mismatches.push({
        targetId,
        field: fieldName,
        expected: candidateVal,
        actual: existingVal,
      });
    }
  }

  return mismatches;
}

export function areTargetRecordsIdentical(
  existingRecord: Record<string, unknown>,
  candidateRecord: Record<string, unknown>,
  targetMeta: SchemaMetadata
): boolean {
  for (const field of targetMeta.fields) {
    const fieldName = field.name;
    const existingVal = existingRecord[fieldName] ?? null;
    const candidateVal = candidateRecord[fieldName] ?? null;

    if (existingVal !== candidateVal) {
      return false;
    }
  }

  return true;
}
