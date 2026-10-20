import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { canonicalProviderEnvironment, getLiveProviderStatus } from "../lib/live-provider-status";

beforeEach(() => {
  for (const provider of canonicalProviderEnvironment) {
    for (const key of provider.env) vi.stubEnv(key, "");
  }
  for (const key of ["GATEWAY_API_TOKEN", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]) {
    vi.stubEnv(key, "");
  }
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("provider liveness contract", () => {
  it.each([
    ["Nexus", "NEXUS_URL", "https://nexus.example", "NEXUS_ADMIN_API_TOKEN"],
    ["Nexus", "NEXUS_ADMIN_API_TOKEN", "private-token-value", "NEXUS_URL"],
    ["Upstash", "UPSTASH_KV_KV_REST_API_URL", "https://upstash.example", "UPSTASH_KV_KV_REST_API_TOKEN"],
    ["Upstash", "UPSTASH_KV_KV_REST_API_TOKEN", "private-token-value", "UPSTASH_KV_KV_REST_API_URL"],
    ["Supabase", "SUPABASE_URL", "https://supabase.example", "SUPABASE_ANON_KEY"],
    ["Supabase", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "private-token-value", "SUPABASE_URL"],
  ])("does not request a partially configured %s using only %s", async (name, key, value, missing) => {
    vi.stubEnv(key, value);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const row = (await getLiveProviderStatus()).find((status) => status.name === name)!;
    expect(row).toMatchObject({ state: "degraded", source: "configuration", latencyMs: null });
    expect(row.detail).toContain(missing);
    expect(row.detail).toContain("No probe attempted");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(JSON.stringify(row)).not.toContain(value);
  });

  it("treats whitespace credentials as missing and keeps another provider usable", async () => {
    vi.stubEnv("UPSTASH_KV_KV_REST_API_URL", "https://upstash.example");
    vi.stubEnv("UPSTASH_KV_KV_REST_API_TOKEN", "   ");
    vi.stubEnv("GATEWAY_URL", "https://gateway.example");
    const fetchMock = vi.fn().mockResolvedValue(new Response("private-body"));
    vi.stubGlobal("fetch", fetchMock);
    const rows = await getLiveProviderStatus();
    expect(rows.find((row) => row.name === "Upstash")?.state).toBe("degraded");
    expect(rows.find((row) => row.name === "Gateway")?.state).toBe("reachable");
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("https://gateway.example/api/v1/health", expect.any(Object));
  });

  it.each(["SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"])(
    "accepts the existing Supabase alternative %s and recovers after missing configuration", async (key) => {
      vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.example");
      const fetchMock = vi.fn().mockResolvedValue(new Response("private-body"));
      vi.stubGlobal("fetch", fetchMock);
      expect((await getLiveProviderStatus()).find((row) => row.name === "Supabase")?.state).toBe("degraded");
      expect(fetchMock).not.toHaveBeenCalled();
      vi.stubEnv(key, "private-key-value");
      const row = (await getLiveProviderStatus()).find((status) => status.name === "Supabase")!;
      expect(fetchMock).toHaveBeenCalledExactlyOnceWith("https://supabase.example/rest/v1/", expect.objectContaining({ headers: { apikey: "private-key-value" } }));
      expect(row.state).toBe("reachable");
      expect(row.detail).toContain("qualification not established");
      expect(JSON.stringify(row)).not.toContain("private-");
    },
  );

  it("uses complete Upstash credentials without exposing them", async () => {
    vi.stubEnv("UPSTASH_KV_KV_REST_API_URL", "https://upstash.example");
    vi.stubEnv("UPSTASH_KV_KV_REST_API_TOKEN", "private-token-value");
    const fetchMock = vi.fn().mockResolvedValue(new Response("private-body"));
    vi.stubGlobal("fetch", fetchMock);
    const row = (await getLiveProviderStatus()).find((status) => status.name === "Upstash")!;
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("https://upstash.example/ping", expect.objectContaining({ headers: { Authorization: "Bearer private-token-value" } }));
    expect(row.state).toBe("reachable");
    expect(JSON.stringify(row)).not.toContain("private-");
  });

  it.each(["https://gateway.example", "https://gateway.example/", "https://gateway.example/api/v1/"])(
    "uses the Gateway-owned liveness route for %s", async (base) => {
      vi.stubEnv("GATEWAY_URL", base);
      const response = new Response("private-provider-body");
      const readText = vi.spyOn(response, "text");
      const readJson = vi.spyOn(response, "json");
      const fetchMock = vi.fn().mockResolvedValue(response);
      vi.stubGlobal("fetch", fetchMock);
      const gateway = (await getLiveProviderStatus()).find((row) => row.name === "Gateway")!;
      expect(fetchMock).toHaveBeenCalledExactlyOnceWith("https://gateway.example/api/v1/health", expect.objectContaining({
        method: "GET", cache: "no-store", redirect: "error", signal: expect.any(AbortSignal),
      }));
      expect(gateway.state).toBe("reachable");
      expect(gateway.detail).toContain("qualification not established");
      expect(gateway.registrationDiscovery?.state).toBe("not-configured");
      expect(readText).not.toHaveBeenCalled();
      expect(readJson).not.toHaveBeenCalled();
      expect(JSON.stringify(gateway)).not.toContain("private-provider-body");
    },
  );

  it.each([[302, "unavailable"], [401, "unavailable"], [429, "unavailable"], [503, "degraded"]])(
    "does not classify HTTP %s as reachable", async (status, state) => {
      vi.stubEnv("GATEWAY_URL", "https://gateway.example");
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("private-body", { status: Number(status) })));
      const gateway = (await getLiveProviderStatus()).find((row) => row.name === "Gateway")!;
      expect(gateway.state).toBe(state);
      expect(JSON.stringify(gateway)).not.toContain("private-body");
    },
  );

  it.each(["https://private-value@gateway.example", "https://gateway.example?private-value", "https://gateway.example#private-value", "https://gateway.example/private-value", "file:///private-value"])(
    "rejects ambiguous Gateway base configuration without fetching", async (base) => {
      vi.stubEnv("GATEWAY_URL", base);
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);
      const gateway = (await getLiveProviderStatus()).find((row) => row.name === "Gateway")!;
      expect(gateway.state).toBe("degraded");
      expect(fetchMock).not.toHaveBeenCalled();
      expect(JSON.stringify(gateway)).not.toContain("private-value");
    },
  );

  it("retains missing/configuration-only states without a network result", async () => {
    vi.stubEnv("DATABASE_URL", "private-db-value");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const rows = await getLiveProviderStatus();
    expect(rows.find((row) => row.name === "Gateway")?.state).toBe("not-configured");
    expect(rows.find((row) => row.name === "Neon")?.state).toBe("degraded");
    expect(rows.find((row) => row.name === "Neon")?.source).toBe("configuration");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(JSON.stringify(rows)).not.toContain("private-db-value");
  });

  it.each([new Error("private-error-details"), new DOMException("private-timeout-details", "TimeoutError")])(
    "fails closed on request/timeout errors and recovers on a later probe", async (error) => {
      vi.stubEnv("GATEWAY_URL", "https://gateway.example");
      const fetchMock = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce(new Response("private-recovery-body"));
      vi.stubGlobal("fetch", fetchMock);
      const failed = (await getLiveProviderStatus()).find((row) => row.name === "Gateway")!;
      expect(failed.state).toBe("unavailable");
      expect(JSON.stringify(failed)).not.toContain("private-");
      const recovered = (await getLiveProviderStatus()).find((row) => row.name === "Gateway")!;
      expect(recovered.state).toBe("reachable");
      expect(recovered.detail).toContain("qualification not established");
      expect(JSON.stringify(recovered)).not.toContain("private-recovery-body");
    },
  );
});
