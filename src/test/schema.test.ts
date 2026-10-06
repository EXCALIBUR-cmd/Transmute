import assert from "node:assert/strict";
import { Customer } from "@/models/Customer";
import { User } from "@/models/User";
import { inspectModel } from "@/lib/schema/inspect";
import { compareSchemas } from "@/lib/schema/compare";
import { SchemaMetadata } from "@/types/schema";

function runTests(): void {
  const sourceMeta = inspectModel(Customer);
  assert.equal(sourceMeta.collection, "source_customers");
  assert.equal(sourceMeta.fields.length, 6);

  const expectedSourceFields = [
    { name: "id", type: "string", required: true },
    { name: "first_name", type: "string", required: true },
    { name: "last_name", type: "string", required: true },
    { name: "email", type: "string", required: false },
    { name: "phone", type: "string", required: false },
    { name: "date_of_birth", type: "string", required: false },
  ];

  for (const expected of expectedSourceFields) {
    const actual = sourceMeta.fields.find((f) => f.name === expected.name);
    assert.ok(actual, `Expected source field ${expected.name} not found`);
    assert.equal(actual.type, expected.type);
    assert.equal(actual.required, expected.required);
  }

  const targetMeta = inspectModel(User);
  assert.equal(targetMeta.collection, "target_users");
  assert.equal(targetMeta.fields.length, 5);

  const expectedTargetFields = [
    { name: "user_id", type: "string", required: true },
    { name: "full_name", type: "string", required: true },
    { name: "email_address", type: "string", required: false },
    { name: "phone_number", type: "string", required: false },
    { name: "birth_year", type: "number", required: false },
  ];

  for (const expected of expectedTargetFields) {
    const actual = targetMeta.fields.find((f) => f.name === expected.name);
    assert.ok(actual, `Expected target field ${expected.name} not found`);
    assert.equal(actual.type, expected.type);
    assert.equal(actual.required, expected.required);
  }

  const actualComparison = compareSchemas(sourceMeta, targetMeta);
  assert.equal(actualComparison.sourceOnly.length, 6);
  assert.equal(actualComparison.targetOnly.length, 5);
  assert.equal(actualComparison.sameName.length, 0);
  assert.equal(actualComparison.compatibleSameName.length, 0);
  assert.equal(actualComparison.incompatibleSameName.length, 0);

  const sourceOnlyNames = actualComparison.sourceOnly.map((f) => f.name);
  assert.deepEqual(
    sourceOnlyNames,
    ["id", "first_name", "last_name", "email", "phone", "date_of_birth"]
  );

  const targetOnlyNames = actualComparison.targetOnly.map((f) => f.name);
  assert.deepEqual(
    targetOnlyNames,
    ["user_id", "full_name", "email_address", "phone_number", "birth_year"]
  );

  const syntheticSource: SchemaMetadata = {
    collection: "test_source",
    fields: [
      { name: "code", type: "string", required: true },
      { name: "val", type: "string", required: false },
      { name: "only_a", type: "string", required: true },
    ],
  };

  const syntheticTarget: SchemaMetadata = {
    collection: "test_target",
    fields: [
      { name: "code", type: "string", required: false },
      { name: "val", type: "number", required: true },
      { name: "only_b", type: "boolean", required: false },
    ],
  };

  const syntheticComparison = compareSchemas(syntheticSource, syntheticTarget);

  assert.equal(syntheticComparison.sourceOnly.length, 1);
  assert.equal(syntheticComparison.sourceOnly[0].name, "only_a");

  assert.equal(syntheticComparison.targetOnly.length, 1);
  assert.equal(syntheticComparison.targetOnly[0].name, "only_b");

  assert.equal(syntheticComparison.sameName.length, 2);
  assert.equal(syntheticComparison.compatibleSameName.length, 1);
  assert.equal(syntheticComparison.compatibleSameName[0].name, "code");
  assert.equal(syntheticComparison.compatibleSameName[0].isCompatible, true);

  assert.equal(syntheticComparison.incompatibleSameName.length, 1);
  assert.equal(syntheticComparison.incompatibleSameName[0].name, "val");
  assert.equal(syntheticComparison.incompatibleSameName[0].isCompatible, false);

  const emptySource: SchemaMetadata = {
    collection: "empty_source",
    fields: [],
  };

  const emptyTarget: SchemaMetadata = {
    collection: "empty_target",
    fields: [],
  };

  const emptyComparison = compareSchemas(emptySource, emptyTarget);
  assert.equal(emptyComparison.sourceOnly.length, 0);
  assert.equal(emptyComparison.targetOnly.length, 0);
  assert.equal(emptyComparison.sameName.length, 0);
  assert.equal(emptyComparison.compatibleSameName.length, 0);
  assert.equal(emptyComparison.incompatibleSameName.length, 0);

  const repeatedA = JSON.stringify(compareSchemas(sourceMeta, targetMeta));
  const repeatedB = JSON.stringify(compareSchemas(sourceMeta, targetMeta));
  assert.equal(repeatedA, repeatedB);

  console.log("ALL_SCHEMA_TESTS_PASSED");
}

runTests();
