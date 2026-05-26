import { afterEach, describe, expect, it, vi } from "vitest";
import { checkoutCartX402, getAiAllocation, getUbiIdentity } from "../conxianClient";

const env = {
  CONXIAN_GATEWAY_URL: "http://localhost:8080",
  CONXIAN_SOCIAL_URL: "http://localhost:3002",
};

function mockJsonFetch(payload: unknown, status = 200) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(payload === undefined ? "" : JSON.stringify(payload), {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    })
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("checkoutCartX402", () => {
  it("returns PAYMENT-REQUIRED header on 402 responses", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: false }), {
        status: 402,
        headers: {
          "PAYMENT-REQUIRED": "abc123",
        },
      })
    );

    const res = await checkoutCartX402(env, { id: "sbtc-yield-frame" });

    expect(res.status).toBe(402);
    expect(res.paymentRequired).toBe("abc123");
    expect(res.body).toEqual({ ok: false });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe("getAiAllocation", () => {
  it("accepts a valid allocation payload with normalized profile query", async () => {
    const payload = {
      status: "ok",
      profile: "balanced",
      allocations: [
        { agent: "treasury", weight: 0.6 },
        { agent: "stability", weight: 0.4 },
      ],
      compute_weight: 0.89,
    };

    const fetchSpy = mockJsonFetch(payload, 200);
    const result = await getAiAllocation(env, "  Balanced  ");

    expect(result).toEqual(payload);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]?.[0]).toBe(
      "http://localhost:8080/api/v1/ai/allocation?profile=balanced"
    );
  });

  it("fails clearly when allocation weight is outside bounds", async () => {
    mockJsonFetch(
      {
        status: "ok",
        allocations: [{ agent: "treasury", weight: 1.2 }],
      },
      200
    );

    await expect(getAiAllocation(env, "balanced")).rejects.toThrow(
      /Invalid AI allocation payload/
    );
  });

  it("fails clearly when allocation weights do not sum to 1 within tolerance", async () => {
    mockJsonFetch(
      {
        status: "ok",
        allocations: [
          { agent: "treasury", weight: 0.7 },
          { agent: "stability", weight: 0.4 },
        ],
      },
      200
    );

    await expect(getAiAllocation(env, "balanced")).rejects.toThrow(
      /weights must sum to 1±0\.001/
    );
  });

  it("fails closed for unknown profiles when endpoint returns 4xx", async () => {
    const fetchSpy = mockJsonFetch({ error: "unknown profile" }, 400);

    await expect(getAiAllocation(env, "unknown-profile")).rejects.toThrow(
      /HTTP 400/
    );
    expect(fetchSpy.mock.calls[0]?.[0]).toBe(
      "http://localhost:8080/api/v1/ai/allocation?profile=unknown-profile"
    );
  });
});

describe("getUbiIdentity", () => {
  it("accepts a valid ubi:btc identity hash payload", async () => {
    const payload = {
      identity_hash: "ubi:btc:SP1P72Z3704VXP3R85X60S9H6BA6H4Y9ZAXP0H9Z",
      verified: true,
    };

    const fetchSpy = mockJsonFetch(payload, 200);
    const result = await getUbiIdentity(env, "SP1P72Z3704VXP3R85X60S9H6BA6H4Y9ZAXP0H9Z");

    expect(result).toEqual(payload);
    expect(fetchSpy.mock.calls[0]?.[0]).toBe(
      "http://localhost:8080/api/v1/identity/ubi/SP1P72Z3704VXP3R85X60S9H6BA6H4Y9ZAXP0H9Z"
    );
  });

  it("fails clearly for malformed UBI identity_hash", async () => {
    mockJsonFetch(
      {
        identity_hash: "btc:ubi:SP1P72Z3704VXP3R85X60S9H6BA6H4Y9ZAXP0H9Z",
      },
      200
    );

    await expect(
      getUbiIdentity(env, "SP1P72Z3704VXP3R85X60S9H6BA6H4Y9ZAXP0H9Z")
    ).rejects.toThrow(/identity_hash must match ubi:btc:\{id\}/);
  });
});
