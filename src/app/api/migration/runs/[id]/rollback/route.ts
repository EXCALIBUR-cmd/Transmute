import { NextRequest, NextResponse } from "next/server";
import {
  rollbackMigrationRun,
  RollbackError,
} from "@/lib/migration/rollback";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Invalid run ID parameter" },
        { status: 400 }
      );
    }

    let body: Record<string, unknown> = {};
    try {
      const parsed = await req.json();
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        body = parsed as Record<string, unknown>;
      }
    } catch {
    }

    const reason = typeof body.reason === "string" ? body.reason : undefined;

    const result = await rollbackMigrationRun(id.trim(), { reason });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof RollbackError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    const message =
      error instanceof Error ? error.message : "Rollback failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
