import { NextRequest, NextResponse } from "next/server";
import {
  reconcileMigrationRun,
  ReconciliationError,
} from "@/lib/migration/reconcile";

export async function POST(
  _req: NextRequest,
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

    const result = await reconcileMigrationRun(id.trim());
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ReconciliationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    const message =
      error instanceof Error ? error.message : "Reconciliation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
