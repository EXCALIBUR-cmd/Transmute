import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { MigrationRunModel } from "@/models/MigrationRun";

export async function GET() {
  try {
    await connectDB();
    const runs = await MigrationRunModel.find()
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return NextResponse.json({ runs }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch migration runs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
