import { SchemaMetadata } from "@/types/schema";
import { ALLOWED_TRANSFORMATIONS } from "@/types/mapping";

export function buildProposalPrompt(
  source: SchemaMetadata,
  target: SchemaMetadata
): string {
  const sourceFieldList = source.fields
    .map((f) => `- ${f.name} (type: ${f.type}, required: ${f.required})`)
    .join("\n");

  const targetFieldList = target.fields
    .map((f) => `- ${f.name} (type: ${f.type}, required: ${f.required})`)
    .join("\n");

  return [
    "You are a schema mapping planner.",
    "Given source and target schema metadata, propose semantic mappings.",
    "",
    "You may:",
    "- map one source field to one target field",
    "- combine multiple source fields into one target field",
    "- identify deterministic transformations",
    "- identify unmapped fields",
    "- identify risks and ambiguities",
    "",
    "You must NOT:",
    "- invent source fields",
    "- invent target fields",
    "- access a database",
    "- execute transformations",
    "- execute migrations",
    "- generate executable code",
    "- make writes",
    "- assume approval",
    "",
    "Every source field and target field must come from the supplied schema metadata.",
    "Transformations must be represented as named deterministic operations, not executable code.",
    `Allowed transformations: ${ALLOWED_TRANSFORMATIONS.join(", ")}.`,
    "",
    "SOURCE SCHEMA:",
    `Collection: ${source.collection}`,
    "Fields:",
    sourceFieldList,
    "",
    "TARGET SCHEMA:",
    `Collection: ${target.collection}`,
    "Fields:",
    targetFieldList,
  ].join("\n");
}

export const mappingProposalResponseSchema = {
  type: "OBJECT",
  properties: {
    mappings: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          sourceFields: {
            type: "ARRAY",
            items: { type: "STRING" },
          },
          targetField: { type: "STRING" },
          transformation: {
            type: "STRING",
            enum: [...ALLOWED_TRANSFORMATIONS],
          },
          confidence: { type: "NUMBER" },
          rationale: { type: "STRING" },
        },
        required: [
          "sourceFields",
          "targetField",
          "transformation",
          "confidence",
          "rationale",
        ],
      },
    },
    unmappedSourceFields: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    unmappedTargetFields: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    risks: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
  },
  required: [
    "mappings",
    "unmappedSourceFields",
    "unmappedTargetFields",
    "risks",
  ],
};
