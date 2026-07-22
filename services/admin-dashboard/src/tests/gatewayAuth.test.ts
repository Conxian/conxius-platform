import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { decodeJwt } from "jose";

vi.mock("server-only", () => ({}));

import { getGatewayAuthHeaders, getTreasuryRevenue, resetGatewayAuthCache } from "../lib/sidl/gateway";
import { M2MConfig, M2MAuthenticator } from "../lib/support/m2m";

const NOW_SECONDS = 1_800_000_000;
const STRONG_SECRET = "gateway-test-secret-with-at-least-32-bytes-for-hs256";
const ENV_KEYS = [
  "ADMIN_DASHBOARD_API_KEY",
  "SERVICE_KEY_ADMIN_DASHBOARD",
  "GATEWAY_JWT_SECRET",
  "GATEWAY_JWT_ISSUER",
  "GATEWAY_JWT_AUDIENCE",
  "M2M_JWT_TTL_SECONDS",
  "M2M_JWT_CLOCK_SKEW_SECONDS",
  "M2M_GATEWAY_AUTH_MODE",
  "CORE_API_URL",
] as const;

const originalEnvironment = new Map<string, string | undefined>(ENV_KEYS.map((key) => [key, process.env[key]]));

const baseEnvironment: Record<string, string> = {
  ADMIN_DASHBOARD_API_KEY: "gateway-admin-key",
  SERVICE_KEY_ADMIN_DASHBOARD: "gateway-service-key",
  GATEWAY_JWT_SECRET: STRONG_SECRET,
  GATEWAY_JWT_ISSUER: "https://issuer.test.conxian",
  GATEWAY_JWT_AUDIENCE: "conxian-gateway",
  M2M_JWT_TTL_SECONDS: "300",
  M2M_JWT_CLOCK_SKEW_SECONDS: "30",
  M2M_GATEWAY_AUTH_MODE: "legacy",
  CORE_API_URL: "http://gateway.test",
};

function setEnvironment(overrides: Partial<Record<string, string | undefined>> = {}): void {
  for (const key of ENV_KEYS) delete process.env[key];
  for (const [key, value] of Object.entries({ ...baseEnvironment, ...overrides })) {
    if (value !== undefined) process.env[key] = value;
  }
  M2MConfig.resetInstance();
  resetGatewayAuthCache();
}

function restoreEnvironment(): void {
  for (const key of ENV_KEYS) delete process.env[key];
  for (const [key, value] of originalEnvironment) {
    if (value !== undefined) process.env[key] = value;
  }
  M2MConfig.resetInstance();
  resetGatewayAuthCache();
}

async function authHeaders(): Promise<Headers> {
  return new Headers(await getGatewayAuthHeaders());
}

describe("Gateway M2M auth transport", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW_SECONDS * 1000);
    setEnvironment();
  });

  afterEach(() => {
    vi.useRealTimers();
    restoreEnvironment();
  });

  it("keeps legacy as the default and does not require JWT configuration", async () => {
    setEnvironment({ GATEWAY_JWT_SECRET: undefined, GATEWAY_JWT_ISSUER: undefined, GATEWAY_JWT_AUDIENCE: undefined });
    const headers = await authHeaders();

    expect(headers.get("X-Admin-API-Key")).toBe("gateway-admin-key");
    expect(headers.get("X-Service-Key")).toBe("admin-dashboard:gateway-service-key");
    expect(headers.get("Authorization")).toBeNull();
  });

  it("sends JWT plus legacy headers in dual mode", async () => {
    setEnvironment({ M2M_GATEWAY_AUTH_MODE: "dual" });
    const headers = await authHeaders();
    const authorization = headers.get("Authorization");

    expect(headers.get("X-Admin-API-Key")).toBe("gateway-admin-key");
    expect(headers.get("X-Service-Key")).toBe("admin-dashboard:gateway-service-key");
    expect(authorization?.startsWith("Bearer ")).toBe(true);

    const token = authorization?.slice("Bearer ".length);
    expect(token).toBeTruthy();
    const claims = decodeJwt(token ?? "");
    expect(claims).toMatchObject({ sub: "admin-dashboard", aud: "conxian-gateway", iss: "https://issuer.test.conxian" });
    expect(claims.scope).toBe("m2m:internal read:admin read:metrics read:treasury");
  });

  it("sends only the JWT in jwt mode", async () => {
    setEnvironment({ M2M_GATEWAY_AUTH_MODE: "jwt" });
    const headers = await authHeaders();

    expect(headers.get("Authorization")?.startsWith("Bearer ")).toBe(true);
    expect(headers.get("X-Admin-API-Key")).toBeNull();
    expect(headers.get("X-Service-Key")).toBeNull();
  });

  it("reuses cached tokens and re-issues inside the clock-skew window", async () => {
    setEnvironment({ M2M_GATEWAY_AUTH_MODE: "dual" });
    const first = (await authHeaders()).get("Authorization");
    const reused = (await authHeaders()).get("Authorization");
    expect(reused).toBe(first);

    vi.setSystemTime((NOW_SECONDS + 100) * 1000);
    expect((await authHeaders()).get("Authorization")).toBe(first);

    vi.setSystemTime((NOW_SECONDS + 271) * 1000);
    const refreshed = (await authHeaders()).get("Authorization");
    expect(refreshed).not.toBe(first);

    const token = refreshed?.slice("Bearer ".length) ?? "";
    const result = await new M2MAuthenticator().verifyJwt(token, { nowSeconds: NOW_SECONDS + 271 });
    expect(result.valid).toBe(true);
  });

  it("fails closed for explicitly selected JWT modes without valid configuration", async () => {
    for (const mode of ["dual", "jwt"] as const) {
      setEnvironment({ M2M_GATEWAY_AUTH_MODE: mode, GATEWAY_JWT_SECRET: undefined });
      await expect(getGatewayAuthHeaders()).rejects.toThrow("Gateway JWT configuration unavailable");
    }

    setEnvironment({ M2M_GATEWAY_AUTH_MODE: "unsupported" });
    await expect(getGatewayAuthHeaders()).rejects.toThrow("Gateway auth mode is invalid");
  });

  it("does not mask explicit JWT configuration failures behind Gateway fallback", async () => {
    setEnvironment({ M2M_GATEWAY_AUTH_MODE: "jwt", GATEWAY_JWT_SECRET: undefined });

    await expect(getTreasuryRevenue()).rejects.toThrow("Gateway JWT configuration unavailable");
  });
});
