import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { MigrationRunModel } from "@/models/MigrationRun";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid run ID format" },
        { status: 400 }
      );
    }

    await connectDB();

    const run = await MigrationRunModel.findById(id).lean().exec();

    if (!run) {
      return NextResponse.json(
        { error: "Migration run not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(run, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch migration run";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
