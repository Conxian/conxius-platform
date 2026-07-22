import { spawn } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST as postRotate } from "../app/api/v1/m2m/service-keys/[serviceId]/rotate/route";
import { POST as postRollback } from "../app/api/v1/m2m/service-keys/[serviceId]/rollback/route";
import { GET as getMetadata } from "../app/api/v1/m2m/service-keys/route";
import {
  FileM2MKeyStore,
  resetM2MKeyStoreForTests,
} from "../lib/support/m2mKeyStore";
import {
  M2MKeyStoreError,
  type M2MRegistryCommitMarker,
  type M2MRegistryDocument,
} from "../lib/support/m2mKeyTypes";
import {
  recordM2MRegistryState,
  recordM2MRegistryUnavailable,
  resetSidlMetricsForTests,
  sidlMetricsSnapshot,
} from "../lib/sidl/observability";

const fixedNow = new Date("2026-07-22T14:00:00.000Z");
const tempDirectories: string[] = [];

beforeEach(() => {
  resetM2MKeyStoreForTests();
  resetSidlMetricsForTests();
});

function makeStore(environment: Partial<NodeJS.ProcessEnv> = {}): FileM2MKeyStore {
  const directory = mkdtempSync(join(tmpdir(), "conxian-m2m-"));
  tempDirectories.push(directory);
  return new FileM2MKeyStore({
    registryPath: join(directory, "registry.json"),
    environment: { ...process.env, NODE_ENV: "test", ...environment },
    now: () => new Date(fixedNow),
  });
}

function makeStoreWithClock(
  clock: { current: Date },
  environment: Partial<NodeJS.ProcessEnv> = {},
): FileM2MKeyStore {
  const directory = mkdtempSync(join(tmpdir(), "conxian-m2m-clock-"));
  tempDirectories.push(directory);
  return new FileM2MKeyStore({
    registryPath: join(directory, "registry.json"),
    environment: { ...process.env, NODE_ENV: "test", ...environment },
    now: () => new Date(clock.current),
  });
}

function readRegistry(store: FileM2MKeyStore): M2MRegistryDocument {
  return JSON.parse(readFileSync(store.getPath(), "utf8")) as M2MRegistryDocument;
}

function writePrivateJson(filePath: string, value: unknown): void {
  writeFileSync(filePath, `${JSON.stringify(value)}\n`, { mode: 0o600 });
  chmodSync(filePath, 0o600);
}

function markerFor(
  store: FileM2MKeyStore,
  document: M2MRegistryDocument,
  predecessor: M2MRegistryDocument | null,
): M2MRegistryCommitMarker {
  const registryName = basename(store.getPath());
  return {
    schemaVersion: 1,
    commitId: document.lastCommitId,
    revision: document.revision,
    predecessorRevision: predecessor?.revision ?? 0,
    predecessorLastCommitId: predecessor?.lastCommitId ?? null,
    candidateFile: `${registryName}.${document.lastCommitId}.candidate`,
    journalFile: `${registryName}.${document.lastCommitId}.journal`,
  };
}

function writeMarker(
  store: FileM2MKeyStore,
  marker: M2MRegistryCommitMarker,
): void {
  writePrivateJson(`${store.getPath()}.marker`, marker);
}

function writeRecoveryArtifact(
  store: FileM2MKeyStore,
  fileName: string,
  document: M2MRegistryDocument,
): void {
  writePrivateJson(join(dirname(store.getPath()), fileName), document);
}

type ChildRotationResult = {
  outcome: "success" | "error";
  generation?: number;
  code?: string;
};

