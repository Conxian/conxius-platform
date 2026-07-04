import { NextResponse } from "next/server";
import { BitVMBridge } from "@/lib/support/bitvm";
import { zkcpBridge } from "@/lib/support/zkcp";
import { validateAdminAuth } from "@/lib/support/auth";

export async function POST(req: Request) {
  const authError = validateAdminAuth(req);
  if (authError) return authError;

  try {
    const payload = await req.json();
    const { action, proof, proofId, verifierId, signature } = payload;

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

    // G-50: ZKCP (Zero-Knowledge Contingent Payments) Actions
    if (action === "zkcp-initialize") {
      const { id, amount, encryptedDataHash, proofHash, sellerAddress, buyerAddress } = payload;
      const intent = zkcpBridge.initializeIntent({ id, amount, encryptedDataHash, proofHash, sellerAddress, buyerAddress });
      return NextResponse.json(intent);
    }

    if (action === "zkcp-verify") {
      const { id, proof, publicInputs } = payload;
      const isValid = await zkcpBridge.verifyProof(id, proof, publicInputs ?? []);
      return NextResponse.json({ id, verified: isValid, status: zkcpBridge.getIntent(id)?.status });
    }

    if (action === "zkcp-watch") {
      const { id } = payload;
      const result = await zkcpBridge.watchForPayment(id);
      return NextResponse.json({ id, ...result, status: zkcpBridge.getIntent(id)?.status });
    }

    if (action === "zkcp-finalize") {
      const { id, paymentHash } = payload;
      const key = zkcpBridge.finalizeSettlement(id, paymentHash);
      return NextResponse.json({ id, decryptionKey: key, status: "finalized" });
    }

    if (action === "zkcp-list") {
      const { status } = payload;
      const intents = status
        ? zkcpBridge.listIntentsByStatus(status)
        : zkcpBridge.listIntents();
      return NextResponse.json({ intents, count: intents.length });
    }

    if (action === "zkcp-get") {
      const { id } = payload;
      const intent = zkcpBridge.getIntent(id);
      if (!intent) return NextResponse.json({ error: "Intent not found" }, { status: 404 });
      return NextResponse.json(intent);
    }

    return NextResponse.json({ success: true, status: "idle" });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
