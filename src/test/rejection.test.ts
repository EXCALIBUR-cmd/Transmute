import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { POST as createPlanHandler } from "@/app/api/mapping/plans/route";
import { POST as rejectPlanHandler } from "@/app/api/mapping/plans/[id]/reject/route";
import { POST as approvePlanHandler } from "@/app/api/mapping/plans/[id]/approve/route";
import { GET as getPlanHandler } from "@/app/api/mapping/plans/[id]/route";

async function apiRequest(path: string, options?: { method?: string; body?: string }) {
  try {
    return await fetch(`http://localhost:3000${path}`, {
      method: options?.method || "GET",
      headers: { "Content-Type": "application/json" },
      body: options?.body,
    });
  } catch {
    const req = new NextRequest(`http://localhost:3000${path}`, {
      method: options?.method || "GET",
      headers: { "Content-Type": "application/json" },
      body: options?.body,
    });

    if (path === "/api/mapping/plans" && options?.method === "POST") {
      return await createPlanHandler(req);
    }

    const matchReject = path.match(/^\/api\/mapping\/plans\/([^/]+)\/reject$/);
    if (matchReject) {
      return await rejectPlanHandler(req, {
        params: Promise.resolve({ id: matchReject[1] }),
      });
    }

    const matchApprove = path.match(/^\/api\/mapping\/plans\/([^/]+)\/approve$/);
    if (matchApprove) {
      return await approvePlanHandler(req, {
        params: Promise.resolve({ id: matchApprove[1] }),
      });
    }

    const matchGet = path.match(/^\/api\/mapping\/plans\/([^/]+)$/);
    if (matchGet) {
      return await getPlanHandler(req, {
        params: Promise.resolve({ id: matchGet[1] }),
      });
    }

    throw new Error(`Unhandled route: ${path}`);
  }
}

