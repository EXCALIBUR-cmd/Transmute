/**
 * Seed script — populates the source_customers collection with
 * deterministic synthetic data.
 *
 * Idempotent: uses upsert on the stable `id` field so running
 * this script multiple times never creates duplicates.
 *
 * Does NOT touch the target_users collection.
 *
 * Usage:
 *   npx tsx src/seed/run.ts
 *
 * Requires MONGODB_URI to be set (reads .env.local automatically
 * via dotenv if available, or from the environment).
 */

import "dotenv/config";
import mongoose from "mongoose";
import { Customer } from "../models/Customer";
import { seedCustomers } from "./data";

async function seed(): Promise<void> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error(
      "ERROR: MONGODB_URI environment variable is not defined.\n" +
        "Create a .env.local file with:\n" +
        "  MONGODB_URI=mongodb://localhost:27017/migration-workbench"
    );
    process.exit(1);
  }

  console.log("Connecting to MongoDB…");
  await mongoose.connect(uri, { bufferCommands: false });
  console.log("Connected.");

  console.log(`Upserting ${seedCustomers.length} source customer records…`);

  const bulkOps = seedCustomers.map((customer) => ({
    updateOne: {
      filter: { id: customer.id },
      update: { $set: customer },
      upsert: true,
    },
  }));

  const result = await Customer.bulkWrite(bulkOps);

  console.log(
    `Seed complete. Matched: ${result.matchedCount}, Upserted: ${result.upsertedCount}, Modified: ${result.modifiedCount}`
  );

  // Verification: count source records
  const sourceCount = await Customer.countDocuments();
  console.log(`Source customers in DB: ${sourceCount}`);

  // Verification: confirm target collection is untouched
  // We access the raw collection to avoid importing the User model
  // (which would be fine, but keeps the seed cleanly scoped).
  const db = mongoose.connection.db;
  if (db) {
    const targetCollections = await db
      .listCollections({ name: "target_users" })
      .toArray();

    if (targetCollections.length === 0) {
      console.log("Target users collection: does not exist (expected).");
    } else {
      const targetCount = await db
        .collection("target_users")
        .countDocuments();
      console.log(`Target users in DB: ${targetCount}`);
      if (targetCount > 0) {
        console.warn(
          "WARNING: Target users collection is not empty. " +
            "The seed should not have populated it."
        );
      }
    }
  }

  await mongoose.disconnect();
  console.log("Disconnected. Seed operation finished.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
