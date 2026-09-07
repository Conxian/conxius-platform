import { describe, it, expect, beforeEach, vi } from "vitest";
vi.mock("server-only", () => ({}));

import {
  ApiTokenStore,
  generateRawToken,
  hashToken,
  isValidTokenFormat,
  maskToken,
  parseTokenEnvironment,
} from "../lib/support/apiTokens";
import { getM2MAuthenticator, M2MConfig } from "../lib/support/m2m";
import { GET, POST, PUT, DELETE } from "../app/api/v1/m2m/tokens/route";

describe("CONXIAN_API_TOKEN Core Unit Tests", () => {
  beforeEach(() => {
    ApiTokenStore.resetInstance();
    M2MConfig.resetInstance();
  });

  it("should generate tokens with valid prefixes and entropy length", () => {
    const liveToken = generateRawToken("live");
    const testToken = generateRawToken("test");

    expect(liveToken.startsWith("cx_live_")).toBe(true);
    expect(testToken.startsWith("cx_test_")).toBe(true);

    expect(isValidTokenFormat(liveToken)).toBe(true);
    expect(isValidTokenFormat(testToken)).toBe(true);
    expect(isValidTokenFormat("invalid_token_format")).toBe(false);

    expect(parseTokenEnvironment(liveToken)).toBe("live");
    expect(parseTokenEnvironment(testToken)).toBe("test");
  });

  it("should mask tokens safely without exposing internal entropy", () => {
    const token = generateRawToken("live");
    const masked = maskToken(token);

    expect(masked.startsWith("cx_live_...")).toBe(true);
    expect(masked.length).toBeLessThan(token.length);
    expect(maskToken("malformed")).toBe("cx_invalid");
  });

  it("should compute deterministic SHA-256 digests for tokens", () => {
    const token = generateRawToken("live");
    const digest1 = hashToken(token);
    const digest2 = hashToken(token);

    expect(digest1).toBe(digest2);
    expect(digest1.length).toBe(64); // Hex SHA-256 digest
  });

  it("should issue, verify, and scope-check active API tokens with IP allowlist", () => {
    const store = ApiTokenStore.getInstance();
    const issued = store.issueToken({
      label: "Production Gateway Agent",
      environment: "live",
      scopes: ["read:admin", "read:settlement"],
      ipAllowlist: ["192.168.1.100"],
      rateLimitPerMin: 120,
    });

    expect(issued.rawToken.startsWith("cx_live_")).toBe(true);
    expect(issued.metadata.label).toBe("Production Gateway Agent");
    expect(issued.metadata.scopes).toEqual(["read:admin", "read:settlement"]);
    expect(issued.metadata.ipAllowlist).toEqual(["192.168.1.100"]);
    expect(issued.metadata.rateLimitPerMin).toBe(120);

    // Verification success with matching IP
    const validResult = store.verifyToken(issued.rawToken, "read:admin", "192.168.1.100");
    expect(validResult.valid).toBe(true);
    expect(validResult.metadata?.id).toBe(issued.metadata.id);

    // IP allowlist check failure
    const ipFailedResult = store.verifyToken(issued.rawToken, "read:admin", "10.0.0.1");
    expect(ipFailedResult.valid).toBe(false);
    expect(ipFailedResult.error).toContain("not in token allowlist");

    // Scope check failure
    const scopeFailedResult = store.verifyToken(issued.rawToken, "write:admin", "192.168.1.100");
    expect(scopeFailedResult.valid).toBe(false);
    expect(scopeFailedResult.error).toContain("Missing required scope");
  });

  it("should support zero-downtime token rotation with grace period", () => {
    const store = ApiTokenStore.getInstance();
    const original = store.issueToken({
      label: "Rotation Source Token",
      scopes: ["read:admin"],
    });

    // Rotate with a 100s grace period
    const rotated = store.rotateToken(original.metadata.id, { gracePeriodSeconds: 100 });

    expect(rotated.rawToken).not.toBe(original.rawToken);
    expect(rotated.metadata.rotationHistory?.previousTokenId).toBe(original.metadata.id);

    // Original token remains valid during grace period
    const origVerification = store.verifyToken(original.rawToken);
    expect(origVerification.valid).toBe(true);

    // Rotated token is active immediately
    const newVerification = store.verifyToken(rotated.rawToken);
    expect(newVerification.valid).toBe(true);
  });

  it("should update token metadata and export token config map", () => {
    const store = ApiTokenStore.getInstance();
    const issued = store.issueToken({
      label: "Initial Label",
      scopes: ["read:admin"],
    });

    const updated = store.updateToken(issued.metadata.id, {
      label: "Updated Label",
      rateLimitPerMin: 300,
    });

    expect(updated.label).toBe("Updated Label");
    expect(updated.rateLimitPerMin).toBe(300);

    const configMap = store.exportTokenConfigMap();
    expect(configMap.version).toBe("v0.2.5");
    expect(configMap.tokenCount).toBe(1);
    expect(Array.isArray(configMap.tokens)).toBe(true);
  });

  it("should handle token revocation cleanly", () => {
    const store = ApiTokenStore.getInstance();
    const issued = store.issueToken({
      label: "Ephemeral Worker Token",
      scopes: ["read:admin"],
    });

    expect(store.verifyToken(issued.rawToken).valid).toBe(true);

    const revoked = store.revokeToken(issued.metadata.id);
    expect(revoked).toBe(true);

    const verifyAfterRevoke = store.verifyToken(issued.rawToken);
    expect(verifyAfterRevoke.valid).toBe(false);
    expect(verifyAfterRevoke.error).toBe("Token is revoked");
  });

  it("should reject expired tokens", () => {
    const store = ApiTokenStore.getInstance();
    const issued = store.issueToken({
      label: "Short-lived Token",
      scopes: ["read:admin"],
      ttlSeconds: -1, // Already expired
    });

    const verifyResult = store.verifyToken(issued.rawToken);
    expect(verifyResult.valid).toBe(false);
    expect(verifyResult.error).toBe("Token has expired");
  });

  it("should authenticate CONXIAN_API_TOKEN via M2MAuthenticator", async () => {
    const store = ApiTokenStore.getInstance();
    const issued = store.issueToken({
      label: "Integration Test Agent",
      ownerId: "admin-dashboard",
      scopes: ["read:admin", "read:metrics"],
    });

    const authenticator = getM2MAuthenticator();

    // Test Authorization: Bearer cx_live_...
    const req1 = new Request("http://localhost/api/v1/test", {
      headers: { Authorization: `Bearer ${issued.rawToken}` },
    });
    const auth1 = await authenticator.authenticate(req1);
    expect(auth1.valid).toBe(true);
    expect(auth1.serviceId).toBe("admin-dashboard");
    expect(auth1.source).toBe("api-key");

    // Test X-Conxian-Api-Token header
    const req2 = new Request("http://localhost/api/v1/test", {
      headers: { "X-Conxian-Api-Token": issued.rawToken },
    });
    const auth2 = await authenticator.authenticate(req2);
    expect(auth2.valid).toBe(true);
  });
});

