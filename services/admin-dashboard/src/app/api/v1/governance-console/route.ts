import { NextResponse } from "next/server";

export async function GET(req: Request) {
  // Governance-Console BFF (Phase 7 Protocol Control)
  const authHeader = req.headers.get("X-Admin-API-Key");
  if (!authHeader || authHeader !== process.env.ADMIN_DASHBOARD_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    proposals: [
      { id: "prop-1", title: "Enable USI L2 Bridge", status: "active" }
    ],
    treasury_governance: "multisig-required"
  });
}
