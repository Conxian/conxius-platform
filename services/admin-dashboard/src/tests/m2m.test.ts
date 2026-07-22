import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { decodeJwt, decodeProtectedHeader, SignJWT, type JWTPayload, type JWTHeaderParameters } from "jose";

vi.mock("server-only", () => ({}));

import {
  DEFAULT_JWT_CLOCK_SKEW_SECONDS,
  DEFAULT_JWT_TTL_SECONDS,
  MAX_JWT_TTL_SECONDS,
  MIN_JWT_TTL_SECONDS,
  M2MAuthenticator,
  M2MConfig,
  SERVICE_PERMISSIONS,
  type JwtServiceId,
  type Scope,
  validateAdminAuth,
  validateM2MAuth,
  validateM2MAuthWithScope,
} from "../lib/support/m2m";
import { validateAdminAuth as validateRouteAdminAuth } from "../lib/support/auth";

const NOW_SECONDS = 1_800_000_000;
const STRONG_SECRET = "test-jwt-secret-with-at-least-32-bytes-for-hs256";
const M2M_ENV_KEYS = [
  "ADMIN_DASHBOARD_API_KEY",
  "SERVICE_KEY_GATEWAY",
  "SERVICE_KEY_ELIZAOS",
  "SERVICE_KEY_NEXUS",
  "SERVICE_KEY_ADMIN_DASHBOARD",
  "GATEWAY_JWT_SECRET",
  "GATEWAY_JWT_ISSUER",
  "GATEWAY_JWT_AUDIENCE",
  "M2M_JWT_TTL_SECONDS",
  "M2M_JWT_CLOCK_SKEW_SECONDS",
  "M2M_GATEWAY_AUTH_MODE",
  "EXTERNAL_API_KEYS",
  "CORE_API_URL",
  "NEXT_PUBLIC_CORE_API_URL",
] as const;

const originalEnvironment = new Map<string, string | undefined>(M2M_ENV_KEYS.map((key) => [key, process.env[key]]));

const baseEnvironment: Record<string, string> = {
  ADMIN_DASHBOARD_API_KEY: "test-admin-key",
  SERVICE_KEY_GATEWAY: "test-gateway-key",
  SERVICE_KEY_ELIZAOS: "test-elizaos-key",
  SERVICE_KEY_NEXUS: "test-nexus-key",
  SERVICE_KEY_ADMIN_DASHBOARD: "test-admin-dashboard-key",
  GATEWAY_JWT_SECRET: STRONG_SECRET,
  GATEWAY_JWT_ISSUER: "https://issuer.test.conxian",
  GATEWAY_JWT_AUDIENCE: "conxian-gateway",
  M2M_JWT_TTL_SECONDS: String(DEFAULT_JWT_TTL_SECONDS),
  M2M_JWT_CLOCK_SKEW_SECONDS: String(DEFAULT_JWT_CLOCK_SKEW_SECONDS),
  M2M_GATEWAY_AUTH_MODE: "legacy",
  EXTERNAL_API_KEYS: JSON.stringify({
    "external-key-1": ["read:admin", "read:metrics"],
    "external-key-2": ["read:treasury"],
  }),
};

function setEnvironment(overrides: Partial<Record<string, string | undefined>> = {}): void {
  for (const key of M2M_ENV_KEYS) delete process.env[key];
  const values = { ...baseEnvironment, ...overrides };
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) process.env[key] = value;
  }
  M2MConfig.resetInstance();
}

function restoreEnvironment(): void {
  for (const key of M2M_ENV_KEYS) delete process.env[key];
  for (const [key, value] of originalEnvironment) {
    if (value !== undefined) process.env[key] = value;
  }
  M2MConfig.resetInstance();
}

