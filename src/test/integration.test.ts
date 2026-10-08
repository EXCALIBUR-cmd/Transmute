import assert from "node:assert/strict";
import "dotenv/config";
import mongoose from "mongoose";
import { Customer } from "@/models/Customer";
import { GET } from "@/app/api/schema/inspect/route";

async function runIntegration(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set.");
  }

  await mongoose.connect(uri, { bufferCommands: false });

  const initialSourceCount = await Customer.countDocuments();
  assert.equal(initialSourceCount, 50, "Initial source count must be 50");

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Database connection not ready");
  }

  const collections = await db.listCollections({ name: "target_users" }).toArray();
  const initialTargetCount =
    collections.length > 0
      ? await db.collection("target_users").countDocuments()
      : 0;
  assert.equal(initialTargetCount, 43, "Initial target count must be 43");

  const response1 = await GET();
  assert.equal(response1.status, 200, "API must return 200");
  const data1 = await response1.json();

  const response2 = await GET();
  assert.equal(response2.status, 200, "Repeated API call must return 200");
  const data2 = await response2.json();

  assert.equal(
    JSON.stringify(data1),
    JSON.stringify(data2),
    "Repeated inspection must be deterministic"
  );

  assert.equal(data1.source.collection, "source_customers");
  assert.equal(data1.source.fields.length, 6);
  assert.equal(data1.target.collection, "target_users");
  assert.equal(data1.target.fields.length, 5);

  assert.equal(data1.comparison.sourceOnly.length, 6);
  assert.equal(data1.comparison.targetOnly.length, 5);
  assert.equal(data1.comparison.sameName.length, 0);
  assert.equal(data1.comparison.compatibleSameName.length, 0);
  assert.equal(data1.comparison.incompatibleSameName.length, 0);

  const finalSourceCount = await Customer.countDocuments();
  assert.equal(finalSourceCount, 50, "Source count must remain 50 after inspection");

  const finalTargetCollections = await db
    .listCollections({ name: "target_users" })
    .toArray();
  const finalTargetCount =
    finalTargetCollections.length > 0
      ? await db.collection("target_users").countDocuments()
      : 0;
  assert.equal(finalTargetCount, 43, "Target count must remain 43 after inspection");

  await mongoose.disconnect();
  console.log("INTEGRATION_TEST_PASSED");
}

runIntegration().catch((err) => {
  console.error("Integration test failed:", err);
  process.exit(1);
});
