import { describe, it, expect, vi } from "vitest";
import { GET } from "../app/api/v1/liquidity/unified/route";

describe("Unified Liquidity API", () => {
  it("should return a unified liquidity object with the expected structure", async () => {
    const response = await GET();
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
