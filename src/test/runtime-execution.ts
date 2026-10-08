import mongoose from "mongoose";

async function runRuntimeVerification() {
  const baseUrl = "http://localhost:3000";
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not set in environment");
  }

  await mongoose.connect(mongoUri, { bufferCommands: false });
  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("Database connection unavailable");
  }

  console.log("==================================================");
  console.log("LOOP 6: RUNTIME MIGRATION EXECUTION VERIFICATION");
  console.log("==================================================");

  const beforeSourceCount = await db.collection("source_customers").countDocuments();
  const beforeTargetCount = await db.collection("target_users").countDocuments();

  console.log("\n[1] PRE-EXECUTION MONGODB COUNTS");
  console.log(`source_customers count: ${beforeSourceCount}`);
  console.log(`target_users count:     ${beforeTargetCount}`);

  if (beforeSourceCount !== 50 || beforeTargetCount !== 0) {
    throw new Error(
      `Pre-execution invariant violation: expected source=50, target=0; got source=${beforeSourceCount}, target=${beforeTargetCount}`
    );
  }

  const standardProposal = {
    mappings: [
      {
        sourceFields: ["id"],
        targetField: "user_id",
        transformation: "identity",
        confidence: 1.0,
        rationale: "Direct unique identifier mapping",
      },
      {
        sourceFields: ["first_name", "last_name"],
        targetField: "full_name",
        transformation: "concat_with_space",
        confidence: 0.95,
        rationale: "Combine first and last name with single space",
      },
      {
        sourceFields: ["email"],
        targetField: "email_address",
        transformation: "identity",
        confidence: 0.9,
        rationale: "Direct email field mapping",
      },
      {
        sourceFields: ["phone"],
        targetField: "phone_number",
        transformation: "identity",
        confidence: 0.9,
        rationale: "Direct phone number mapping",
      },
      {
        sourceFields: ["date_of_birth"],
        targetField: "birth_year",
        transformation: "extract_year",
        confidence: 0.85,
        rationale: "Extract 4-digit calendar year from date of birth",
      },
    ],
    unmappedSourceFields: [],
    unmappedTargetFields: [],
    risks: ["Loss of calendar month/day precision", "String phone formats vary"],
  };

  console.log("\n[2] STATE BOUNDARY: REJECT INVALID & PENDING PLANS");

  const invalidIdRes = await fetch(`${baseUrl}/api/migration/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId: "not-a-valid-id" }),
  });
  console.log(`Invalid plan ID: HTTP ${invalidIdRes.status} (expected 400)`);
  if (invalidIdRes.status !== 400) {
    throw new Error(`Expected HTTP 400 for invalid ID, got ${invalidIdRes.status}`);
  }

  const missingIdRes = await fetch(`${baseUrl}/api/migration/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId: new mongoose.Types.ObjectId().toString() }),
  });
  console.log(`Non-existent plan ID: HTTP ${missingIdRes.status} (expected 404)`);
  if (missingIdRes.status !== 404) {
    throw new Error(`Expected HTTP 404 for missing ID, got ${missingIdRes.status}`);
  }

  const pendingPlanDoc = await db.collection("mapping_plans").insertOne({
    sourceCollection: "source_customers",
    targetCollection: "target_users",
    proposal: standardProposal,
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const pendingPlanId = pendingPlanDoc.insertedId.toString();

  const pendingRes = await fetch(`${baseUrl}/api/migration/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId: pendingPlanId }),
  });
  const pendingPayload = await pendingRes.json();
  console.log(`Pending plan execution: HTTP ${pendingRes.status} (expected 409)`);
  console.log(`Response error: "${pendingPayload.error}"`);
  if (pendingRes.status !== 409) {
    throw new Error(`Expected HTTP 409 for pending plan, got ${pendingRes.status}`);
  }
  await db.collection("mapping_plans").deleteOne({ _id: pendingPlanDoc.insertedId });

  const rejectedPlanDoc = await db.collection("mapping_plans").insertOne({
    sourceCollection: "source_customers",
    targetCollection: "target_users",
    proposal: standardProposal,
    status: "rejected",
    rejectionReason: "Test rejection invariant",
    reviewedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const rejectedPlanId = rejectedPlanDoc.insertedId.toString();

  const rejectedRes = await fetch(`${baseUrl}/api/migration/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId: rejectedPlanId }),
  });
  const rejectedPayload = await rejectedRes.json();
  console.log(`Rejected plan execution: HTTP ${rejectedRes.status} (expected 409)`);
  console.log(`Response error: "${rejectedPayload.error}"`);
  if (rejectedRes.status !== 409) {
    throw new Error(`Expected HTTP 409 for rejected plan, got ${rejectedRes.status}`);
  }
  await db.collection("mapping_plans").deleteOne({ _id: rejectedPlanDoc.insertedId });

  console.log("\n[3] LIVE EXECUTION OF APPROVED MAPPING PLAN");

  const approvedPlanDoc = await db.collection("mapping_plans").insertOne({
    sourceCollection: "source_customers",
    targetCollection: "target_users",
    proposal: standardProposal,
    status: "approved",
    reviewedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const approvedPlanId = approvedPlanDoc.insertedId.toString();
  console.log(`Approved Plan ID: ${approvedPlanId}`);

  const execRes = await fetch(`${baseUrl}/api/migration/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId: approvedPlanId }),
  });

  if (execRes.status !== 200) {
    const errorText = await execRes.text();
    throw new Error(`Execution request failed with HTTP ${execRes.status}: ${errorText}`);
  }

  const execResult = await execRes.json();

  console.log("\n==================================================");
  console.log("MIGRATION EXECUTION SUMMARY");
  console.log("==================================================");
  console.log(`Run ID:              ${execResult.runId}`);
  console.log(`Plan ID:             ${execResult.planId}`);
  console.log(`Status:              ${execResult.status}`);
  console.log(`Total Records:       ${execResult.totalRecords}`);
  console.log(`Migrated Records:    ${execResult.migratedRecords}`);
  console.log(`Quarantined Records: ${execResult.quarantinedRecords}`);
  console.log(`Failed Records:      ${execResult.failedRecords}`);
  console.log(`Target Before:       ${execResult.recordsBefore.target}`);
  console.log(`Target After:        ${execResult.recordsAfter.target}`);
  console.log(`Started At:          ${execResult.startedAt}`);
  console.log(`Completed At:        ${execResult.completedAt}`);

  if (execResult.totalRecords !== 50) {
    throw new Error(`Expected totalRecords=50, got ${execResult.totalRecords}`);
  }
  if (execResult.migratedRecords !== 43) {
    throw new Error(`Expected migratedRecords=43, got ${execResult.migratedRecords}`);
  }
  if (execResult.quarantinedRecords !== 7) {
    throw new Error(`Expected quarantinedRecords=7, got ${execResult.quarantinedRecords}`);
  }
  if (execResult.failedRecords !== 0) {
    throw new Error(`Expected failedRecords=0, got ${execResult.failedRecords}`);
  }

  console.log("\n[4] POST-EXECUTION DATABASE INSPECTION");
  const afterSourceCount = await db.collection("source_customers").countDocuments();
  const afterTargetCount = await db.collection("target_users").countDocuments();
  console.log(`source_customers count: ${afterSourceCount} (expected 50)`);
  console.log(`target_users count:     ${afterTargetCount} (expected 43)`);

  if (afterSourceCount !== 50) {
    throw new Error(`Source mutation detected! Expected 50, got ${afterSourceCount}`);
  }
  if (afterTargetCount !== 43) {
    throw new Error(`Target count mismatch! Expected 43, got ${afterTargetCount}`);
  }

  console.log("\n[5] REPRESENTATIVE MIGRATED DOCUMENTS IN TARGET_USERS");
  const cust001 = await db.collection("target_users").findOne({ user_id: "CUST-001" });
  console.log("CUST-001:", JSON.stringify(cust001));
  if (!cust001 || cust001.full_name !== "Aarav Sharma" || cust001.birth_year !== 1990) {
    throw new Error("CUST-001 target data incorrect");
  }

  const cust002 = await db.collection("target_users").findOne({ user_id: "CUST-002" });
  console.log("CUST-002:", JSON.stringify(cust002));
  if (!cust002 || cust002.full_name !== "Mei Chen" || cust002.birth_year !== 1985) {
    throw new Error("CUST-002 target data incorrect");
  }

  const cust040 = await db.collection("target_users").findOne({ user_id: "CUST-040" });
  console.log("CUST-040:", JSON.stringify(cust040));
  if (!cust040 || cust040.full_name !== "Soren Berg" || cust040.birth_year !== 1989) {
    throw new Error("CUST-040 target data incorrect");
  }

  console.log("\n[6] QUARANTINED RECORDS ABSENT FROM TARGET_USERS");
  const quarantinedIds = ["CUST-041", "CUST-042", "CUST-043", "CUST-044", "CUST-048", "CUST-049", "CUST-050"];
  for (const qId of quarantinedIds) {
    const doc = await db.collection("target_users").findOne({ user_id: qId });
    if (doc !== null) {
      throw new Error(`Quarantined record ${qId} was unexpectedly written to target_users!`);
    }
    console.log(`Confirmed absent: ${qId}`);
  }

  console.log("\n[7] PERSISTED MIGRATION RUN DOCUMENT");
  const runDoc = await db.collection("migration_runs").findOne({
    _id: new mongoose.Types.ObjectId(execResult.runId),
  });
  if (!runDoc) {
    throw new Error("MigrationRun document not found in migration_runs collection");
  }
  console.log(`Persisted Run ID:         ${runDoc._id}`);
  console.log(`Plan ID:                  ${runDoc.planId}`);
  console.log(`Status:                   ${runDoc.status}`);
  console.log(`Total Records:            ${runDoc.totalRecords}`);
  console.log(`Migrated Records:         ${runDoc.migratedRecords}`);
  console.log(`Quarantined Records:      ${runDoc.quarantinedRecords}`);
  console.log(`Failed Records:           ${runDoc.failedRecords}`);
  console.log(`Record Outcomes Count:    ${runDoc.recordResults.length}`);

  console.log("\n==================================================");
  console.log("RUNTIME EXECUTION VERIFICATION COMPLETE & PASSED ✅");
  console.log("==================================================");

  await mongoose.disconnect();
}

runRuntimeVerification().catch((err) => {
  console.error("\n❌ Runtime verification failed:", err);
  process.exit(1);
});
