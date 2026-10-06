import { NextResponse } from "next/server";
import { Customer } from "@/models/Customer";
import { User } from "@/models/User";
import { inspectModel } from "@/lib/schema/inspect";
import { compareSchemas } from "@/lib/schema/compare";
import { InspectionResult } from "@/types/schema";

export async function GET() {
  try {
    const source = inspectModel(Customer);
    const target = inspectModel(User);
    const comparison = compareSchemas(source, target);

    const result: InspectionResult = {
      source,
      target,
      comparison,
    };

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Schema inspection failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
