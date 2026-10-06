import { Model, Schema } from "mongoose";
import { FieldMetadata, SchemaMetadata } from "@/types/schema";

export function inspectSchema(schema: Schema, collection: string): SchemaMetadata {
  const fields: FieldMetadata[] = [];

  for (const [name, path] of Object.entries(schema.paths)) {
    if (name === "_id" || name === "__v") {
      continue;
    }

    const type = path.instance ? path.instance.toLowerCase() : "unknown";
    const required = Boolean(path.isRequired);

    fields.push({
      name,
      type,
      required,
    });
  }

  return {
    collection,
    fields,
  };
}

export function inspectModel<T>(model: Model<T>): SchemaMetadata {
  const collection =
    model.collection?.name ||
    model.schema.get("collection") ||
    model.modelName;

  return inspectSchema(model.schema, collection);
}
