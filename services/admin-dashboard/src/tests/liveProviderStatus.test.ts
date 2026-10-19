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
