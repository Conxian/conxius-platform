import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("fs", () => ({
  default: {
    writeFileSync: vi.fn(),
    chmodSync: vi.fn(),
  },
}));
vi.mock("@/lib/sidl/voteStore", () => ({
  recordVote: () => ({
    id: "route-vote",
    proposalId: "route-test-proposal",
    fid: 42,
    choice: "yes",
    recordedAtIso: "2026-07-22T00:00:00.000Z",
  }),
}));

import { GET as getDeploymentBlueprint } from "../app/api/deployment/blueprint/route";
import { POST as postGovernanceVote } from "../app/api/governance/votes/route";
import { POST as postSecrets } from "../app/api/secrets/route";
import { POST as postSettlementEngine } from "../app/api/v1/settlement-engine/route";
import { M2MAuthenticator, M2MConfig, type Scope } from "../lib/support/m2m";

const NOW_SECONDS = 1_800_000_000;
const STRONG_SECRET = "route-test-secret-with-at-least-32-bytes-for-hs256";
const ENV_KEYS = [
  "ADMIN_DASHBOARD_API_KEY",
  "GATEWAY_JWT_SECRET",
  "GATEWAY_JWT_ISSUER",
  "GATEWAY_JWT_AUDIENCE",
  "M2M_JWT_TTL_SECONDS",
  "M2M_JWT_CLOCK_SKEW_SECONDS",
  "M2M_GATEWAY_AUTH_MODE",
] as const;

const originalEnvironment = new Map<string, string | undefined>(ENV_KEYS.map((key) => [key, process.env[key]]));

const baseEnvironment: Record<string, string> = {
  ADMIN_DASHBOARD_API_KEY: "route-admin-key",
  GATEWAY_JWT_SECRET: STRONG_SECRET,
  GATEWAY_JWT_ISSUER: "https://issuer.route.test.conxian",
  GATEWAY_JWT_AUDIENCE: "route-gateway",
  M2M_JWT_TTL_SECONDS: "300",
  M2M_JWT_CLOCK_SKEW_SECONDS: "30",
  M2M_GATEWAY_AUTH_MODE: "legacy",
};

function setEnvironment(overrides: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {}): void {
  for (const key of ENV_KEYS) delete process.env[key];
  for (const [key, value] of Object.entries({ ...baseEnvironment, ...overrides })) {
    if (value !== undefined) process.env[key] = value;
  }
  M2MConfig.resetInstance();
}

function restoreEnvironment(): void {
  for (const key of ENV_KEYS) delete process.env[key];
  for (const [key, value] of originalEnvironment) {
    if (value !== undefined) process.env[key] = value;
  }
  M2MConfig.resetInstance();
}

async function issueToken(scopes: readonly Scope[]): Promise<string> {
  return new M2MAuthenticator().issueJwt("admin-dashboard", scopes, { nowSeconds: NOW_SECONDS });
}

function bearerRequest(method: string, token: string, body?: unknown): Request {
  const headers = new Headers({ Authorization: `Bearer ${token}` });
  if (body !== undefined) headers.set("Content-Type", "application/json");
  return new Request("http://localhost/api/test", {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("route-level M2M authorization", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW_SECONDS * 1000);
    setEnvironment();
  });

  afterEach(() => {
    vi.useRealTimers();
    restoreEnvironment();
  });

  it("authorizes representative elevated scopes through the exported route handlers", async () => {
    const secretsToken = await issueToken(["admin:secrets", "m2m:internal"]);
    const deployToken = await issueToken(["admin:deploy", "m2m:internal"]);
    const governanceToken = await issueToken(["write:governance", "m2m:internal"]);
    const treasuryToken = await issueToken(["write:treasury", "m2m:internal"]);

    const secretsResponse = await postSecrets(
      bearerRequest("POST", secretsToken, { secrets: {} }),
    );
    const deploymentResponse = await getDeploymentBlueprint(bearerRequest("GET", deployToken));
    const governanceResponse = await postGovernanceVote(
      bearerRequest("POST", governanceToken, { proposalId: "route-test-proposal", fid: 42, choice: "yes" }),
    );
    const treasuryResponse = await postSettlementEngine(
      bearerRequest("POST", treasuryToken, { action: "orchestrate" }),
    );

    expect(secretsResponse.status).toBe(200);
    expect(deploymentResponse.status).toBe(200);
    expect(governanceResponse.status).toBe(200);
    expect(treasuryResponse.status).toBe(503);
  });

  it("returns 403 from sensitive handlers when a valid JWT lacks the route scope", async () => {
    const readOnlyToken = await issueToken(["read:admin", "m2m:internal"]);

    const responses = [
      await postSecrets(bearerRequest("POST", readOnlyToken, { secrets: {} })),
      await getDeploymentBlueprint(bearerRequest("GET", readOnlyToken)),
      await postGovernanceVote(
        bearerRequest("POST", readOnlyToken, { proposalId: "route-test-proposal", fid: 42, choice: "yes" }),
      ),
      await postSettlementEngine(bearerRequest("POST", readOnlyToken, { action: "orchestrate" })),
    ];

    expect(responses.map((response) => response.status)).toEqual([403, 403, 403, 403]);
  });

  it("returns 401 for malformed JWT credentials at the route boundary", async () => {
    const response = await getDeploymentBlueprint(
      new Request("http://localhost/api/deployment/blueprint", {
        headers: { Authorization: "Bearer malformed" },
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("preserves legacy admin-key behavior without JWT configuration", async () => {
    setEnvironment({
      GATEWAY_JWT_SECRET: undefined,
      GATEWAY_JWT_ISSUER: undefined,
      GATEWAY_JWT_AUDIENCE: undefined,
    });

    const response = await getDeploymentBlueprint(
      new Request("http://localhost/api/deployment/blueprint", {
        headers: { "X-Admin-API-Key": "route-admin-key" },
      }),
    );

    expect(response.status).toBe(200);
  });

  it("does not fall back to a valid legacy key when Bearer authentication is invalid", async () => {
    const rawToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature";
    const response = await getDeploymentBlueprint(
      new Request("http://localhost/api/deployment/blueprint", {
        headers: {
          Authorization: `Bearer ${rawToken}`,
          "X-Admin-API-Key": "route-admin-key",
        },
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("rejects unknown actions and caller-supplied payment hashes", async () => {
    const treasuryToken = await issueToken(["write:treasury", "m2m:internal"]);

    const unknownAction = await postSettlementEngine(
      bearerRequest("POST", treasuryToken, { action: "unknown-action" }),
    );
    expect(unknownAction.status).toBe(422);
    expect(await unknownAction.json()).toMatchObject({ failure_code: "unknown_action" });

    const callerHash = await postSettlementEngine(
      bearerRequest("POST", treasuryToken, {
        action: "zkcp-finalize",
        id: "route-payment-hash",
        paymentHash: "caller-controlled-txid",
      }),
    );
    expect(callerHash.status).toBe(422);
    expect(await callerHash.json()).toMatchObject({ failure_code: "payment_hash_not_authority" });
  });
});
