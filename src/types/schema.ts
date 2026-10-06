export interface FieldMetadata {
  name: string;
  type: string;
  required: boolean;
}

export interface SchemaMetadata {
  collection: string;
  fields: FieldMetadata[];
}

export interface FieldComparison {
  name: string;
  sourceType: string;
  targetType: string;
  sourceRequired: boolean;
  targetRequired: boolean;
  isCompatible: boolean;
}

export interface SchemaComparison {
  sourceOnly: FieldMetadata[];
  targetOnly: FieldMetadata[];
  sameName: FieldComparison[];
  compatibleSameName: FieldComparison[];
  incompatibleSameName: FieldComparison[];
}

export interface InspectionResult {
  source: SchemaMetadata;
  target: SchemaMetadata;
  comparison: SchemaComparison;
}
