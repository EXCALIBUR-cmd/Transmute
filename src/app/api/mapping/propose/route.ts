import { NextRequest, NextResponse } from "next/server";
import { generateMappingProposal } from "@/lib/ai/proposal-service";
import { SchemaMetadata } from "@/types/schema";

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

    const { source, target } = body as Record<string, unknown>;

    if (!source || !target) {
      return NextResponse.json(
        { error: "Invalid request: source and target schemas are required" },
        { status: 400 }
      );
    }

    try {
      const proposal = await generateMappingProposal(
        source as SchemaMetadata,
        target as SchemaMetadata
      );
      return NextResponse.json(proposal);
    } catch (serviceErr) {
      const message =
        serviceErr instanceof Error
          ? serviceErr.message
          : "Proposal generation failed";

      let status = 500;

      if (
        message.includes("Invalid source schema") ||
        message.includes("Invalid target schema")
      ) {
        status = 400;
      } else if (message.includes("GEMINI_API_KEY is not configured")) {
        status = 503;
      } else if (
        message.includes("Unknown") ||
        message.includes("Invalid proposal") ||
        message.includes("Malformed JSON") ||
        message.includes("Gemini proposal generation failed")
      ) {
        status = 502;
      }

      return NextResponse.json({ error: message }, { status });
    }
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
