import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  orchestrateSettlement,
  serializeSettlementResult,
  validateSettlementRequest,
} from "../lib/support/settlement";
import { SettlementRail, TrustTier, type SettlementResult } from "@conxian/market-sdk";

const GATEWAY_ENV_KEYS = ["GATEWAY_URL", "CORE_API_URL", "NEXT_PUBLIC_CORE_API_URL"] as const;
const originalEnvironment = new Map<string, string | undefined>(GATEWAY_ENV_KEYS.map((key) => [key, process.env[key]]));

function clearGatewayEnv(): void {
  for (const key of GATEWAY_ENV_KEYS) delete process.env[key];
}

beforeEach(() => {
  clearGatewayEnv();
});

afterEach(() => {
  for (const key of GATEWAY_ENV_KEYS) {
    const value = originalEnvironment.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("validateSettlementRequest", () => {
  it("accepts a valid request with string amountSat", () => {
    const result = validateSettlementRequest({
      id: "settle-1",
      amountSat: "1000000",
      rail: "SBTC",
      tier: "EXPEDIENT",
      builderId: "builder-1",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request.amountSat).toBe(1_000_000n);
    expect(result.request.rail).toBe(SettlementRail.Sbtc);
    expect(result.request.tier).toBe(TrustTier.Expedient);
    expect(result.request.builderId).toBe("builder-1");
  });

  it("accepts a safe integer number amountSat", () => {
    const result = validateSettlementRequest({
      id: "settle-2",
      amountSat: 5000,
      rail: "LIGHTNING",
      tier: "MANAGED",
      builderId: "builder-2",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.request.amountSat).toBe(5000n);
  });

  it("rejects a missing id", () => {
    const result = validateSettlementRequest({
      amountSat: "1000",
      rail: "SBTC",
      tier: "EXPEDIENT",
      builderId: "b",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure_code).toBe("malformed_request");
  });

  it("rejects an unknown rail", () => {
    const result = validateSettlementRequest({
      id: "x",
      amountSat: "1000",
      rail: "NOT_A_RAIL",
      tier: "EXPEDIENT",
      builderId: "b",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a non-numeric amountSat", () => {
    const result = validateSettlementRequest({
      id: "x",
      amountSat: "12.5",
      rail: "SBTC",
      tier: "EXPEDIENT",
      builderId: "b",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a non-object request", () => {
    expect(validateSettlementRequest(null).ok).toBe(false);
    expect(validateSettlementRequest("nope").ok).toBe(false);
    expect(validateSettlementRequest([1, 2]).ok).toBe(false);
  });
});

describe("orchestrateSettlement", () => {
  it("returns backend_unavailable when the gateway URL is not configured", async () => {
    const validation = validateSettlementRequest({
      id: "settle-1",
      amountSat: "1000000",
      rail: "SBTC",
      tier: "EXPEDIENT",
      builderId: "builder-1",
    });
    if (!validation.ok) throw new Error("validation should pass");

    const outcome = await orchestrateSettlement(validation.request);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.failure_code).toBe("backend_unavailable");
  });
});

describe("serializeSettlementResult", () => {
  it("serialises bigint amounts as decimal strings", () => {
    const result: SettlementResult = {
      success: true,
      settlementId: "s-1",
      rail: SettlementRail.Sbtc,
      fee: {
        settlementId: "s-1",
        rail: SettlementRail.Sbtc,
        tier: TrustTier.Expedient,
        amountSat: 1_000_000n,
        feeSat: 20_000n,
        feeBps: 200,
        timestamp: 1_800_000_000,
        builderId: "builder-1",
      },
    };

    const serialized = serializeSettlementResult(result);
    expect(serialized.success).toBe(true);
    expect(serialized.settlementId).toBe("s-1");
    const fee = serialized.fee as Record<string, unknown>;
    expect(fee.amountSat).toBe("1000000");
    expect(fee.feeSat).toBe("20000");
    expect(() => JSON.stringify(serialized)).not.toThrow();
  });
});
