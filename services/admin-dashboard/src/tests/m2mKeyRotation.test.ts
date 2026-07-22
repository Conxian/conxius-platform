import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { POST as postRotate } from "../app/api/v1/m2m/service-keys/[serviceId]/rotate/route";
import { GET as getMetadata } from "../app/api/v1/m2m/service-keys/route";
import { FileM2MKeyStore } from "../lib/support/m2mKeyStore";

const fixedNow = new Date("2026-07-22T14:00:00.000Z");
const tempDirectories: string[] = [];

function makeStore(environment: Partial<NodeJS.ProcessEnv> = {}): FileM2MKeyStore {
  const directory = mkdtempSync(join(tmpdir(), "conxian-m2m-"));
  tempDirectories.push(directory);
  return new FileM2MKeyStore({
    registryPath: join(directory, "registry.json"),
    environment: { ...process.env, NODE_ENV: "test", ...environment },
    now: () => new Date(fixedNow),
  });
}

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("M2M service-key rotation runtime", () => {
  it("bootstraps legacy colon-containing secrets and persists hashes only", () => {
    const store = makeStore({
      SERVICE_KEY_GATEWAY: "legacy:opaque:secret",
      SERVICE_KEY_ADMIN_DASHBOARD: "dashboard-service-key",
    });

    const metadata = store.listMetadata("req_bootstrap");
    expect(metadata.revision).toBe(1);
    expect(metadata.services.map((service) => service.serviceId)).toEqual([
      "gateway",
      "admin-dashboard",
    ]);

    const gateway = store.validateServiceSecret("gateway", "legacy:opaque:secret");
    expect(gateway.valid).toBe(true);
    expect(gateway.generation).toBe(1);

    const persisted = readFileSync(store.getPath(), "utf8");
    expect(persisted).not.toContain("legacy:opaque:secret");
    expect(persisted).not.toContain("dashboard-service-key");
    expect(persisted).toMatch(/sha256:[0-9a-f]{64}/);
  });

  it("rotates with a one-time 32-byte base64url secret and rejects stale generations", () => {
    const store = makeStore({ SERVICE_KEY_GATEWAY: "gateway-bootstrap" });

    const result = store.rotate({
      serviceId: "gateway",
      expectedGeneration: 1,
      gracePeriodSeconds: 7200,
      context: { requestId: "req_rotate" },
    });

    expect(Buffer.from(result.secret, "base64url")).toHaveLength(32);
    expect(result.secret).not.toMatch(/[:\s]/);
    expect(store.validateServiceSecret("gateway", result.secret).valid).toBe(true);
    expect(store.validateServiceSecret("gateway", "gateway-bootstrap").valid).toBe(true);

    expect(() =>
      store.rotate({
        serviceId: "gateway",
        expectedGeneration: 1,
        context: { requestId: "req_stale" },
      }),
    ).toThrowError(/generation precondition failed/);

    const metadata = store.listMetadata("req_metadata");
    expect(metadata.revision).toBe(3);
    expect(metadata.services[0]).toMatchObject({
      serviceId: "gateway",
      generation: 2,
      previousGeneration: 1,
      previousState: "grace",
    });

    const persisted = readFileSync(store.getPath(), "utf8");
    expect(persisted).not.toContain(result.secret);
  });

  it("rolls back a lost response without reusing a generation or returning plaintext", () => {
    const store = makeStore({ SERVICE_KEY_GATEWAY: "gateway-bootstrap" });
    const rotation = store.rotate({
      serviceId: "gateway",
      expectedGeneration: 1,
      gracePeriodSeconds: 300,
      context: { requestId: "req_rotate" },
    });

    const rollback = store.rollback({
      serviceId: "gateway",
      expectedGeneration: 2,
      targetGeneration: 1,
      reason: "rotation response was lost",
      context: { requestId: "req_rollback" },
    });

    expect(rollback).toMatchObject({
      generation: 3,
      rollbackOfGeneration: 2,
      rollbackTargetGeneration: 1,
      source: "rollback",
    });
    expect(store.validateServiceSecret("gateway", "gateway-bootstrap").valid).toBe(true);
    expect(store.validateServiceSecret("gateway", rotation.secret).valid).toBe(false);
    expect(() =>
      store.rollback({
        serviceId: "gateway",
        expectedGeneration: 2,
        targetGeneration: 1,
        reason: "duplicate rollback",
        context: { requestId: "req_duplicate" },
      }),
    ).toThrowError(/generation precondition failed/);
  });

  it("keeps the registry authoritative across environment drift and expiry boundaries", () => {
    const directory = mkdtempSync(join(tmpdir(), "conxian-m2m-authority-"));
    tempDirectories.push(directory);
    const registryPath = join(directory, "registry.json");
    let now = new Date(fixedNow);
    const first = new FileM2MKeyStore({
      registryPath,
      environment: { ...process.env, NODE_ENV: "test", SERVICE_KEY_GATEWAY: "original-key" },
      now: () => new Date(now),
    });
    first.rotate({
      serviceId: "gateway",
      expectedGeneration: 1,
      gracePeriodSeconds: 300,
      context: { requestId: "req_rotate" },
    });

    const restarted = new FileM2MKeyStore({
      registryPath,
      environment: { ...process.env, NODE_ENV: "test", SERVICE_KEY_GATEWAY: "drifted-key" },
      now: () => new Date(now),
    });
    expect(restarted.validateServiceSecret("gateway", "original-key").valid).toBe(true);
    expect(restarted.validateServiceSecret("gateway", "drifted-key").valid).toBe(false);

    now = new Date(now.getTime() + 301_000);
    expect(restarted.validateServiceSecret("gateway", "original-key").valid).toBe(false);
    expect(restarted.listMetadata("req_expired").services[0]?.previousState).toBe("expired");
  });

  it("does not import a newly configured service into an existing empty registry", () => {
    const directory = mkdtempSync(join(tmpdir(), "conxian-m2m-empty-"));
    tempDirectories.push(directory);
    const registryPath = join(directory, "registry.json");
    const empty = new FileM2MKeyStore({
      registryPath,
      environment: { ...process.env, NODE_ENV: "test" },
      now: () => new Date(fixedNow),
    });
    expect(empty.listMetadata("req_empty").services).toEqual([]);

    const restarted = new FileM2MKeyStore({
      registryPath,
      environment: { ...process.env, NODE_ENV: "test", SERVICE_KEY_GATEWAY: "late-key" },
      now: () => new Date(fixedNow),
    });
    expect(restarted.listMetadata("req_drift").services).toEqual([]);
    expect(restarted.validateServiceSecret("gateway", "late-key").valid).toBe(false);
  });

  it("requires the admin API key and redacts metadata responses", async () => {
    const directory = mkdtempSync(join(tmpdir(), "conxian-m2m-route-"));
    tempDirectories.push(directory);
    const previousEnvironment = {
      ADMIN_DASHBOARD_API_KEY: process.env.ADMIN_DASHBOARD_API_KEY,
      M2M_SERVICE_KEY_REGISTRY_PATH: process.env.M2M_SERVICE_KEY_REGISTRY_PATH,
      SERVICE_KEY_GATEWAY: process.env.SERVICE_KEY_GATEWAY,
    };
    process.env.ADMIN_DASHBOARD_API_KEY = "admin-api-key";
    process.env.M2M_SERVICE_KEY_REGISTRY_PATH = join(directory, "registry.json");
    process.env.SERVICE_KEY_GATEWAY = "gateway-bootstrap";

    try {
      const serviceRequest = new Request("http://localhost/api/v1/m2m/service-keys/gateway/rotate", {
        method: "POST",
        headers: { "X-Service-Key": "gateway:gateway-bootstrap" },
        body: JSON.stringify({ expectedGeneration: 1 }),
      });
      const serviceResponse = await postRotate(serviceRequest, {
        params: Promise.resolve({ serviceId: "gateway" }),
      });
      expect(serviceResponse.status).toBe(401);
      expect(serviceResponse.headers.get("X-Request-ID")).toMatch(/^req_/);
      expect(serviceResponse.headers.get("Cache-Control")).toBe("no-store");

      const adminRequest = new Request("http://localhost/api/v1/m2m/service-keys/gateway/rotate", {
        method: "POST",
        headers: {
          "X-Admin-API-Key": "admin-api-key",
          "X-Service-Key": "gateway:gateway-bootstrap",
        },
        body: JSON.stringify({ expectedGeneration: 1 }),
      });
      const adminResponse = await postRotate(adminRequest, {
        params: Promise.resolve({ serviceId: "gateway" }),
      });
      expect(adminResponse.status).toBe(201);
      const rotationBody = await adminResponse.json() as { secret: string };
      expect(rotationBody.secret).toBeTruthy();

      const metadataResponse = await getMetadata(
        new Request("http://localhost/api/v1/m2m/service-keys", {
          headers: { "X-Admin-API-Key": "admin-api-key" },
        }),
      );
      expect(metadataResponse.status).toBe(200);
      const metadataBody = await metadataResponse.json() as Record<string, unknown>;
      const serialized = JSON.stringify(metadataBody);
      expect(serialized).not.toContain(rotationBody.secret);
      expect(serialized).not.toMatch(/sha256:[0-9a-f]{64}/);
      expect(metadataResponse.headers.get("Cache-Control")).toBe("no-store");
      expect(metadataResponse.headers.get("X-Request-ID")).toMatch(/^req_/);
    } finally {
      for (const [name, value] of Object.entries(previousEnvironment)) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
    }
  });
});
