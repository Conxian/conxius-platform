import { NextResponse } from "next/server";
import { bitvmBridge } from "@/lib/support/bitvm";
import {
  validateZKCPListPagination,
  zkcpBridge,
  ZKCPBoundaryError,
  type ZKCPStatus,
} from "@/lib/support/zkcp";
import { validateAdminAuth } from "@/lib/support/auth";
import { isDigest, normalizeBoundaryError, VERIFIER_RESOURCE_LIMITS } from "@/lib/support/verifier-contract";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isBoundedNonEmptyString(value: unknown, maxLength: number): value is string {
  return isNonEmptyString(value) && value.length <= maxLength;
}

function isOversizedString(value: unknown, maxLength: number): boolean {
  return typeof value === "string" && value.length > maxLength;
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
    || failureCode === "unsupported_backend"
    || failureCode === "key_release_capability_missing"
    || failureCode === "key_release_registry_mismatch"
    || failureCode === "key_release_lookup_failed"
    || failureCode === "key_release_ambiguous") return 503;
  if (failureCode === "resource_limit_exceeded") return 413;
  if (failureCode === "internal_error") return 500;
  if (failureCode === "payment_not_observed" || failureCode === "key_release_obligation_conflict") return 409;
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
  error: unknown,
): NextResponse {
  const normalized = normalizeBoundaryError(error, "Settlement request failed");
  const effectiveFailureCode = normalized.truncated ? "resource_limit_exceeded" : failure_code;
  return NextResponse.json(
    { accepted: false, status: "rejected", failure_code: effectiveFailureCode, error: normalized.message },
    { status: statusForFailure(effectiveFailureCode) },
  );
}

async function readBoundedBody(req: Request): Promise<
  | { ok: true; body: string }
  | { ok: false; failure_code: "resource_limit_exceeded" | "malformed_request"; error: string }