async function run() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not set in environment");
  }

  await mongoose.connect(mongoUri, { bufferCommands: false });
  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("Database connection unavailable");
  }

  let planId: string | null = null;

  try {
    console.log("=== MONGODB STATE BEFORE WORKFLOW ===");
    const beforeSourceCount = await db.collection("source_customers").countDocuments();
    const beforeTargetCount = await db.collection("target_users").countDocuments();

    console.log(`source_customers count: ${beforeSourceCount}`);
    console.log(`target_users count: ${beforeTargetCount}`);

    if (beforeSourceCount !== 50 || beforeTargetCount !== 43) {
      throw new Error(
        `Pre-condition invariant violation: expected source=50, target=43; got source=${beforeSourceCount}, target=${beforeTargetCount}`
      );
    }
    console.log("Confirm before counts: PASS (source_customers = 50, target_users = 43)\n");

    console.log("=== STEP 1: CREATE FRESH MAPPING PLAN IN PENDING STATE ===");
    const proposalPayload = {
      sourceCollection: "source_customers",
      targetCollection: "target_users",
      proposal: {
        mappings: [
          {
            sourceFields: ["id"],
            targetField: "user_id",
            transformation: "identity",
            confidence: 1.0,
            rationale: "Direct key mapping",
          },
          {
            sourceFields: ["first_name", "last_name"],
            targetField: "full_name",
            transformation: "concat_with_space",
            confidence: 0.95,
            rationale: "Combine first and last name",
          },
          {
            sourceFields: ["email"],
            targetField: "email_address",
            transformation: "identity",
            confidence: 0.9,
            rationale: "Email address mapping",
          },
        ],
        unmappedSourceFields: ["phone", "date_of_birth"],
        unmappedTargetFields: ["phone_number", "birth_year"],
        risks: ["Date format parsing assumptions may lose precision"],
      },
    };

    const createRes = await apiRequest("/api/mapping/plans", {
      method: "POST",
      body: JSON.stringify(proposalPayload),
    });

    const createBody = await createRes.json();
    console.log(`HTTP ${createRes.status} ${createRes.statusText}`);
    console.log("Created Plan ID:", createBody.id);
    console.log("Initial Status:", createBody.status);
    console.log("Created At:", createBody.createdAt);

    planId = createBody.id;
    if (!planId || createBody.status !== "pending") {
      throw new Error("Failed to create pending plan");
    }

    console.log("\n=== STEP 2 & 3: REJECT PLAN VIA ACTUAL POST REJECTION ENDPOINT ===");
    const rejectRes = await apiRequest(`/api/mapping/plans/${planId}/reject`, {
      method: "POST",
      body: JSON.stringify({
        reason: "Manual review rejected: Unmapped date_of_birth requires human intervention",
      }),
    });

    const rejectBody = await rejectRes.json();
    console.log(`HTTP ${rejectRes.status} ${rejectRes.statusText}`);
    console.log("Rejected Status:", rejectBody.status);
    console.log("Rejection Reason:", rejectBody.rejectionReason);
    console.log("Reviewed At:", rejectBody.reviewedAt);

    if (rejectRes.status !== 200 || rejectBody.status !== "rejected") {
      throw new Error(`Expected HTTP 200 and status 'rejected', got ${rejectRes.status}`);
    }

    console.log("\n=== STEP 4: FETCH THE PLAN AND VERIFY PERSISTED REJECTED STATE ===");
    const fetchRes = await apiRequest(`/api/mapping/plans/${planId}`);
    const fetchBody = await fetchRes.json();
    console.log(`HTTP ${fetchRes.status} ${fetchRes.statusText}`);
    console.log("Persisted Status:", fetchBody.status);
    console.log("Persisted Rejection Reason:", fetchBody.rejectionReason);
    console.log("Persisted Reviewed At:", fetchBody.reviewedAt);

    if (fetchRes.status !== 200 || fetchBody.status !== "rejected") {
      throw new Error("Persisted state is not rejected");
    }

    console.log("\n=== STEP 5 & 6: ATTEMPT TO APPROVE THE REJECTED PLAN ===");
    const approveRes = await apiRequest(`/api/mapping/plans/${planId}/approve`, {
      method: "POST",
    });

    const approveBody = await approveRes.json();
    console.log(`HTTP ${approveRes.status} ${approveRes.statusText}`);
    console.log("Error Payload:", JSON.stringify(approveBody));

    if (approveRes.status !== 409) {
      throw new Error(`Expected HTTP 409 Conflict, got ${approveRes.status}`);
    }

    console.log("\n=== STEP 7: FETCH PLAN AGAIN AND VERIFY IT REMAINS REJECTED ===");
    const fetchAgainRes = await apiRequest(`/api/mapping/plans/${planId}`);
    const fetchAgainBody = await fetchAgainRes.json();
    console.log(`HTTP ${fetchAgainRes.status} ${fetchAgainRes.statusText}`);
    console.log("Final Persisted Status:", fetchAgainBody.status);

    if (fetchAgainRes.status !== 200 || fetchAgainBody.status !== "rejected") {
      throw new Error("Plan state was corrupted after rejected approval attempt");
    }

    console.log("\n=== MONGODB STATE AFTER WORKFLOW ===");
    const afterSourceCount = await db.collection("source_customers").countDocuments();
    const afterTargetCount = await db.collection("target_users").countDocuments();

    console.log(`source_customers count: ${afterSourceCount}`);
    console.log(`target_users count: ${afterTargetCount}`);

    if (afterSourceCount !== 50 || afterTargetCount !== 43) {
      throw new Error(
        `Post-condition invariant violation: expected source=50, target=43; got source=${afterSourceCount}, target=${afterTargetCount}`
      );
    }
    console.log("Confirm after counts: PASS (source_customers = 50, target_users = 43)\n");

    console.log("=== REJECTION RUNTIME WORKFLOW VERIFIED SUCCESSFULLY ===");
  } finally {
    if (planId && db) {
      await db.collection("mapping_plans").deleteOne({
        _id: new mongoose.Types.ObjectId(planId),
      });
    }
    await mongoose.disconnect();
  }
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
