import { NextRequest, NextResponse } from "next/server";
import { executeDryRun, DryRunError } from "@/lib/migration/dry-run";

export async function POST(req: NextRequest) {
  try {
    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body in request" },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid request: body must be a JSON object" },
        { status: 400 }
      );
    }

    const { planId } = body as Record<string, unknown>;

    if (typeof planId !== "string" || !planId.trim()) {
      return NextResponse.json(
        { error: "planId is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    const result = await executeDryRun(planId.trim());
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof DryRunError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    const message =
      error instanceof Error ? error.message : "Dry run execution failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
