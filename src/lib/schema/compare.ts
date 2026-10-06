import {
  FieldComparison,
  FieldMetadata,
  SchemaComparison,
  SchemaMetadata,
} from "@/types/schema";

export function compareSchemas(
  source: SchemaMetadata,
  target: SchemaMetadata
): SchemaComparison {
  const targetFieldMap = new Map<string, FieldMetadata>(
    target.fields.map((field) => [field.name, field])
  );
  const sourceFieldMap = new Map<string, FieldMetadata>(
    source.fields.map((field) => [field.name, field])
  );

  const sourceOnly: FieldMetadata[] = [];
  const targetOnly: FieldMetadata[] = [];
  const sameName: FieldComparison[] = [];
  const compatibleSameName: FieldComparison[] = [];
  const incompatibleSameName: FieldComparison[] = [];

  for (const sourceField of source.fields) {
    const targetField = targetFieldMap.get(sourceField.name);

    if (targetField) {
      const isCompatible =
        sourceField.type.toLowerCase() === targetField.type.toLowerCase();

      const comparison: FieldComparison = {
        name: sourceField.name,
        sourceType: sourceField.type,
        targetType: targetField.type,
        sourceRequired: sourceField.required,
        targetRequired: targetField.required,
        isCompatible,
      };

      sameName.push(comparison);

      if (isCompatible) {
        compatibleSameName.push(comparison);
      } else {
        incompatibleSameName.push(comparison);
      }
    } else {
      sourceOnly.push(sourceField);
    }
  }

  for (const targetField of target.fields) {
    if (!sourceFieldMap.has(targetField.name)) {
      targetOnly.push(targetField);
    }
  }

  return {
    sourceOnly,
    targetOnly,
    sameName,
    compatibleSameName,
    incompatibleSameName,
  };
}
