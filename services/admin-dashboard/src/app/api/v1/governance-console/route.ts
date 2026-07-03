import { NextResponse } from "next/server";
import { validateAdminAuth } from "@/lib/support/auth";

export async function GET(req: Request) {
  const authError = validateAdminAuth(req);
  if (authError) return authError;

  return NextResponse.json({
    proposals: [
      { id: "prop-1", title: "Enable USI L2 Bridge", status: "active" }
    ],
    treasury_governance: "multisig-required"
  });
}
