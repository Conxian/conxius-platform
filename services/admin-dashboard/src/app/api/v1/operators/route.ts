import { NextResponse } from "next/server";
import { getOperatorRegistry } from "@/lib/sidl/stateStore";

export async function GET() {
  const registry = getOperatorRegistry();
  const operators = Object.values(registry.operators)
    .filter((entry) => entry.status === "active")
    .sort((a, b) => a.recognizedAtIso.localeCompare(b.recognizedAtIso));

  return NextResponse.json({
    operators,
    updatedAtIso: registry.updatedAtIso,
  });
}
