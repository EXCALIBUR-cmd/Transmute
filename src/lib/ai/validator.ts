import { SchemaMetadata } from "@/types/schema";
import {
  ALLOWED_TRANSFORMATIONS,
  FieldMapping,
  MappingProposal,
} from "@/types/mapping";

export function validateSchemaMetadata(
  meta: unknown,
  role: "source" | "target"
): SchemaMetadata {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    throw new Error(`Invalid ${role} schema: expected object`);
  }

  const record = meta as Record<string, unknown>;

  if (typeof record.collection !== "string" || !record.collection.trim()) {
    throw new Error(`Invalid ${role} schema: missing or empty collection name`);
  }

  if (!Array.isArray(record.fields)) {
    throw new Error(`Invalid ${role} schema: fields must be an array`);
  }

  const fields = record.fields.map((field, idx) => {
    if (!field || typeof field !== "object" || Array.isArray(field)) {
      throw new Error(
        `Invalid ${role} schema: field at index ${idx} must be an object`
      );
    }
    const f = field as Record<string, unknown>;
    if (typeof f.name !== "string" || !f.name.trim()) {
      throw new Error(
        `Invalid ${role} schema: field at index ${idx} missing name`
      );
    }
    if (typeof f.type !== "string" || !f.type.trim()) {
      throw new Error(
        `Invalid ${role} schema: field at index ${idx} missing type`
      );
    }
    if (typeof f.required !== "boolean") {
      throw new Error(
        `Invalid ${role} schema: field at index ${idx} missing boolean required flag`
      );
    }
    return {
      name: f.name.trim(),
      type: f.type.trim(),
      required: f.required,
    };
  });

  return {
    collection: record.collection.trim(),
    fields,
  };
}

export function validateMappingProposal(
  proposal: unknown,
  source: SchemaMetadata,
  target: SchemaMetadata
): MappingProposal {
  if (!proposal || typeof proposal !== "object" || Array.isArray(proposal)) {
    throw new Error("Invalid proposal: expected object");
  }

  const allowedProposalKeys = new Set([
    "mappings",
    "unmappedSourceFields",
    "unmappedTargetFields",
    "risks",
  ]);

  for (const key of Object.keys(proposal)) {
    if (!allowedProposalKeys.has(key)) {
      throw new Error(`Unexpected property in proposal: ${key}`);
    }
  }

  const p = proposal as Record<string, unknown>;

  if (!Array.isArray(p.mappings)) {
    throw new Error("Invalid proposal: mappings must be an array");
  }
  if (!Array.isArray(p.unmappedSourceFields)) {
    throw new Error("Invalid proposal: unmappedSourceFields must be an array");
  }
  if (!Array.isArray(p.unmappedTargetFields)) {
    throw new Error("Invalid proposal: unmappedTargetFields must be an array");
  }
  if (!Array.isArray(p.risks)) {
    throw new Error("Invalid proposal: risks must be an array");
  }

  const validSourceNames = new Set(source.fields.map((f) => f.name));
  const validTargetNames = new Set(target.fields.map((f) => f.name));
  const allowedTransformations = new Set<string>(ALLOWED_TRANSFORMATIONS);

  const allowedMappingKeys = new Set([
    "sourceFields",
    "targetField",
    "transformation",
    "confidence",
    "rationale",
  ]);

  const validatedMappings: FieldMapping[] = p.mappings.map((item, idx) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`Invalid mapping at index ${idx}: expected object`);
    }

    const m = item as Record<string, unknown>;

    for (const key of Object.keys(m)) {
      if (!allowedMappingKeys.has(key)) {
        throw new Error(`Unexpected property in mapping at index ${idx}: ${key}`);
      }
    }

    if (!Array.isArray(m.sourceFields) || m.sourceFields.length === 0) {
      throw new Error(
        `Invalid mapping at index ${idx}: sourceFields must be a non-empty array`
      );
    }

    const sourceFields: string[] = [];
    for (const sf of m.sourceFields) {
      if (typeof sf !== "string" || !sf.trim()) {
        throw new Error(
          `Invalid mapping at index ${idx}: sourceFields must contain non-empty strings`
        );
      }
      const trimmed = sf.trim();
      if (!validSourceNames.has(trimmed)) {
        throw new Error(
          `Invalid mapping at index ${idx}: unknown source field "${trimmed}"`
        );
      }
      sourceFields.push(trimmed);
    }

    if (typeof m.targetField !== "string" || !m.targetField.trim()) {
      throw new Error(
        `Invalid mapping at index ${idx}: targetField must be a non-empty string`
      );
    }
    const targetField = m.targetField.trim();
    if (!validTargetNames.has(targetField)) {
      throw new Error(
        `Invalid mapping at index ${idx}: unknown target field "${targetField}"`
      );
    }

    if (typeof m.transformation !== "string" || !m.transformation.trim()) {
      throw new Error(
        `Invalid mapping at index ${idx}: transformation must be a non-empty string`
      );
    }
    const transformation = m.transformation.trim();
    if (!allowedTransformations.has(transformation)) {
      throw new Error(
        `Invalid mapping at index ${idx}: unsupported transformation "${transformation}"`
      );
    }

    if (
      typeof m.confidence !== "number" ||
      Number.isNaN(m.confidence) ||
      m.confidence < 0 ||
      m.confidence > 1
    ) {
      throw new Error(
        `Invalid mapping at index ${idx}: confidence must be a number between 0 and 1, got ${m.confidence}`
      );
    }

    if (typeof m.rationale !== "string" || !m.rationale.trim()) {
      throw new Error(
        `Invalid mapping at index ${idx}: rationale must be a non-empty string`
      );
    }

    return {
      sourceFields,
      targetField,
      transformation,
      confidence: m.confidence,
      rationale: m.rationale.trim(),
    };
  });

  const unmappedSourceFields: string[] = [];
  for (const sf of p.unmappedSourceFields) {
    if (typeof sf !== "string" || !sf.trim()) {
      throw new Error(
        "Invalid unmappedSourceFields: elements must be non-empty strings"
      );
    }
    const trimmed = sf.trim();
    if (!validSourceNames.has(trimmed)) {
      throw new Error(`Unknown unmapped source field "${trimmed}"`);
    }
    unmappedSourceFields.push(trimmed);
  }

  const unmappedTargetFields: string[] = [];
  for (const tf of p.unmappedTargetFields) {
    if (typeof tf !== "string" || !tf.trim()) {
      throw new Error(
        "Invalid unmappedTargetFields: elements must be non-empty strings"
      );
    }
    const trimmed = tf.trim();
    if (!validTargetNames.has(trimmed)) {
      throw new Error(`Unknown unmapped target field "${trimmed}"`);
    }
    unmappedTargetFields.push(trimmed);
  }

  const risks: string[] = [];
  for (const r of p.risks) {
    if (typeof r !== "string" || !r.trim()) {
      throw new Error("Invalid risks: elements must be non-empty strings");
    }
    risks.push(r.trim());
  }

  return {
    mappings: validatedMappings,
    unmappedSourceFields,
    unmappedTargetFields,
    risks,
  };
}
