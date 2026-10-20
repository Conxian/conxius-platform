import { describe, expect, it } from "vitest";
import { readRegistrationEvidence, validateRegistrationManifest } from "../lib/provider-registration";

function manifest() {
  return { schema_version: 1, manifest_kind: "adapter_registration", repository: "Conxian/conxian-gateway",
    version: "0.1.5", source: "runtime-adapter-map", trust_root: "bitcoin-l1", scope: "universal-chain", native_conxian_token: false,
    adapters: [{ adapter_id: "evm", runtime_state: "registered", health: "not-observed", production_support: "not-evidenced", qualified_operations: [] as string[] }] };
}

describe("provider registration evidence", () => {
  it("preserves diagnostic counts without qualified operations", () => {
    expect(validateRegistrationManifest(manifest(), "gateway")).toBe(1);
    expect(validateRegistrationManifest({ ...manifest(), adapters: [] }, "gateway")).toBe(0);
  });
  it("rejects architecture, owner, version, and unknown-field drift", () => {
    for (const patch of [{ trust_root: "ethereum" }, { native_conxian_token: true }, { scope: "bitcoin-only" },
      { schema_version: 2 }, { repository: "other/provider" }, { live_connections: 70 }]) {
      expect(() => validateRegistrationManifest({ ...manifest(), ...patch }, "gateway")).toThrow();
    }
  });
  it("rejects healthy or production claims, duplicate IDs, and oversized registries", () => {
    for (const patch of [{ health: "healthy" }, { production_support: "production-supported" }, { qualified_operations: ["sign"] }]) {
      expect(() => validateRegistrationManifest({ ...manifest(), adapters: [{ ...manifest().adapters[0], ...patch }] }, "gateway")).toThrow();
    }
    expect(() => validateRegistrationManifest({ ...manifest(), adapters: [manifest().adapters[0], manifest().adapters[0]] }, "gateway")).toThrow();
    expect(() => validateRegistrationManifest({ ...manifest(), adapters: Array(257).fill(manifest().adapters[0]) }, "gateway")).toThrow();
  });
  it("binds authenticated no-store reads to configured HTTPS endpoints", async () => {
    const fetchImpl: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://gateway.example/api/v1/capabilities");
      expect(init?.cache).toBe("no-store");
      expect(init?.redirect).toBe("error");
      expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer fixture-token");
      return new Response(JSON.stringify(manifest()), { headers: { "content-type": "application/json" } });
    };
    const result = await readRegistrationEvidence("gateway", "https://gateway.example/api/v1", "fixture-token", fetchImpl);
    expect(result.state).toBe("registered");
    expect(result.adapterCount).toBe(1);
    expect(result.qualifiedOperationCount).toBe(0);
    expect(result.productionQualified).toBe(false);
  });
  it("rejects missing config and credential-leaking or insecure URLs before fetching", async () => {
    let called = false;
    const fetchImpl: typeof fetch = async () => { called = true; throw new Error("unexpected fetch"); };
    expect((await readRegistrationEvidence("gateway", undefined, "fixture-token", fetchImpl)).state).toBe("not-configured");
    for (const url of ["http://gateway.example", "https://user:pass@gateway.example", "https://gateway.example/?token=fixture"]) {
      expect((await readRegistrationEvidence("gateway", url, "fixture-token", fetchImpl)).state).toBe("unavailable");
    }
    expect(called).toBe(false);
  });
  it("fails closed on malformed, rejected, and oversized responses", async () => {
    for (const response of [new Response("{}", { status: 401 }), new Response("not-json", { headers: { "content-type": "application/json" } }),
      new Response(" ".repeat(32769), { headers: { "content-type": "application/json" } })]) {
      const fetchImpl: typeof fetch = async () => response;
      const result = await readRegistrationEvidence("gateway", "https://gateway.example", "fixture-token", fetchImpl);
      expect(result.state).toBe("unavailable");
      expect(result.adapterCount).toBeNull();
      expect(result.productionQualified).toBe(false);
    }
  });
});
