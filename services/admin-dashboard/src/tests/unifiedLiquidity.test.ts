import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";

vi.mock("server-only", () => ({}));

import { GET } from "../app/api/v1/liquidity/unified/route";

const MOCK_API_KEY = "test-api-key-unified";

describe("Unified Liquidity API", () => {
  beforeAll(() => {
    process.env.ADMIN_DASHBOARD_API_KEY = MOCK_API_KEY;
  });

  afterAll(() => {
    delete process.env.ADMIN_DASHBOARD_API_KEY;
  });

  it("should return a unified liquidity object with the expected structure", async () => {
    const request = new Request("http://localhost/api/v1/liquidity/unified", {
      headers: { "X-Admin-API-Key": MOCK_API_KEY },
    });
    const response = await GET(request);
    const data = await response.json();

    expect(data).toHaveProperty("total_liquidity_usd");
    expect(data).toHaveProperty("layers");
    expect(data.layers).toBeInstanceOf(Array);
    expect(data.layers.length).toBeGreaterThan(0);

    const bitcoinLayer = data.layers.find((l: any) => l.id === "bitcoin-l1");
    expect(bitcoinLayer).toBeDefined();
    expect(bitcoinLayer.assets[0].symbol).toBe("BTC");
  });
});
