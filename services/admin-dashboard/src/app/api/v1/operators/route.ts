import { validateAdminAuth } from "@/lib/support/auth";
import { NextResponse } from "next/server";
import { getOperatorRegistry } from "@/lib/sidl/stateStore";

export async function GET(req: Request) {
  const authError = validateAdminAuth(req);
  if (authError) return authError;
  const registry = getOperatorRegistry();
  const operators = Object.values(registry.operators)
    .filter((entry) => entry.status === "active")
    .sort((a, b) => a.recognizedAtIso.localeCompare(b.recognizedAtIso));

  return NextResponse.json({
    operators,
    updatedAtIso: registry.updatedAtIso,
  });
}
