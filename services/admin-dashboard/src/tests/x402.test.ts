import { describe, expect, it } from "vitest";
import { decodePaymentRequiredHeader, encodePaymentRequiredHeader } from "@/lib/sidl/x402";

describe("x402", () => {
  it("roundtrips PAYMENT-REQUIRED payload", () => {
    const payload = {
      maxAmountRequired: "0.10",
      resource: "/api/cart/mandates/sbtc-yield-frame/checkout",
      description: "test",
      payTo: "0xabc",
      asset: "usdc",
      network: "base-mainnet",
    };

    const encoded = encodePaymentRequiredHeader(payload);
    const decoded = decodePaymentRequiredHeader(encoded);
    expect(decoded).toEqual(payload);
  });
});