function runRotationChild(registryPath: string): Promise<ChildRotationResult> {
  const script = `
    import { FileM2MKeyStore } from "./src/lib/support/m2mKeyStore.ts";
    const store = new FileM2MKeyStore({
      registryPath: process.env.M2M_RACE_REGISTRY_PATH,
      environment: { ...process.env, NODE_ENV: "test", SERVICE_KEY_GATEWAY: "race-bootstrap" },
      now: () => new Date("2026-07-22T14:00:00.000Z"),
    });
    try {
      const result = store.rotate({
        serviceId: "gateway",
        expectedGeneration: 1,
        context: { requestId: "race-child" },
      });
      console.log(JSON.stringify({ outcome: "success", generation: result.generation }));
    } catch (error) {
      console.log(JSON.stringify({ outcome: "error", code: error?.code ?? "unknown" }));
    }
  `;

  return new Promise((resolve, reject) => {
    const child = spawn("pnpm", ["exec", "tsx", "--eval", script], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        M2M_RACE_REGISTRY_PATH: registryPath,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (exitCode) => {
      if (exitCode !== 0) {
        reject(new Error(`rotation child failed: ${stderr || stdout}`));
        return;
      }

      const line = stdout.trim().split("\n").at(-1);
      if (!line) {
        reject(new Error(`rotation child produced no result: ${stderr}`));
        return;
      }
      resolve(JSON.parse(line) as ChildRotationResult);
    });
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

  it("enforces exact active/previous expiry boundaries and caps grace at the earlier expiry", () => {
    const clock = { current: new Date(fixedNow) };
    const store = makeStoreWithClock(clock, { SERVICE_KEY_GATEWAY: "gateway-bootstrap" });
    const activeExpiresAt = new Date(fixedNow.getTime() + 600_000).toISOString();
    const rotation = store.rotate({
      serviceId: "gateway",
      expectedGeneration: 1,
      gracePeriodSeconds: 300,
      expiresAt: activeExpiresAt,
      context: { requestId: "req_boundary" },
    });

    clock.current = new Date(fixedNow.getTime() + 299_999);
    expect(store.validateServiceSecret("gateway", "gateway-bootstrap").valid).toBe(true);
    expect(store.validateServiceSecret("gateway", rotation.secret).valid).toBe(true);

    clock.current = new Date(fixedNow.getTime() + 300_000);
    expect(store.validateServiceSecret("gateway", "gateway-bootstrap").valid).toBe(false);
    expect(store.validateServiceSecret("gateway", rotation.secret).valid).toBe(true);

    clock.current = new Date(fixedNow.getTime() + 599_999);
    expect(store.validateServiceSecret("gateway", rotation.secret).valid).toBe(true);
    clock.current = new Date(fixedNow.getTime() + 600_000);
    expect(store.validateServiceSecret("gateway", rotation.secret).valid).toBe(false);

    const cappedClock = { current: new Date(fixedNow) };
    const capped = makeStoreWithClock(cappedClock, { SERVICE_KEY_GATEWAY: "oldest-key" });
    const first = capped.rotate({
      serviceId: "gateway",
      expectedGeneration: 1,
      gracePeriodSeconds: 300,
      expiresAt: new Date(fixedNow.getTime() + 120_000).toISOString(),
      context: { requestId: "req_first" },
    });
    const second = capped.rotate({
      serviceId: "gateway",
      expectedGeneration: 2,
      gracePeriodSeconds: 300,
      context: { requestId: "req_second" },
    });

    expect(second.previousGraceUntil).toBe(new Date(fixedNow.getTime() + 120_000).toISOString());
    expect(capped.validateServiceSecret("gateway", "oldest-key").valid).toBe(false);
    expect(capped.validateServiceSecret("gateway", first.secret).valid).toBe(true);
    expect(capped.validateServiceSecret("gateway", second.secret).valid).toBe(true);
  });

  it("caps rollback expiry, rejects the exact window boundary, and never repeats a rollback", () => {
    const expiredClock = { current: new Date(fixedNow) };
    const expiredStore = makeStoreWithClock(expiredClock, { SERVICE_KEY_GATEWAY: "expired-target" });
    expiredStore.rotate({
      serviceId: "gateway",
      expectedGeneration: 1,
      gracePeriodSeconds: 300,
      context: { requestId: "req_expired_rotation" },
    });
    expiredClock.current = new Date(fixedNow.getTime() + 300_000);
    expect(() =>
      expiredStore.rollback({
        serviceId: "gateway",
        expectedGeneration: 2,
        targetGeneration: 1,
        reason: "window closed",
        context: { requestId: "req_expired_rollback" },
      }),
    ).toThrowError(/Rollback window has expired/);

    const clock = { current: new Date(fixedNow) };
    const store = makeStoreWithClock(clock, { SERVICE_KEY_GATEWAY: "rollback-target" });
    const rotation = store.rotate({
      serviceId: "gateway",
      expectedGeneration: 1,
      gracePeriodSeconds: 300,
      context: { requestId: "req_rotation" },
    });
    const rollback = store.rollback({
      serviceId: "gateway",
      expectedGeneration: 2,
      targetGeneration: 1,
      reason: "lost response",
      context: { requestId: "req_rollback" },
    });

    expect(rollback.activeExpiresAt).toBe(new Date(fixedNow.getTime() + 300_000).toISOString());
    expect(store.validateServiceSecret("gateway", "rollback-target").valid).toBe(true);
    expect(store.validateServiceSecret("gateway", rotation.secret).valid).toBe(false);

    clock.current = new Date(fixedNow.getTime() + 300_000);
    expect(store.validateServiceSecret("gateway", "rollback-target").valid).toBe(false);
    expect(() =>
      store.rollback({
        serviceId: "gateway",
        expectedGeneration: 3,
        targetGeneration: 1,
        reason: "window closed",
        context: { requestId: "req_expired_rollback" },
      }),
    ).toThrowError(/Rollback target is not the current previous generation/);

    expect(() =>
      store.rollback({
        serviceId: "gateway",
        expectedGeneration: 2,
        targetGeneration: 1,
        reason: "duplicate rollback",
        context: { requestId: "req_duplicate_rollback" },
      }),
    ).toThrowError(/generation precondition failed/);
  });

  it("fails closed on malformed and incompatible registries without environment fallback", () => {
    const payloads = ["not-json", JSON.stringify({ schemaVersion: 99 })];

    for (const payload of payloads) {
      const directory = mkdtempSync(join(tmpdir(), "conxian-m2m-malformed-"));
      tempDirectories.push(directory);
      const registryPath = join(directory, "registry.json");
      writeFileSync(registryPath, payload, "utf8");
      chmodSync(registryPath, 0o600);

      const store = new FileM2MKeyStore({
        registryPath,
        environment: {
          ...process.env,
          NODE_ENV: "test",
          SERVICE_KEY_GATEWAY: "must-not-fallback",
        },
        now: () => new Date(fixedNow),
      });

      let caught: unknown;
      try {
        store.validateServiceSecret("gateway", "must-not-fallback");
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(M2MKeyStoreError);
      expect((caught as M2MKeyStoreError).code).toBe("m2m_registry_unavailable");
    }

    return sidlMetricsSnapshot().then((snapshot) => {
      expect(snapshot).toMatch(/m2m_service_key_registry_write_failures_total/);
      expect(snapshot).not.toContain("must-not-fallback");
    });
  });

  it("fails closed when a commit marker has no matching recovery artifacts", () => {
    const store = makeStore({ SERVICE_KEY_GATEWAY: "marker-bootstrap" });
    store.listMetadata("req_marker_bootstrap");
    const markerCommitId = "commit_00000000-0000-0000-0000-000000000000";
    const marker = {
      schemaVersion: 1,
      commitId: markerCommitId,
      revision: 2,
      predecessorRevision: 1,
      predecessorLastCommitId: (JSON.parse(readFileSync(store.getPath(), "utf8")) as {
        lastCommitId: string;
      }).lastCommitId,
      candidateFile: `registry.json.${markerCommitId}.candidate`,
      journalFile: `registry.json.${markerCommitId}.journal`,
    };
    const markerPath = `${store.getPath()}.marker`;
    writeFileSync(markerPath, `${JSON.stringify(marker)}\n`, "utf8");
    chmodSync(markerPath, 0o600);

    const restarted = new FileM2MKeyStore({
      registryPath: store.getPath(),
      environment: { ...process.env, NODE_ENV: "test", SERVICE_KEY_GATEWAY: "must-not-fallback" },
      now: () => new Date(fixedNow),
    });
    let caught: unknown;
    try {
      restarted.validateServiceSecret("gateway", "marker-bootstrap");
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(M2MKeyStoreError);
    expect((caught as M2MKeyStoreError).code).toBe("m2m_registry_unavailable");
  });

  it("does not publish a registry revision before readiness and clears it on failure", async () => {
    let snapshot = await sidlMetricsSnapshot();
    expect(snapshot).toMatch(/m2m_service_key_registry_ready 0/);
    expect(snapshot).not.toContain("m2m_service_key_registry_revision");

    recordM2MRegistryState(1, []);
    snapshot = await sidlMetricsSnapshot();
    expect(snapshot).toMatch(/m2m_service_key_registry_ready 1/);
    expect(snapshot).toMatch(/m2m_service_key_registry_revision 1/);

    recordM2MRegistryUnavailable();
    snapshot = await sidlMetricsSnapshot();
    expect(snapshot).toMatch(/m2m_service_key_registry_ready 0/);
    expect(snapshot).not.toContain("m2m_service_key_registry_revision");
  });

  it("latches when active marker state has no matching journal", () => {
    const store = makeStore({ SERVICE_KEY_GATEWAY: "active-marker-bootstrap" });
    store.listMetadata("req_active_marker_bootstrap");
    const predecessor = readRegistry(store);
    store.rotate({
      serviceId: "gateway",
      expectedGeneration: 1,
      context: { requestId: "req_active_marker_rotate" },
    });
    const committed = readRegistry(store);
    const marker = markerFor(store, committed, predecessor);
    writeMarker(store, marker);

    const restarted = new FileM2MKeyStore({
      registryPath: store.getPath(),
      environment: { ...process.env, NODE_ENV: "test", SERVICE_KEY_GATEWAY: "must-not-fallback" },
      now: () => new Date(fixedNow),
    });

    expect(() => restarted.listMetadata("req_active_marker_recovery")).toThrow(M2MKeyStoreError);
    expect(restarted.readiness()).toEqual({ status: "unavailable", state: "recovery-latched" });
    expect(readFileSync(`${store.getPath()}.marker`, "utf8")).toContain(marker.commitId);
  });

  it("latches when the recovery journal does not match the marker document", () => {
    const store = makeStore({ SERVICE_KEY_GATEWAY: "mismatched-journal-bootstrap" });
    store.listMetadata("req_mismatched_journal_bootstrap");
    const predecessor = readRegistry(store);
    store.rotate({
      serviceId: "gateway",
      expectedGeneration: 1,
      context: { requestId: "req_mismatched_journal_rotate" },
    });
    const committed = readRegistry(store);
    const marker = markerFor(store, committed, predecessor);
    writeMarker(store, marker);
    writeRecoveryArtifact(store, marker.journalFile, predecessor);

    const restarted = new FileM2MKeyStore({
      registryPath: store.getPath(),
      environment: { ...process.env, NODE_ENV: "test", SERVICE_KEY_GATEWAY: "must-not-fallback" },
      now: () => new Date(fixedNow),
    });

    expect(() => restarted.listMetadata("req_mismatched_journal_recovery")).toThrow(M2MKeyStoreError);
    expect(restarted.readiness()).toEqual({ status: "unavailable", state: "recovery-latched" });
    expect(readFileSync(join(dirname(store.getPath()), marker.journalFile), "utf8")).not.toContain(
      committed.lastCommitId,
    );
  });

  it("latches when a predecessor-qualified marker has no candidate artifact", () => {
    const store = makeStore({ SERVICE_KEY_GATEWAY: "missing-candidate-bootstrap" });
    store.listMetadata("req_missing_candidate_bootstrap");
    const predecessor = readRegistry(store);
    store.rotate({
      serviceId: "gateway",
      expectedGeneration: 1,
      context: { requestId: "req_missing_candidate_rotate" },
    });
    const committed = readRegistry(store);
    const marker = markerFor(store, committed, predecessor);
    writeMarker(store, marker);
    writeRecoveryArtifact(store, marker.journalFile, committed);
    writePrivateJson(store.getPath(), predecessor);

    const restarted = new FileM2MKeyStore({
      registryPath: store.getPath(),
      environment: { ...process.env, NODE_ENV: "test", SERVICE_KEY_GATEWAY: "must-not-fallback" },
      now: () => new Date(fixedNow),
    });

    expect(() => restarted.listMetadata("req_missing_candidate_recovery")).toThrow(M2MKeyStoreError);
    expect(restarted.readiness()).toEqual({ status: "unavailable", state: "recovery-latched" });
    expect(readFileSync(`${store.getPath()}.marker`, "utf8")).toContain(marker.commitId);
  });

  it("latches when candidate and journal lack the marker mutation audit evidence", () => {
    const store = makeStore({ SERVICE_KEY_GATEWAY: "unrelated-audit-bootstrap" });
    store.listMetadata("req_unrelated_audit_bootstrap");
    const predecessor = readRegistry(store);
    store.rotate({
      serviceId: "gateway",
      expectedGeneration: 1,
      context: { requestId: "req_unrelated_audit_rotate" },
    });
    const committed = readRegistry(store);
    const marker = markerFor(store, committed, predecessor);
    const unrelated = JSON.parse(JSON.stringify(committed)) as M2MRegistryDocument;
    unrelated.auditEvents = unrelated.auditEvents.map((event) =>
      event.commitId === committed.lastCommitId && event.eventType === "SERVICE_KEY_ROTATED"
        ? { ...event, commitId: predecessor.lastCommitId }
        : event,
    );
    writeMarker(store, marker);
    writeRecoveryArtifact(store, marker.candidateFile, unrelated);
    writeRecoveryArtifact(store, marker.journalFile, unrelated);

    const restarted = new FileM2MKeyStore({
      registryPath: store.getPath(),
      environment: { ...process.env, NODE_ENV: "test", SERVICE_KEY_GATEWAY: "must-not-fallback" },
      now: () => new Date(fixedNow),
    });

    expect(() => restarted.listMetadata("req_unrelated_audit_recovery")).toThrow(M2MKeyStoreError);
    expect(restarted.readiness()).toEqual({ status: "unavailable", state: "recovery-latched" });
    expect(readFileSync(join(dirname(store.getPath()), marker.candidateFile), "utf8")).toContain(
      marker.commitId,
    );
  });

  it("recovers initial bootstrap documents with multiple matching bootstrap events", () => {
    const store = makeStore({
      SERVICE_KEY_GATEWAY: "initial-recovery-gateway",
      SERVICE_KEY_ADMIN_DASHBOARD: "initial-recovery-dashboard",
    });
    store.listMetadata("req_initial_recovery_bootstrap");
    const initial = readRegistry(store);
    const marker = markerFor(store, initial, null);
    rmSync(store.getPath(), { force: true });
    writeMarker(store, marker);
    writeRecoveryArtifact(store, marker.candidateFile, initial);
    writeRecoveryArtifact(store, marker.journalFile, initial);

    const restarted = new FileM2MKeyStore({
      registryPath: store.getPath(),
      environment: { ...process.env, NODE_ENV: "test", SERVICE_KEY_GATEWAY: "must-not-fallback" },
      now: () => new Date(fixedNow),
    });

    expect(restarted.listMetadata("req_initial_recovery_complete").revision).toBe(2);
    const recovered = readRegistry(restarted);
    expect(recovered.auditEvents.some(
      (event) =>
        event.eventType === "SERVICE_KEY_REGISTRY_RECOVERED" &&
        event.recoveredCommitId === initial.lastCommitId,
    )).toBe(true);
  });

  it("completes valid post-rename recovery with a mandatory journal", () => {
    const store = makeStore({ SERVICE_KEY_GATEWAY: "post-rename-bootstrap" });
    store.listMetadata("req_post_rename_bootstrap");
    const predecessor = readRegistry(store);
    store.rotate({
      serviceId: "gateway",
      expectedGeneration: 1,
      context: { requestId: "req_post_rename_rotate" },
    });
    const committed = readRegistry(store);
    const marker = markerFor(store, committed, predecessor);
    writeMarker(store, marker);
    writeRecoveryArtifact(store, marker.journalFile, committed);

    const restarted = new FileM2MKeyStore({
      registryPath: store.getPath(),
      environment: { ...process.env, NODE_ENV: "test", SERVICE_KEY_GATEWAY: "must-not-fallback" },
      now: () => new Date(fixedNow),
    });

    expect(restarted.readiness()).toEqual({ status: "healthy", state: "ready" });
    const recovered = readRegistry(restarted);
    expect(recovered.revision).toBe(3);
    expect(recovered.auditEvents.some(
      (event) =>
        event.eventType === "SERVICE_KEY_REGISTRY_RECOVERED" &&
        event.recoveredCommitId === committed.lastCommitId,
    )).toBe(true);
    expect(() => readFileSync(`${store.getPath()}.marker`)).toThrow();
  });

  it("cleans a marker left after the recovery event without appending again", () => {
    const store = makeStore({ SERVICE_KEY_GATEWAY: "recovery-event-bootstrap" });
    store.listMetadata("req_recovery_event_bootstrap");
    const predecessor = readRegistry(store);
    store.rotate({
      serviceId: "gateway",
      expectedGeneration: 1,
      context: { requestId: "req_recovery_event_rotate" },
    });
    const committed = readRegistry(store);
    const recoveryCommitId = "commit_00000000-0000-0000-0000-000000000001";
    const service = committed.services.gateway!;
    const recoveryDocument = JSON.parse(JSON.stringify(committed)) as M2MRegistryDocument;
    recoveryDocument.revision = 3;
    recoveryDocument.lastCommitId = recoveryCommitId;
    recoveryDocument.auditEvents.push({
      eventId: "event_recovery_marker",
      eventType: "SERVICE_KEY_REGISTRY_RECOVERED",
      commitId: recoveryCommitId,
      recoveredCommitId: committed.lastCommitId,
      serviceId: "gateway",
      generation: service.generation,
      previousGeneration: service.previous?.generation ?? null,
      registryRevision: 3,
      actor: "system",
      requestId: "req_recovery_event_commit",
      occurredAt: fixedNow.toISOString(),
    });
    writePrivateJson(store.getPath(), recoveryDocument);
    const marker = markerFor(store, recoveryDocument, committed);
    writeMarker(store, marker);
    writeRecoveryArtifact(store, marker.journalFile, recoveryDocument);

    const restarted = new FileM2MKeyStore({
      registryPath: store.getPath(),
      environment: { ...process.env, NODE_ENV: "test", SERVICE_KEY_GATEWAY: "must-not-fallback" },
      now: () => new Date(fixedNow),
    });

    expect(restarted.readiness()).toEqual({ status: "healthy", state: "ready" });
    const persisted = readRegistry(restarted);
    expect(persisted.revision).toBe(3);
    expect(persisted.auditEvents.filter(
      (event) => event.eventType === "SERVICE_KEY_REGISTRY_RECOVERED",
    )).toHaveLength(1);
    expect(() => readFileSync(`${store.getPath()}.marker`)).toThrow();
  });

  it("returns sanitized rotation route errors with no-store and request identity", async () => {
    const directory = mkdtempSync(join(tmpdir(), "conxian-m2m-route-errors-"));
    tempDirectories.push(directory);
    const previousEnvironment = {
      ADMIN_DASHBOARD_API_KEY: process.env.ADMIN_DASHBOARD_API_KEY,
      M2M_SERVICE_KEY_REGISTRY_PATH: process.env.M2M_SERVICE_KEY_REGISTRY_PATH,
      SERVICE_KEY_GATEWAY: process.env.SERVICE_KEY_GATEWAY,
    };
    process.env.ADMIN_DASHBOARD_API_KEY = "admin-route-key";
    process.env.M2M_SERVICE_KEY_REGISTRY_PATH = join(directory, "registry.json");
    process.env.SERVICE_KEY_GATEWAY = "route-bootstrap";

    const invoke = async (serviceId: string, body: string | Record<string, unknown>) => {
      const response = await postRotate(
        new Request(`http://localhost/api/v1/m2m/service-keys/${serviceId}/rotate`, {
          method: "POST",
          headers: { "X-Admin-API-Key": "admin-route-key" },
          body: typeof body === "string" ? body : JSON.stringify(body),
        }),
        { params: Promise.resolve({ serviceId }) },
      );
      const parsed = await response.json() as Record<string, unknown>;
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(response.headers.get("X-Request-ID")).toBe(parsed.requestId);
      return { response, parsed };
    };

    try {
      const invalidJson = await invoke("gateway", "{invalid-json");
      expect(invalidJson.response.status).toBe(400);
      expect(invalidJson.parsed.error).toBe("invalid_request");
      expect(JSON.stringify(invalidJson.parsed)).not.toContain("invalid-json");

      const invalidGeneration = await invoke("gateway", { expectedGeneration: 0 });
      expect(invalidGeneration.response.status).toBe(400);
      expect(invalidGeneration.parsed.error).toBe("invalid_generation_precondition");

      const invalidGrace = await invoke("gateway", {
        expectedGeneration: 1,
        gracePeriodSeconds: 299,
      });
      expect(invalidGrace.response.status).toBe(400);
      expect(invalidGrace.parsed.error).toBe("invalid_grace_period");

      const invalidExpiry = await invoke("gateway", {
        expectedGeneration: 1,
        expiresAt: "not-a-timestamp",
      });
      expect(invalidExpiry.response.status).toBe(400);
      expect(invalidExpiry.parsed.error).toBe("invalid_expiry");

      const invalidService = await invoke("external", { expectedGeneration: 1 });
      expect(invalidService.response.status).toBe(404);
      expect(invalidService.parsed.error).toBe("service_not_found");
    } finally {
      for (const [name, value] of Object.entries(previousEnvironment)) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
    }
  });

  it("keeps rollback admin-only, metadata-only, and conflict-safe", async () => {
    const directory = mkdtempSync(join(tmpdir(), "conxian-m2m-rollback-route-"));
    tempDirectories.push(directory);
    const previousEnvironment = {
      ADMIN_DASHBOARD_API_KEY: process.env.ADMIN_DASHBOARD_API_KEY,
      M2M_SERVICE_KEY_REGISTRY_PATH: process.env.M2M_SERVICE_KEY_REGISTRY_PATH,
      SERVICE_KEY_GATEWAY: process.env.SERVICE_KEY_GATEWAY,
    };
    process.env.ADMIN_DASHBOARD_API_KEY = "admin-rollback-key";
    process.env.M2M_SERVICE_KEY_REGISTRY_PATH = join(directory, "registry.json");
    process.env.SERVICE_KEY_GATEWAY = "rollback-route-target";

    try {
      const rotationResponse = await postRotate(
        new Request("http://localhost/api/v1/m2m/service-keys/gateway/rotate", {
          method: "POST",
          headers: { "X-Admin-API-Key": "admin-rollback-key" },
          body: JSON.stringify({ expectedGeneration: 1, gracePeriodSeconds: 300 }),
        }),
        { params: Promise.resolve({ serviceId: "gateway" }) },
      );
      const rotationBody = await rotationResponse.json() as { secret: string };

      const serviceAuthResponse = await postRollback(
        new Request("http://localhost/api/v1/m2m/service-keys/gateway/rollback", {
          method: "POST",
          headers: { "X-Service-Key": "gateway:rollback-route-target" },
          body: JSON.stringify({ expectedGeneration: 2, targetGeneration: 1, reason: "lost response" }),
        }),
        { params: Promise.resolve({ serviceId: "gateway" }) },
      );
      expect(serviceAuthResponse.status).toBe(401);

      const invalidReasonResponse = await postRollback(
        new Request("http://localhost/api/v1/m2m/service-keys/gateway/rollback", {
          method: "POST",
          headers: { "X-Admin-API-Key": "admin-rollback-key" },
          body: JSON.stringify({ expectedGeneration: 2, targetGeneration: 1, reason: "   " }),
        }),
        { params: Promise.resolve({ serviceId: "gateway" }) },
      );
      expect(invalidReasonResponse.status).toBe(400);
      expect((await invalidReasonResponse.json()).error).toBe("invalid_request");

      const rollbackResponse = await postRollback(
        new Request("http://localhost/api/v1/m2m/service-keys/gateway/rollback", {
          method: "POST",
          headers: { "X-Admin-API-Key": "admin-rollback-key" },
          body: JSON.stringify({ expectedGeneration: 2, targetGeneration: 1, reason: "lost response" }),
        }),
        { params: Promise.resolve({ serviceId: "gateway" }) },
      );
      expect(rollbackResponse.status).toBe(200);
      expect(rollbackResponse.headers.get("Cache-Control")).toBe("no-store");
      const rollbackBody = await rollbackResponse.json() as Record<string, unknown>;
      const serialized = JSON.stringify(rollbackBody);
      expect(rollbackBody.generation).toBe(3);
      expect(serialized).not.toContain(rotationBody.secret);
      expect(serialized).not.toMatch(/sha256:[0-9a-f]{64}/);

      const staleResponse = await postRollback(
        new Request("http://localhost/api/v1/m2m/service-keys/gateway/rollback", {
          method: "POST",
          headers: { "X-Admin-API-Key": "admin-rollback-key" },
          body: JSON.stringify({ expectedGeneration: 2, targetGeneration: 1, reason: "retry" }),
        }),
        { params: Promise.resolve({ serviceId: "gateway" }) },
      );
      expect(staleResponse.status).toBe(409);
      expect((await staleResponse.json()).error).toBe("generation_conflict");

      const targetConflictResponse = await postRollback(
        new Request("http://localhost/api/v1/m2m/service-keys/gateway/rollback", {
          method: "POST",
          headers: { "X-Admin-API-Key": "admin-rollback-key" },
          body: JSON.stringify({ expectedGeneration: 3, targetGeneration: 1, reason: "wrong target" }),
        }),
        { params: Promise.resolve({ serviceId: "gateway" }) },
      );
      expect(targetConflictResponse.status).toBe(409);
      expect((await targetConflictResponse.json()).error).toBe("rollback_target_conflict");
    } finally {
      for (const [name, value] of Object.entries(previousEnvironment)) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
    }
  });

  it("persists expiry markers idempotently and exports bounded M2M metrics", async () => {
    const clock = { current: new Date(fixedNow) };
    const store = makeStoreWithClock(clock, { SERVICE_KEY_GATEWAY: "metrics-bootstrap" });
    const rotation = store.rotate({
      serviceId: "gateway",
      expectedGeneration: 1,
      gracePeriodSeconds: 300,
      expiresAt: new Date(fixedNow.getTime() + 3_600_000).toISOString(),
      context: { requestId: "req_metrics_rotation" },
    });
    expect(store.validateServiceSecret("gateway", rotation.secret).valid).toBe(true);
    expect(store.validateServiceSecret("gateway", "not-the-key").valid).toBe(false);

    clock.current = new Date(fixedNow.getTime() + 3_600_000);
    const firstMetadata = store.listMetadata("req_metrics_threshold");
    const secondMetadata = store.listMetadata("req_metrics_threshold_repeat");
    expect(firstMetadata.revision).toBe(3);
    expect(secondMetadata.revision).toBe(3);

    const persisted = JSON.parse(readFileSync(store.getPath(), "utf8")) as {
      auditEvents: Array<{ eventType: string }>;
    };
    const thresholdEvents = persisted.auditEvents.filter(
      (event) => event.eventType === "SERVICE_KEY_EXPIRY_THRESHOLD_CROSSED",
    );
    expect(thresholdEvents).toHaveLength(2);

    const snapshot = await sidlMetricsSnapshot();
    expect(snapshot).toMatch(/m2m_service_key_expiry_timestamp_seconds\{key_role="active",service_id="gateway"\}/);
    expect(snapshot).toMatch(/m2m_service_key_rotation_total\{outcome="success",service_id="gateway"\} 1/);
    expect(snapshot).toMatch(/m2m_service_key_validation_total\{outcome="success",service_id="gateway"\} 1/);
    expect(snapshot).toMatch(/m2m_service_key_validation_total\{outcome="invalid",service_id="gateway"\} 1/);
    expect(snapshot).toMatch(/m2m_service_key_generation\{service_id="gateway"\} 2/);
    expect(snapshot).toMatch(/m2m_service_key_registry_ready 1/);
    expect(snapshot).toMatch(/m2m_service_key_registry_revision 3/);
    expect(snapshot).toMatch(/m2m_service_key_expiry_threshold_total\{key_role="active",service_id="gateway",threshold="expired"\} 1/);
    expect(snapshot).not.toContain(rotation.secret);
    expect(snapshot).not.toMatch(/sha256:[0-9a-f]{64}/);
    expect(snapshot).not.toContain("req_metrics");
  });

  it("serializes same-generation inter-process rotations into one success and one conflict", async () => {
    const directory = mkdtempSync(join(tmpdir(), "conxian-m2m-race-"));
    tempDirectories.push(directory);
    const registryPath = join(directory, "registry.json");
    const results = await Promise.all([
      runRotationChild(registryPath),
      runRotationChild(registryPath),
    ]);

    expect(results.filter((result) => result.outcome === "success")).toHaveLength(1);
    expect(results.filter((result) => result.code === "generation_conflict")).toHaveLength(1);

    const persisted = JSON.parse(readFileSync(registryPath, "utf8")) as {
      revision: number;
      services: Record<string, { generation: number }>;
      auditEvents: Array<{ eventType: string }>;
    };
    expect(persisted.revision).toBe(2);
    expect(persisted.services.gateway?.generation).toBe(2);
    expect(
      persisted.auditEvents.filter((event) => event.eventType === "SERVICE_KEY_ROTATED"),
    ).toHaveLength(1);
  });
});