describe("API Token Management Route Integration (/api/v1/m2m/tokens)", () => {
  const adminKey = "test-admin-key-tokens";

  beforeEach(() => {
    ApiTokenStore.resetInstance();
    M2MConfig.resetInstance();
    process.env.ADMIN_DASHBOARD_API_KEY = adminKey;
  });

  it("should list tokens, issue, update, rotate, export, and revoke via API routes", async () => {
    // 1. POST /api/v1/m2m/tokens - Create Token
    const createReq = new Request("http://localhost/api/v1/m2m/tokens", {
      method: "POST",
      headers: {
        "X-Admin-API-Key": adminKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        label: "Market Data Ingestion Token",
        environment: "live",
        scopes: ["read:admin", "read:settlement"],
        rateLimitPerMin: 60,
      }),
    });

    const createRes = await POST(createReq);
    expect(createRes.status).toBe(201);
    const createData = await createRes.json();
    expect(createData.token).toBeDefined();
    expect(createData.token.startsWith("cx_live_")).toBe(true);
    expect(createData.metadata.label).toBe("Market Data Ingestion Token");

    const tokenId = createData.metadata.id;

    // 2. PUT /api/v1/m2m/tokens - Update Metadata
    const updateReq = new Request("http://localhost/api/v1/m2m/tokens", {
      method: "PUT",
      headers: {
        "X-Admin-API-Key": adminKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: tokenId,
        label: "Updated Ingestion Token",
        rateLimitPerMin: 120,
      }),
    });

    const updateRes = await PUT(updateReq);
    expect(updateRes.status).toBe(200);

    // 3. PUT /api/v1/m2m/tokens - Rotate Token
    const rotateReq = new Request("http://localhost/api/v1/m2m/tokens", {
      method: "PUT",
      headers: {
        "X-Admin-API-Key": adminKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: tokenId,
        action: "rotate",
        gracePeriodSeconds: 60,
      }),
    });

    const rotateRes = await PUT(rotateReq);
    expect(rotateRes.status).toBe(200);
    const rotateData = await rotateRes.json();
    expect(rotateData.newToken.startsWith("cx_live_")).toBe(true);

    // 4. GET /api/v1/m2m/tokens?export=true - Export Config Map
    const exportReq = new Request("http://localhost/api/v1/m2m/tokens?export=true", {
      method: "GET",
      headers: { "X-Admin-API-Key": adminKey },
    });

    const exportRes = await GET(exportReq);
    expect(exportRes.status).toBe(200);
    const exportData = await exportRes.json();
    expect(exportData.version).toBe("v0.2.5");

    // 5. DELETE /api/v1/m2m/tokens?id=... - Revoke Token
    const deleteReq = new Request(`http://localhost/api/v1/m2m/tokens?id=${tokenId}`, {
      method: "DELETE",
      headers: { "X-Admin-API-Key": adminKey },
    });

    const deleteRes = await DELETE(deleteReq);
    expect(deleteRes.status).toBe(200);
    const deleteData = await deleteRes.json();
    expect(deleteData.id).toBe(tokenId);
  });
});
