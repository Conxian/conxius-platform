import { NextResponse } from "next/server";
import { BitVMBridge } from "@/lib/support/bitvm";

export async function POST(req: Request) {
  // Settlement-Engine BFF (Phase 7 USI Orchestration)
  const authHeader = req.headers.get("X-Admin-API-Key");
  if (!authHeader || authHeader !== process.env.ADMIN_DASHBOARD_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { action, proof, proofId, verifierId, signature } = await req.json();

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

    // G-11: Multi-Party Aggregation Actions
    if (action === "submit-signature") {
      if (!proofId || !verifierId || !signature) {
        return NextResponse.json({ error: "Missing required fields for signature submission" }, { status: 400 });
      }
      const agg = await BitVMBridge.submitSignature(proofId, verifierId, signature);
      if (!agg) {
        return NextResponse.json({ error: "Aggregation not found for proof" }, { status: 404 });
      }
      return NextResponse.json(agg);
    }

    if (action === "get-aggregation") {
      if (!proofId) {
        return NextResponse.json({ error: "Missing proofId" }, { status: 400 });
      }
      const agg = BitVMBridge.getAggregation(proofId);
      if (!agg) {
        return NextResponse.json({ error: "Aggregation not found" }, { status: 404 });
      }
      return NextResponse.json(agg);
    }

    return NextResponse.json({ success: true, status: "idle" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
