import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { GET as getHealth } from "../app/api/health/route";
import {
  getM2MKeyStore,
  getM2MKeyStoreReadiness,
  resetM2MKeyStoreForTests,
} from "../lib/support/m2mKeyStore";
import { resetSidlMetricsForTests } from "../lib/sidl/observability";

const serviceKeyNames = [
  "SERVICE_KEY_GATEWAY",
  "SERVICE_KEY_ELIZAOS",
  "SERVICE_KEY_NEXUS",
  "SERVICE_KEY_ORBIT",
  "SERVICE_KEY_WALLET",
  "SERVICE_KEY_UI",
  "SERVICE_KEY_ADMIN_DASHBOARD",
  "SERVICE_KEY_PULSE_BOS",
] as const;

const originalEnvironment: Record<string, string | undefined> = {};
const tempDirectories: string[] = [];
const mutableEnvironment = process.env as Record<string, string | undefined>;

beforeEach(() => {
  for (const name of ["NODE_ENV", "M2M_SERVICE_KEY_REGISTRY_PATH", ...serviceKeyNames]) {
    originalEnvironment[name] = process.env[name];
  }
  mutableEnvironment.NODE_ENV = "test";
  delete process.env.M2M_SERVICE_KEY_REGISTRY_PATH;
  for (const name of serviceKeyNames) delete process.env[name];
  resetM2MKeyStoreForTests();
  resetSidlMetricsForTests();
});

afterEach(() => {
  mutableEnvironment.NODE_ENV = "test";
  resetM2MKeyStoreForTests();
  resetSidlMetricsForTests();
  for (const [name, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
    delete originalEnvironment[name];
  }
  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function registryPath(prefix: string): string {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  tempDirectories.push(directory);
  const path = join(directory, "registry.json");
  process.env.M2M_SERVICE_KEY_REGISTRY_PATH = path;
  return path;
}

describe("M2M registry health readiness", () => {
  it("reports a healthy valid-empty registry without exposing readiness details", async () => {
    registryPath("conxian-health-empty-");

    const response = await getHealth();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "healthy" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(getM2MKeyStoreReadiness()).toEqual({ status: "healthy", state: "valid-empty" });
  });

  it("returns 503 when production registry configuration is missing", async () => {
    mutableEnvironment.NODE_ENV = "production";
    delete process.env.M2M_SERVICE_KEY_REGISTRY_PATH;

    const response = await getHealth();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "unhealthy" });
    expect(getM2MKeyStoreReadiness()).toEqual({ status: "unavailable", state: "unavailable" });
  });

  it("returns 503 for malformed production registry state", async () => {
    const path = registryPath("conxian-health-malformed-");
    mutableEnvironment.NODE_ENV = "production";
    writeFileSync(path, "{not-json}\n", { mode: 0o600 });
    chmodSync(path, 0o600);

    const response = await getHealth();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "unhealthy" });
    expect(getM2MKeyStoreReadiness()).toEqual({ status: "unavailable", state: "unavailable" });
  });

  it("returns 503 after recovery evidence latches the store", async () => {
    const path = registryPath("conxian-health-recovery-");
    const store = getM2MKeyStore();
    store.listMetadata("health_bootstrap");
    const document = JSON.parse(readFileSync(path, "utf8")) as {
      lastCommitId: string;
    };
    const markerCommitId = "commit_00000000-0000-0000-0000-000000000000";
    const marker = {
      schemaVersion: 1,
      commitId: markerCommitId,
      revision: 2,
      predecessorRevision: 1,
      predecessorLastCommitId: document.lastCommitId,
      candidateFile: `registry.json.${markerCommitId}.candidate`,
      journalFile: `registry.json.${markerCommitId}.journal`,
    };
    writeFileSync(`${path}.marker`, `${JSON.stringify(marker)}\n`, { mode: 0o600 });
    chmodSync(`${path}.marker`, 0o600);

    expect(() => store.listMetadata("health_recovery_latch")).toThrow();
    expect(getM2MKeyStoreReadiness()).toEqual({ status: "unavailable", state: "recovery-latched" });

    const response = await getHealth();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "unhealthy" });
  });
});
