import { describe, expect, it, vi } from "vitest";
import { checkoutCartX402 } from "../conxianClient";

describe("checkoutCartX402", () => {
  it("returns PAYMENT-REQUIRED header on 402 responses", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: false }), {
          status: 402,
          headers: {
            "PAYMENT-REQUIRED": "abc123",
          },
        })
      );

    const res = await checkoutCartX402(
      { CONXIAN_GATEWAY_URL: "http://localhost:8080", CONXIAN_SOCIAL_URL: "http://localhost:3002" },
      { id: "sbtc-yield-frame" }
    );

    expect(res.status).toBe(402);
    expect(res.paymentRequired).toBe("abc123");
    expect(res.body).toEqual({ ok: false });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
