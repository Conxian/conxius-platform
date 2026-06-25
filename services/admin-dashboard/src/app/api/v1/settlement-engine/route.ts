import { NextResponse } from "next/server";
import { BitVMBridge } from "@/lib/support/bitvm";

export async function POST(req: Request) {
  // Settlement-Engine BFF (Phase 7 USI Orchestration)
  const authHeader = req.headers.get("X-Admin-API-Key");
  if (!authHeader || authHeader !== process.env.ADMIN_DASHBOARD_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { intent, action, proof, proofId } = await req.json();

    if (action === "orchestrate") {
      // Logic for multi-step cross-chain orchestration
      return NextResponse.json({
        success: true,
        job_id: "job-usi-123",
        steps: [
          { type: "bitcoin-lock", status: "pending" },
          { type: "stacks-mint", status: "pending" }
        ]
      });
    }

    if (action === "verify-floor") {
      if (!proof || !proofId) {
        return NextResponse.json({ error: "Missing proof or proofId" }, { status: 400 });
      }
      const result = await BitVMBridge.verifyFloor(proof, proofId);
      return NextResponse.json(result);
    }

    if (action === "get-floor-state") {
      if (!proofId) {
        return NextResponse.json({ error: "Missing proofId" }, { status: 400 });
      }
      const state = BitVMBridge.getState(proofId);
      if (!state) {
        return NextResponse.json({ error: "State not found" }, { status: 404 });
      }
      return NextResponse.json(state);
    }

    return NextResponse.json({ success: true, status: "idle" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