> {
  const contentLength = req.headers.get("content-length");
  if (contentLength !== null) {
    const declaredLength = Number.parseInt(contentLength, 10);
    if (Number.isSafeInteger(declaredLength) && declaredLength > VERIFIER_RESOURCE_LIMITS.maxRequestBodyBytes) {
      return {
        ok: false,
        failure_code: "resource_limit_exceeded",
        error: "Settlement request body exceeds the v1 resource limit",
      };
    }
  }

  if (!req.body) return { ok: true, body: "" };

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      const chunk = next.value;
      totalBytes += chunk.byteLength;
      if (totalBytes > VERIFIER_RESOURCE_LIMITS.maxRequestBodyBytes) {
        try {
          await reader.cancel();
        } catch {
          // The body is already over the hard limit; preserve the typed limit
          // failure even if the underlying stream cannot be cancelled.
        }
        return {
          ok: false,
          failure_code: "resource_limit_exceeded",
          error: "Settlement request body exceeds the v1 resource limit",
        };
      }
      chunks.push(chunk);
    }
  } catch {
    return {
      ok: false,
      failure_code: "malformed_request",
      error: "Settlement request body could not be read",
    };
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { ok: true, body: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch {
    return {
      ok: false,
      failure_code: "malformed_request",
      error: "Settlement request body must be valid UTF-8",
    };
  }
}

export async function POST(req: Request) {
  const authError = await validateAdminAuth(req, "write:treasury");
  if (authError) return authError;

  let payload: unknown;
  try {
    const body = await readBoundedBody(req);
    if (!body.ok) return failureResponse(body.failure_code, body.error);
    payload = JSON.parse(body.body) as unknown;
  } catch {
    return failureResponse("malformed_request", "Request body must be valid JSON");
  }

  if (!isRecord(payload) || !isNonEmptyString(payload.action)) {
    return failureResponse("malformed_request", "A settlement action is required");
  }

  const action = payload.action;
  if (isOversizedString(action, VERIFIER_RESOURCE_LIMITS.maxActionChars)) {
    return failureResponse("resource_limit_exceeded", "Settlement action exceeds the v1 resource limit");
  }

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
      if (!isBoundedNonEmptyString(payload.proofId, VERIFIER_RESOURCE_LIMITS.maxIdentifierChars)) {
        return failureResponse("resource_limit_exceeded", "proofId exceeds the v1 resource limit");
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
      if (!isBoundedNonEmptyString(payload.proofId, VERIFIER_RESOURCE_LIMITS.maxIdentifierChars)
        || !isBoundedNonEmptyString(payload.verifierId, VERIFIER_RESOURCE_LIMITS.maxIdentifierChars)
        || isOversizedString(payload.signature, VERIFIER_RESOURCE_LIMITS.maxSignatureChars)) {
        return failureResponse("resource_limit_exceeded", "Signature submission exceeds the v1 resource limit");
      }
      const result = await bitvmBridge.submitSignature(payload.proofId, payload.verifierId, payload.signature);
      return responseFor(result as unknown as Record<string, unknown>, result.accepted, result.failure_code);
    }

    if (action === "get-aggregation") {
      if (!isNonEmptyString(payload.proofId)) {
        return failureResponse("malformed_request", "Missing proofId");
      }
      if (!isBoundedNonEmptyString(payload.proofId, VERIFIER_RESOURCE_LIMITS.maxIdentifierChars)) {
        return failureResponse("resource_limit_exceeded", "proofId exceeds the v1 resource limit");
      }
      const aggregation = bitvmBridge.getAggregation(payload.proofId);
      if (!aggregation) return NextResponse.json({ error: "Aggregation not found" }, { status: 404 });
      return NextResponse.json(aggregation);
    }

    if (action === "zkcp-initialize") {
      if (!isNonEmptyString(payload.id)
        || typeof payload.amount !== "number"
        || !Number.isSafeInteger(payload.amount)
        || payload.amount <= 0
        || !isNonEmptyString(payload.encryptedDataHash)
        || !isNonEmptyString(payload.proofHash)
        || !isNonEmptyString(payload.sellerAddress)
        || !isNonEmptyString(payload.buyerAddress)
        || !isPaymentNetwork(payload.network)
        || !isDigest(payload.encryptedDataHash)
        || !isDigest(payload.proofHash)) {
        return failureResponse("malformed_request", "ZKCP intent bindings are incomplete or malformed");
      }
      if (!isBoundedNonEmptyString(payload.id, VERIFIER_RESOURCE_LIMITS.maxIdentifierChars)
        || !isBoundedNonEmptyString(payload.sellerAddress, VERIFIER_RESOURCE_LIMITS.maxAddressChars)
        || !isBoundedNonEmptyString(payload.buyerAddress, VERIFIER_RESOURCE_LIMITS.maxAddressChars)) {
        return failureResponse("resource_limit_exceeded", "ZKCP intent identifiers or addresses exceed the v1 resource limit");
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
      if (!isBoundedNonEmptyString(payload.id, VERIFIER_RESOURCE_LIMITS.maxIdentifierChars)) {
        return failureResponse("resource_limit_exceeded", "ZKCP intent id exceeds the v1 resource limit");
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
      if (!isBoundedNonEmptyString(payload.id, VERIFIER_RESOURCE_LIMITS.maxIdentifierChars)) {
        return failureResponse("resource_limit_exceeded", "ZKCP intent id exceeds the v1 resource limit");
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
      if (!isBoundedNonEmptyString(payload.id, VERIFIER_RESOURCE_LIMITS.maxIdentifierChars)) {
        return failureResponse("resource_limit_exceeded", "ZKCP intent id exceeds the v1 resource limit");
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
      const pagination = validateZKCPListPagination(payload.limit, payload.offset);
      if (!pagination.ok) return failureResponse(pagination.failure_code, pagination.error);
      const page = zkcpBridge.listIntentsPage(payload.status, pagination.limit, pagination.offset);
      return NextResponse.json(page);
    }

    if (action === "zkcp-get") {
      if (!isNonEmptyString(payload.id)) {
        return failureResponse("malformed_request", "Missing ZKCP intent id");
      }
      if (!isBoundedNonEmptyString(payload.id, VERIFIER_RESOURCE_LIMITS.maxIdentifierChars)) {
        return failureResponse("resource_limit_exceeded", "ZKCP intent id exceeds the v1 resource limit");
      }
      const intent = zkcpBridge.getIntent(payload.id);
      if (!intent) return NextResponse.json({ error: "Intent not found" }, { status: 404 });
      return NextResponse.json(intent);
    }

    return failureResponse("unknown_action", `Unsupported settlement action: ${action}`);
  } catch (error: unknown) {
    if (error instanceof ZKCPBoundaryError) {
      return failureResponse(error.failure_code, error.message);
    }
    return failureResponse("internal_error", error);
  }
}
