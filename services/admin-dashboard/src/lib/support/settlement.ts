import "server-only";

import {
  GatewayClient,
  GatewayVerifier,
  SettlementOrchestrator,
  SettlementRail,
  TrustTier,
  type SettlementRequest,
  type SettlementResult,
} from "@conxian/market-sdk";
import { getGatewayAuthHeaders } from "../sidl/gateway";
import { createLogger } from "./logger";

const logger = createLogger("SETTLEMENT");

/**
 * Settlement orchestration boundary. The dashboard does not implement
 * multi-rail settlement itself; it delegates to the canonical ADR-004
 * `SettlementOrchestrator` from `@conxian/market-sdk`, which in turn talks
 * to the Gateway/Core backends. If the Gateway is not configured, the
 * boundary reports `backend_unavailable` rather than fabricating a result.
 */

const RAIL_VALUES = new Set<string>(Object.values(SettlementRail));
const TIER_VALUES = new Set<string>(Object.values(TrustTier));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export type SettlementRequestValidation =
  | { ok: true; request: SettlementRequest }
  | { ok: false; failure_code: "malformed_request" | "resource_limit_exceeded"; error: string };

/**
 * Validates an untrusted JSON payload into a typed `SettlementRequest`.
 * `amountSat` is accepted as a digit string (JSON-safe, precision-preserving)
 * or a safe non-negative integer, and normalised to `bigint`.
 */
export function validateSettlementRequest(value: unknown): SettlementRequestValidation {
  if (!isRecord(value)) {
    return { ok: false, failure_code: "malformed_request", error: "Settlement request must be an object" };
  }
  if (!isNonEmptyString(value.id)) {
    return { ok: false, failure_code: "malformed_request", error: "Settlement request requires a non-empty id" };
  }
  if (!isNonEmptyString(value.builderId)) {
    return { ok: false, failure_code: "malformed_request", error: "Settlement request requires a non-empty builderId" };
  }
  if (!isNonEmptyString(value.rail) || !RAIL_VALUES.has(value.rail)) {
    return { ok: false, failure_code: "malformed_request", error: "Settlement request has an unknown rail" };
  }
  if (!isNonEmptyString(value.tier) || !TIER_VALUES.has(value.tier)) {
    return { ok: false, failure_code: "malformed_request", error: "Settlement request has an unknown trust tier" };
  }

  let amountSat: bigint;
  if (typeof value.amountSat === "string") {
    if (!/^\d+$/.test(value.amountSat)) {
      return { ok: false, failure_code: "malformed_request", error: "Settlement request amountSat must be a non-negative integer" };
    }
    try {
      amountSat = BigInt(value.amountSat);
    } catch {
      return { ok: false, failure_code: "malformed_request", error: "Settlement request amountSat is invalid" };
    }
  } else if (typeof value.amountSat === "number" && Number.isSafeInteger(value.amountSat) && value.amountSat >= 0) {
    amountSat = BigInt(value.amountSat);
  } else {
    return { ok: false, failure_code: "malformed_request", error: "Settlement request amountSat must be a non-negative integer" };
  }

  const request: SettlementRequest = {
    id: value.id,
    amountSat,
    rail: value.rail as SettlementRail,
    tier: value.tier as TrustTier,
    builderId: value.builderId,
  };

  if (value.attestation !== undefined) {
    if (!isRecord(value.attestation)) {
      return { ok: false, failure_code: "malformed_request", error: "Settlement request attestation must be an object" };
    }
    request.attestation = value.attestation as SettlementRequest["attestation"];
  }
  if (value.metadata !== undefined) {
    if (!isRecord(value.metadata)) {
      return { ok: false, failure_code: "malformed_request", error: "Settlement request metadata must be an object" };
    }
    request.metadata = Object.fromEntries(
      Object.entries(value.metadata).map(([key, entry]) => [key, String(entry)]),
    );
  }

  return { ok: true, request };
}

function gatewayBaseUrl(): string | null {
  const raw = process.env.GATEWAY_URL || process.env.CORE_API_URL || process.env.NEXT_PUBLIC_CORE_API_URL;
  if (!raw) return null;
  return raw.replace(/\/+$/, "");
}

async function gatewayBearerToken(): Promise<string | undefined> {
  const headers = new Headers(await getGatewayAuthHeaders());
  const authorization = headers.get("Authorization");
  if (authorization && authorization.startsWith("Bearer ")) return authorization.slice("Bearer ".length);
  return undefined;
}

export type SettlementOrchestration =
  | { ok: true; result: SettlementResult }
  | { ok: false; failure_code: "backend_unavailable" | "internal_error"; error: string };

/**
 * Executes a settlement through the SDK orchestrator. Returns
 * `backend_unavailable` when the Gateway is not configured (URL or auth),
 * mirroring the route's historical "unsupported backend" stance but wired
 * to the real backend once configured.
 */
export async function orchestrateSettlement(request: SettlementRequest): Promise<SettlementOrchestration> {
  const baseUrl = gatewayBaseUrl();
  if (!baseUrl) {
    return { ok: false, failure_code: "backend_unavailable", error: "Gateway backend URL is not configured" };
  }

  let apiToken: string | undefined;
  try {
    apiToken = await gatewayBearerToken();
  } catch {
    return { ok: false, failure_code: "backend_unavailable", error: "Gateway authentication is not configured" };
  }

  try {
    const gateway = new GatewayClient({ baseUrl, apiToken });
    const verifier = new GatewayVerifier(gateway);
    const orchestrator = new SettlementOrchestrator(gateway, verifier);
    const result = await orchestrator.execute(request);
    return { ok: true, result };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("settlement orchestration failed", { error: message });
    return { ok: false, failure_code: "internal_error", error: message };
  }
}

/**
 * Converts a `SettlementResult` (which carries `bigint` amounts) into a
 * JSON-safe object for `NextResponse.json`. Satoshi amounts are serialised
 * as decimal strings to preserve precision beyond `Number.MAX_SAFE_INTEGER`.
 */
export function serializeSettlementResult(result: SettlementResult): Record<string, unknown> {
  return {
    success: result.success,
    settlementId: result.settlementId,
    rail: result.rail,
    txId: result.txId,
    error: result.error,
    fee: {
      settlementId: result.fee.settlementId,
      rail: result.fee.rail,
      tier: result.fee.tier,
      amountSat: result.fee.amountSat.toString(),
      feeSat: result.fee.feeSat.toString(),
      feeBps: result.fee.feeBps,
      timestamp: result.fee.timestamp,
      builderId: result.fee.builderId,
      txId: result.fee.txId,
    },
  };
}
