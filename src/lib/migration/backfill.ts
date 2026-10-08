import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { MigrationRunModel, IMigrationRun } from "@/models/MigrationRun";
import { User } from "@/models/User";

export async function backfillLegacyRunOwnership(
  runId: string = "6ac742e5264bca96e009f5fb"
): Promise<{ success: boolean; backfilledCount: number; runId: string }> {
  if (!mongoose.Types.ObjectId.isValid(runId)) {
    throw new Error(`Invalid run ID format: ${runId}`);
  }

  await connectDB();

  const run = await MigrationRunModel.findById(runId).exec();
  if (!run) {
    throw new Error(`Migration run ${runId} not found`);
  }

  if (run.status !== "completed") {
    throw new Error(`Migration run ${runId} is not completed`);
  }

  const migratedOutcomes = run.recordResults.filter((r) => r.status === "migrated");
  if (migratedOutcomes.length !== 43) {
    throw new Error(
      `Expected 43 migrated outcomes, found ${migratedOutcomes.length}`
    );
  }

  for (const outcome of migratedOutcomes) {
    if (!outcome.targetId) {
      throw new Error(`Migrated outcome ${outcome.sourceId} lacks targetId`);
    }
    const userDoc = await User.findOne({ user_id: outcome.targetId }).lean().exec();
    if (!userDoc) {
      throw new Error(`Target user ${outcome.targetId} not found in database`);
    }
  }

  for (const outcome of run.recordResults) {
    if (outcome.status === "migrated") {
      outcome.action = "created";
    } else if (outcome.status === "quarantined") {
      outcome.action = "quarantined";
    } else if (outcome.status === "failed") {
      outcome.action = "failed";
    }
  }

  run.skippedRecords = 0;
  run.markModified("recordResults");
  await run.save();

  return {
    success: true,
    backfilledCount: migratedOutcomes.length,
    runId,
  };
}
