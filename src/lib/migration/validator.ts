import { SchemaMetadata } from "@/types/schema";
import { RecordValidationError } from "@/types/dry-run";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^\+?[0-9\s\-()]{7,25}$/;

export function validateTargetRecord(
  record: Record<string, unknown>,
  targetSchema: SchemaMetadata
): RecordValidationError[] {
  const errors: RecordValidationError[] = [];
  const targetFieldMap = new Map(targetSchema.fields.map((f) => [f.name, f]));

  for (const field of targetSchema.fields) {
    const val = record[field.name];

    if (field.required) {
      if (val === undefined || val === null) {
        errors.push({
          field: field.name,
          message: `Missing required target field: "${field.name}"`,
          category: "missing_required_field",
        });
        continue;
      }
      if (typeof val === "string" && val.trim() === "") {
        errors.push({
          field: field.name,
          message: `Required target field "${field.name}" cannot be empty`,
          category: "missing_required_field",
        });
        continue;
      }
    }

    if (val !== undefined && val !== null) {
      const expectedType = field.type.toLowerCase();

      if (expectedType === "string") {
        if (typeof val !== "string") {
          errors.push({
            field: field.name,
            message: `Field "${field.name}" expected string, got ${typeof val}`,
            category: "type_mismatch",
          });
          continue;
        }

        if (field.name === "email_address") {
          if (!EMAIL_REGEX.test(val)) {
            errors.push({
              field: field.name,
              message: `Invalid email format for "${field.name}": "${val}"`,
              category: "format_validation_error",
            });
          }
        } else if (field.name === "phone_number") {
          if (!PHONE_REGEX.test(val)) {
            errors.push({
              field: field.name,
              message: `Invalid phone format for "${field.name}": "${val}"`,
              category: "format_validation_error",
            });
          }
        }
      } else if (expectedType === "number") {
        if (typeof val !== "number" || isNaN(val)) {
          errors.push({
            field: field.name,
            message: `Field "${field.name}" expected number, got ${typeof val}`,
            category: "type_mismatch",
          });
          continue;
        }

        if (field.name === "birth_year") {
          if (!Number.isInteger(val) || val < 1850 || val > 2050) {
            errors.push({
              field: field.name,
              message: `Invalid birth year value: ${val}`,
              category: "format_validation_error",
            });
          }
        }
      }
    }
  }

  for (const key of Object.keys(record)) {
    if (!targetFieldMap.has(key)) {
      errors.push({
        field: key,
        message: `Unexpected target field: "${key}"`,
        category: "schema_violation",
      });
    }
  }

  return errors;
}
