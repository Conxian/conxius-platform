import type { CartMandate, X402PaymentRequired } from "./types";

const DEFAULT_PAY_TO = "0xABCDEF1234567890ABCDEF1234567890ABCDEF12";
const DEFAULT_USDC = "0xA0b86991C6218b36c1d19D4a2e9Eb0cE3606EB48";
const DEFAULT_NETWORK = "base-mainnet";

const CART_MANDATES: Record<string, CartMandate> = {
  "sbtc-yield-frame": {
    id: "sbtc-yield-frame",
    title: "SIDL: sBTC yield frame unlock",
    items: [
      {
        sku: "sbtc-frame-unlock-24h",
        name: "sBTC yield monitoring unlock (24h)",
        quantity: 1,
        unitUsd: "0.10",
      },
    ],
    totalUsd: "0.10",
    createdAtIso: "2026-04-01T00:00:00.000Z",
  },
};

export function getCartMandate(id: string): CartMandate | null {
  const mandate = CART_MANDATES[id];
  if (!mandate) return null;

  return {
    ...mandate,
    items: mandate.items.map((i) => ({ ...i })),
  };
}

export function toX402PaymentRequired(input: {
  mandate: CartMandate;
  resource: string;
}): X402PaymentRequired {
  return {
    maxAmountRequired: input.mandate.totalUsd,
    resource: input.resource,
    description: `Checkout required for: ${input.mandate.title}`,
    payTo: DEFAULT_PAY_TO,
    asset: DEFAULT_USDC,
    network: DEFAULT_NETWORK,
  };
}
