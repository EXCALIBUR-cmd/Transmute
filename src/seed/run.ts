
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

  const sourceCount = await Customer.countDocuments();
  console.log(`Source customers in DB: ${sourceCount}`);

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
