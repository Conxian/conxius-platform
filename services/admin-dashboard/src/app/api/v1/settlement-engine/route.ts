import { NextResponse } from "next/server";
import { bitvmBridge } from "@/lib/support/bitvm";
import { zkcpBridge, type ZKCPStatus } from "@/lib/support/zkcp";
import { validateAdminAuth } from "@/lib/support/auth";
import { isDigest } from "@/lib/support/verifier-contract";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPaymentNetwork(value: unknown): value is "bitcoin-mainnet" | "bitcoin-testnet" | "bitcoin-signet" | "bitcoin-regtest" {
  return value === "bitcoin-mainnet"
    || value === "bitcoin-testnet"
    || value === "bitcoin-signet"
    || value === "bitcoin-regtest";
}

function isZKCPStatus(value: unknown): value is ZKCPStatus {
  return value === "pending"
    || value === "verified"
    || value === "paid"
    || value === "finalized"
    || value === "failed"
    || value === "unsupported";
}

function statusForFailure(failureCode: unknown): number {
  if (failureCode === "backend_unavailable"
    || failureCode === "observer_unavailable"
    || failureCode === "decryption_key_unavailable"
    || failureCode === "unsupported_backend") return 503;
  if (failureCode === "internal_error") return 500;
  if (failureCode === "payment_not_observed") return 409;
  return 422;
}

function responseFor<T extends Record<string, unknown>>(
  body: T,
  success: boolean,
  failureCode?: unknown,
): NextResponse {
  return NextResponse.json(body, { status: success ? 200 : statusForFailure(failureCode) });
}

function failureResponse(
  failure_code: string,
  error: string,
): NextResponse {
  return NextResponse.json(
    { accepted: false, status: "rejected", failure_code, error },
    { status: statusForFailure(failure_code) },
  );
}

export async function POST(req: Request) {
  const authError = await validateAdminAuth(req, "write:treasury");
  if (authError) return authError;

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return failureResponse("malformed_request", "Request body must be valid JSON");
  }

  if (!isRecord(payload) || !isNonEmptyString(payload.action)) {
    return failureResponse("malformed_request", "A settlement action is required");
  }

  const action = payload.action;

  try {
    if (action === "orchestrate") {
      return failureResponse(
        "unsupported_backend",
        "Settlement orchestration is unavailable until Gateway/Core backends are injected",
      );
    }

    if (action === "verify-floor") {
      const result = await bitvmBridge.verifyFloor(payload.request);
      return responseFor(result as unknown as Record<string, unknown>, result.verified, result.failure_code);
    }

    if (action === "get-floor-state") {
      if (!isNonEmptyString(payload.proofId)) {
        return failureResponse("malformed_request", "Missing proofId");
      }
      const state = bitvmBridge.getState(payload.proofId);
      if (!state) return NextResponse.json({ error: "State not found" }, { status: 404 });
      return NextResponse.json(state);
    }

    if (action === "submit-signature") {
      if (!isNonEmptyString(payload.proofId)
        || !isNonEmptyString(payload.verifierId)
        || typeof payload.signature !== "string") {
        return failureResponse("malformed_request", "Missing signature submission fields");
      }
      const result = await bitvmBridge.submitSignature(payload.proofId, payload.verifierId, payload.signature);
      return responseFor(result as unknown as Record<string, unknown>, result.accepted, result.failure_code);
    }

    if (action === "get-aggregation") {
      if (!isNonEmptyString(payload.proofId)) {
        return failureResponse("malformed_request", "Missing proofId");
      }
      const aggregation = bitvmBridge.getAggregation(payload.proofId);
      if (!aggregation) return NextResponse.json({ error: "Aggregation not found" }, { status: 404 });
      return NextResponse.json(aggregation);
    }

    if (action === "zkcp-initialize") {
      if (!isNonEmptyString(payload.id)
        || typeof payload.amount !== "number"
        || !Number.isInteger(payload.amount)
        || !isNonEmptyString(payload.encryptedDataHash)
        || !isNonEmptyString(payload.proofHash)
        || !isNonEmptyString(payload.sellerAddress)
        || !isNonEmptyString(payload.buyerAddress)
        || !isPaymentNetwork(payload.network)
        || !isDigest(payload.encryptedDataHash)
        || !isDigest(payload.proofHash)) {
        return failureResponse("malformed_request", "ZKCP intent bindings are incomplete or malformed");
      }

      const intent = zkcpBridge.initializeIntent({
        id: payload.id,
        amount: payload.amount,
        encryptedDataHash: payload.encryptedDataHash,
        proofHash: payload.proofHash,
        sellerAddress: payload.sellerAddress,
        buyerAddress: payload.buyerAddress,
        network: payload.network,
      });
      return NextResponse.json(intent);
    }

    if (action === "zkcp-verify") {
      if (!isNonEmptyString(payload.id) || payload.request === undefined) {
        return failureResponse("malformed_request", "ZKCP verification requires an intent id and canonical request");
      }
      const verification = await zkcpBridge.verifyProof(payload.id, payload.request);
      const intent = zkcpBridge.getIntent(payload.id);
      return responseFor(
        {
          id: payload.id,
          verified: verification.verified,
          verification,
          status: intent?.status ?? "failed",
        },
        verification.verified,
        verification.failure_code,
      );
    }

    if (action === "zkcp-watch") {
      if (!isNonEmptyString(payload.id)) {
        return failureResponse("malformed_request", "Missing ZKCP intent id");
      }
      const result = await zkcpBridge.watchForPayment(payload.id);
      return responseFor(
        { id: payload.id, ...result, status: zkcpBridge.getIntent(payload.id)?.status ?? "failed" },
        result.status === "observed" && result.detected,
        result.failure_code,
      );
    }

    if (action === "zkcp-finalize") {
      if (!isNonEmptyString(payload.id)) {
        return failureResponse("malformed_request", "Missing ZKCP intent id");
      }
      if (Object.prototype.hasOwnProperty.call(payload, "paymentHash")) {
        return failureResponse(
          "payment_hash_not_authority",
          "Caller-supplied payment hashes cannot authorize finalization",
        );
      }
      const result = await zkcpBridge.finalizeSettlement(payload.id);
      return responseFor(
        result as unknown as Record<string, unknown>,
        result.finalized,
        result.failure_code,
      );
    }

    if (action === "zkcp-list") {
      if (payload.status !== undefined && !isZKCPStatus(payload.status)) {
        return failureResponse("malformed_request", "Unknown ZKCP status filter");
      }
      const intents = payload.status
        ? zkcpBridge.listIntentsByStatus(payload.status)
        : zkcpBridge.listIntents();
      return NextResponse.json({ intents, count: intents.length });
    }

    if (action === "zkcp-get") {
      if (!isNonEmptyString(payload.id)) {
        return failureResponse("malformed_request", "Missing ZKCP intent id");
      }
      const intent = zkcpBridge.getIntent(payload.id);
      if (!intent) return NextResponse.json({ error: "Intent not found" }, { status: 404 });
      return NextResponse.json(intent);
    }

    return failureResponse("unknown_action", `Unsupported settlement action: ${action}`);
  } catch (error: unknown) {
    return NextResponse.json(
      {
        accepted: false,
        status: "rejected",
        failure_code: "internal_error",
        error: error instanceof Error ? error.message : "Settlement request failed",
      },
      { status: 500 },
    );
  }
}
