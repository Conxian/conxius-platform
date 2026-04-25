import type { CartMandate, SidlProposal } from "./types";

export const DEFAULT_SIDL_PROPOSALS: Record<string, SidlProposal> = {
  "conxian-sbtc-yield-policy": {
    id: "conxian-sbtc-yield-policy",
    title: "Conxian sBTC yield policy",
    description: "Reference proposal used by the SIDL vote frame and governance API.",
    status: "open",
    createdAtIso: "2026-04-01T00:00:00.000Z",
    updatedAtIso: "2026-04-01T00:00:00.000Z",
  },
};

export const DEFAULT_CART_MANDATES: Record<string, CartMandate> = {
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