async function signRawToken(payloadOverrides: Partial<JWTPayload> = {}, headerOverrides: Partial<JWTHeaderParameters> = {}): Promise<string> {
  const payload: JWTPayload = {
    iss: process.env.GATEWAY_JWT_ISSUER,
    aud: process.env.GATEWAY_JWT_AUDIENCE,
    sub: "gateway",
    scope: "m2m:internal read:admin",
    iat: NOW_SECONDS,
    nbf: NOW_SECONDS,
    exp: NOW_SECONDS + DEFAULT_JWT_TTL_SECONDS,
    jti: "test-jti",
  };

  for (const [key, value] of Object.entries(payloadOverrides)) {
    if (value === undefined) {
      delete payload[key];
    } else {
      payload[key] = value;
    }
  }

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT", ...headerOverrides })
    .sign(new TextEncoder().encode(process.env.GATEWAY_JWT_SECRET ?? ""));
}

describe("M2M authentication", () => {
  let authenticator: M2MAuthenticator;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW_SECONDS * 1000);
    setEnvironment();
    authenticator = new M2MAuthenticator();
  });

  afterEach(() => {
    vi.useRealTimers();
    restoreEnvironment();
  });

  describe("legacy credential compatibility", () => {
    it("validates the configured admin API key", () => {
      const result = authenticator.validateApiKey("test-admin-key");
      expect(result).toMatchObject({ valid: true, source: "api-key" });
      expect(result.scopes).toContain("m2m:internal");
    });

    it("validates service keys and preserves their permission ceilings", () => {
      const result = authenticator.validateServiceKey("gateway:test-gateway-key");
      expect(result).toMatchObject({ valid: true, serviceId: "gateway", source: "service-key" });
      expect(result.scopes).toEqual([...SERVICE_PERMISSIONS.gateway]);
      expect(authenticator.validateServiceKey("gateway:wrong-key").valid).toBe(false);
    });

    it("validates external keys with explicit scopes", () => {
      const result = authenticator.validateExternalKey("external-key-1");
      expect(result).toMatchObject({ valid: true, serviceId: "external", source: "external-key" });
      expect(result.scopes).toEqual(["read:admin", "read:metrics"]);
    });

    it("keeps legacy authentication order when no Bearer header is present", async () => {
      const request = new Request("http://localhost/api/test", {
        headers: {
          "X-Admin-API-Key": "test-admin-key",
          "X-Service-Key": "gateway:test-gateway-key",
          "X-External-Key": "external-key-1",
        },
      });
      const result = await authenticator.authenticate(request);
      expect(result).toMatchObject({ valid: true, source: "api-key" });
    });

    it("continues to support key-based route helpers without JWT configuration", async () => {
      setEnvironment({ GATEWAY_JWT_SECRET: undefined, GATEWAY_JWT_ISSUER: undefined, GATEWAY_JWT_AUDIENCE: undefined });
      authenticator = new M2MAuthenticator();

      const request = new Request("http://localhost/api/test", {
        headers: { "X-Admin-API-Key": "test-admin-key" },
      });
      expect(await validateM2MAuth(request)).toBeNull();
      expect(await validateAdminAuth(request)).toBeNull();
    });
  });

  describe("JWT issuance and verification", () => {
    it("issues a strict HS256 token with all required claims", async () => {
      const token = await authenticator.issueJwt("gateway", ["read:admin", "m2m:internal"], { nowSeconds: NOW_SECONDS });
      const header = decodeProtectedHeader(token);
      const claims = decodeJwt(token);

      expect(header).toEqual({ alg: "HS256", typ: "JWT" });
      expect(claims).toMatchObject({
        iss: process.env.GATEWAY_JWT_ISSUER,
        aud: process.env.GATEWAY_JWT_AUDIENCE,
        sub: "gateway",
        iat: NOW_SECONDS,
        nbf: NOW_SECONDS,
        exp: NOW_SECONDS + DEFAULT_JWT_TTL_SECONDS,
      });
      expect(typeof claims.jti).toBe("string");
      expect((claims.jti as string).length).toBeGreaterThan(0);
      expect(claims.scope).toBe("m2m:internal read:admin");

      const result = await authenticator.verifyJwt(token, { nowSeconds: NOW_SECONDS });
      expect(result).toMatchObject({ valid: true, serviceId: "gateway", source: "jwt" });
      expect(result.scopes).toEqual(["m2m:internal", "read:admin"]);
    });

    it("creates a fresh jti for each issuance", async () => {
      const first = await authenticator.issueJwt("gateway", ["read:admin", "m2m:internal"], { nowSeconds: NOW_SECONDS });
      const second = await authenticator.issueJwt("gateway", ["read:admin", "m2m:internal"], { nowSeconds: NOW_SECONDS });
      expect(decodeJwt(first).jti).not.toBe(decodeJwt(second).jti);
    });

    it("rejects scope escalation, duplicates, missing internal scope, and external identities at issuance", async () => {
      await expect(authenticator.issueJwt("gateway", ["write:admin", "m2m:internal"])).rejects.toThrow("M2M JWT issuance failed");
      await expect(authenticator.issueJwt("gateway", ["read:admin", "read:admin", "m2m:internal"])).rejects.toThrow("M2M JWT issuance failed");
      await expect(authenticator.issueJwt("gateway", ["read:admin"])).rejects.toThrow("M2M JWT issuance failed");
      await expect(authenticator.issueJwt("external" as JwtServiceId, ["read:admin", "m2m:internal"])).rejects.toThrow("M2M JWT issuance failed");
    });

    it("rejects invalid JWT configuration and out-of-range policy values", async () => {
      for (const overrides of [
        { GATEWAY_JWT_SECRET: undefined },
        { GATEWAY_JWT_SECRET: "too-short" },
        { GATEWAY_JWT_ISSUER: undefined },
        { GATEWAY_JWT_AUDIENCE: undefined },
        { M2M_JWT_TTL_SECONDS: String(MIN_JWT_TTL_SECONDS - 1) },
        { M2M_JWT_TTL_SECONDS: String(MAX_JWT_TTL_SECONDS + 1) },
        { M2M_JWT_CLOCK_SKEW_SECONDS: "61" },
        { M2M_JWT_CLOCK_SKEW_SECONDS: "not-a-number" },
        { M2M_GATEWAY_AUTH_MODE: "unsupported" },
      ]) {
        setEnvironment(overrides);
        authenticator = new M2MAuthenticator();
        await expect(authenticator.issueJwt("gateway", ["read:admin", "m2m:internal"])).rejects.toThrow("M2M JWT issuance failed");
      }
    });

    it("accepts the inclusive minimum and maximum TTL bounds", async () => {
      const minimum = await authenticator.issueJwt("gateway", ["read:admin", "m2m:internal"], { ttlSeconds: MIN_JWT_TTL_SECONDS, nowSeconds: NOW_SECONDS });
      const maximum = await authenticator.issueJwt("gateway", ["read:admin", "m2m:internal"], { ttlSeconds: MAX_JWT_TTL_SECONDS, nowSeconds: NOW_SECONDS });
      expect(await authenticator.verifyJwt(minimum, { nowSeconds: NOW_SECONDS }).then((result) => result.valid)).toBe(true);
      expect(await authenticator.verifyJwt(maximum, { nowSeconds: NOW_SECONDS }).then((result) => result.valid)).toBe(true);
    });

    it("rejects signature tampering, alternate algorithms, wrong headers, and kid", async () => {
      const valid = await authenticator.issueJwt("gateway", ["read:admin", "m2m:internal"], { nowSeconds: NOW_SECONDS });
      const tampered = `${valid.slice(0, -1)}${valid.endsWith("a") ? "b" : "a"}`;
      expect((await authenticator.verifyJwt(tampered, { nowSeconds: NOW_SECONDS })).valid).toBe(false);

      const alternateAlgorithm = await signRawToken({}, { alg: "HS384" });
      const wrongType = await signRawToken({}, { typ: "not-jwt" });
      const withKid = await signRawToken({}, { kid: "old-key" });
      expect((await authenticator.verifyJwt(alternateAlgorithm, { nowSeconds: NOW_SECONDS })).valid).toBe(false);
      expect((await authenticator.verifyJwt(wrongType, { nowSeconds: NOW_SECONDS })).valid).toBe(false);
      expect((await authenticator.verifyJwt(withKid, { nowSeconds: NOW_SECONDS })).valid).toBe(false);
    });

    it("rejects wrong issuer, audience, unknown service, and missing claims", async () => {
      const invalidTokens = [
        await signRawToken({ iss: "https://wrong-issuer.test" }),
        await signRawToken({ aud: "wrong-audience" }),
        await signRawToken({ sub: "unknown-service" }),
        await signRawToken({ aud: undefined }),
        await signRawToken({ sub: undefined }),
        await signRawToken({ scope: undefined }),
        await signRawToken({ iat: undefined }),
        await signRawToken({ nbf: undefined }),
        await signRawToken({ exp: undefined }),
        await signRawToken({ jti: undefined }),
      ];

      for (const token of invalidTokens) {
        expect((await authenticator.verifyJwt(token, { nowSeconds: NOW_SECONDS })).valid).toBe(false);
      }
    });

    it("rejects malformed, duplicate, unknown, and ceiling-exceeding scopes during verification", async () => {
      const invalidScopes = [
        "m2m:internal m2m:internal",
        "m2m:internal unknown:scope",
        "m2m:internal write:admin",
        "read:admin",
        "m2m:internal  read:admin",
      ];

      for (const scope of invalidScopes) {
        const token = await signRawToken({ scope });
        expect((await authenticator.verifyJwt(token, { nowSeconds: NOW_SECONDS })).valid).toBe(false);
      }
    });

    it("enforces expired, future, and clock-skew boundary timestamps", async () => {
      const expiredAtBoundary = await signRawToken({ iat: NOW_SECONDS - 300, nbf: NOW_SECONDS - 300, exp: NOW_SECONDS - DEFAULT_JWT_CLOCK_SKEW_SECONDS });
      const expiredInsideSkew = await signRawToken({ iat: NOW_SECONDS - 300, nbf: NOW_SECONDS - 300, exp: NOW_SECONDS - DEFAULT_JWT_CLOCK_SKEW_SECONDS + 1 });
      const futureAtBoundary = await signRawToken({ iat: NOW_SECONDS + DEFAULT_JWT_CLOCK_SKEW_SECONDS, nbf: NOW_SECONDS + DEFAULT_JWT_CLOCK_SKEW_SECONDS, exp: NOW_SECONDS + DEFAULT_JWT_CLOCK_SKEW_SECONDS + 300 });
      const futureOutsideSkew = await signRawToken({ iat: NOW_SECONDS + DEFAULT_JWT_CLOCK_SKEW_SECONDS + 1, nbf: NOW_SECONDS + DEFAULT_JWT_CLOCK_SKEW_SECONDS + 1, exp: NOW_SECONDS + DEFAULT_JWT_CLOCK_SKEW_SECONDS + 301 });

      expect((await authenticator.verifyJwt(expiredAtBoundary, { nowSeconds: NOW_SECONDS })).valid).toBe(false);
      expect((await authenticator.verifyJwt(expiredInsideSkew, { nowSeconds: NOW_SECONDS })).valid).toBe(true);
      expect((await authenticator.verifyJwt(futureAtBoundary, { nowSeconds: NOW_SECONDS })).valid).toBe(true);
      expect((await authenticator.verifyJwt(futureOutsideSkew, { nowSeconds: NOW_SECONDS })).valid).toBe(false);
    });

    it("rejects token lifetimes outside the fixed bounds", async () => {
      const tooShort = await signRawToken({ exp: NOW_SECONDS + MIN_JWT_TTL_SECONDS - 1 });
      const tooLong = await signRawToken({ exp: NOW_SECONDS + MAX_JWT_TTL_SECONDS + 1 });
      expect((await authenticator.verifyJwt(tooShort, { nowSeconds: NOW_SECONDS })).valid).toBe(false);
      expect((await authenticator.verifyJwt(tooLong, { nowSeconds: NOW_SECONDS })).valid).toBe(false);
    });
  });

  describe("Bearer precedence and scoped authorization", () => {
    it("rejects malformed or invalid Bearer credentials without legacy fallback", async () => {
      const requests = [
        new Request("http://localhost/api/test", { headers: { Authorization: "Basic test-admin-key", "X-Admin-API-Key": "test-admin-key" } }),
        new Request("http://localhost/api/test", { headers: { Authorization: "Bearer malformed", "X-Admin-API-Key": "test-admin-key" } }),
        new Request("http://localhost/api/test", { headers: { Authorization: "Bearer a.b.c", "X-Service-Key": "gateway:test-gateway-key" } }),
        new Request("http://localhost/api/test", { headers: { Authorization: `Bearer ${"a".repeat(4097)}.b.c`, "X-Admin-API-Key": "test-admin-key" } }),
      ];

      for (const request of requests) {
        const result = await authenticator.authenticate(request);
        expect(result.valid).toBe(false);
      }
    });

    it("rejects duplicate Authorization values", async () => {
      const token = await authenticator.issueJwt("gateway", ["read:admin", "m2m:internal"], { nowSeconds: NOW_SECONDS });
      const headers = new Headers();
      headers.append("Authorization", `Bearer ${token}`);
      headers.append("Authorization", `Bearer ${token}`);
      headers.set("X-Admin-API-Key", "test-admin-key");
      expect((await authenticator.authenticate(new Request("http://localhost/api/test", { headers }))).valid).toBe(false);
    });

    it("distinguishes unauthorized credentials from missing scopes", async () => {
      const validRequest = new Request("http://localhost/api/test", {
        headers: { Authorization: `Bearer ${await authenticator.issueJwt("gateway", ["read:admin", "m2m:internal"], { nowSeconds: NOW_SECONDS })}` },
      });
      const deniedRequest = new Request("http://localhost/api/test", {
        headers: { Authorization: `Bearer ${await authenticator.issueJwt("nexus", ["read:governance", "m2m:internal"], { nowSeconds: NOW_SECONDS })}` },
      });

      const allowed = await validateM2MAuthWithScope(validRequest, "read:admin");
      const denied = await validateM2MAuthWithScope(deniedRequest, "read:admin");
      const unauthorized = await validateM2MAuthWithScope(new Request("http://localhost/api/test", { headers: { Authorization: "Bearer malformed" } }), "read:admin");
      expect(allowed.response).toBeNull();
      expect(denied.response?.status).toBe(403);
      expect(unauthorized.response?.status).toBe(401);
    });

    it("requires read:admin for both JWT compatibility guards", async () => {
      const allowedToken = await authenticator.issueJwt("gateway", ["read:admin", "m2m:internal"], { nowSeconds: NOW_SECONDS });
      const deniedToken = await authenticator.issueJwt("nexus", ["read:governance", "m2m:internal"], { nowSeconds: NOW_SECONDS });
      const allowedRequest = new Request("http://localhost/api/test", { headers: { Authorization: `Bearer ${allowedToken}` } });
      const deniedRequest = new Request("http://localhost/api/test", { headers: { Authorization: `Bearer ${deniedToken}` } });

      expect(await validateAdminAuth(allowedRequest)).toBeNull();
      expect((await validateAdminAuth(deniedRequest))?.status).toBe(403);
      expect(await validateRouteAdminAuth(allowedRequest)).toBeNull();
      expect((await validateRouteAdminAuth(deniedRequest))?.status).toBe(403);
    });

    it("keeps write and administrative routes on explicit scopes", async () => {
      const readOnlyToken = await authenticator.issueJwt("gateway", ["read:admin", "m2m:internal"], { nowSeconds: NOW_SECONDS });
      const adminToken = await authenticator.issueJwt("admin-dashboard", ["read:admin", "write:admin", "m2m:internal"], { nowSeconds: NOW_SECONDS });
      const readOnlyRequest = new Request("http://localhost/api/test", { headers: { Authorization: `Bearer ${readOnlyToken}` } });
      const adminRequest = new Request("http://localhost/api/test", { headers: { Authorization: `Bearer ${adminToken}` } });

      expect((await validateRouteAdminAuth(readOnlyRequest, "write:admin"))?.status).toBe(403);
      expect(await validateRouteAdminAuth(adminRequest, "write:admin")).toBeNull();
    });
  });
});
