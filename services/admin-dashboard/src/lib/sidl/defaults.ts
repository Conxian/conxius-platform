import type { CartMandate, OperatorEntry, SidlProposal } from "./types";

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

export const DEFAULT_OPERATORS: Record<string, OperatorEntry> = {
  "op-frontend-host-1": {
    id: "op-frontend-host-1",
    name: "Conxian Labs",
    role: "frontend-host",
    service: "Admin Dashboard Hosting",
    description: "Primary frontend host operator responsible for serving the Conxian admin dashboard and Farcaster frame endpoints.",
    recognizedBy: "governance-prop-42",
    recognizedAtIso: "2026-04-01T00:00:00.000Z",
    status: "active",
    contact: "ops@conxian-labs.io",
  },
  "op-delegate-alice": {
    id: "op-delegate-alice",
    name: "Alice (Community Delegate)",
    role: "delegate",
    service: "Governance Delegation",
    description: "Elected community delegate holding 12,500 delegated votes. Represents retail stakers in governance proposals.",
    recognizedBy: "governance-prop-58",
    recognizedAtIso: "2026-05-15T00:00:00.000Z",
    status: "active",
  },
  "op-maintainer-bob": {
    id: "op-maintainer-bob",
    name: "Bob (Core Maintainer)",
    role: "maintainer",
    service: "Conxian Nexus Adapter Maintenance",
    description: "Maintains Citrea and Strata rollup adapters in the conxian-nexus Python package. Reviews and merges adapter PRs.",
    recognizedBy: "governance-prop-71",
    recognizedAtIso: "2026-06-01T00:00:00.000Z",
    status: "active",
    contact: "bob@conxian-dev.io",
  },
  "op-steward-carol": {
    id: "op-steward-carol",
    name: "Carol (Community Steward)",
    role: "steward",
    service: "Community Stewardship & Onboarding",
    description: "Community steward responsible for onboarding new contributors, running contributor calls, and managing the self-launch coordinator program.",
    recognizedBy: "governance-prop-89",
    recognizedAtIso: "2026-06-20T00:00:00.000Z",
    status: "active",
    contact: "carol@conxian-community.io",
  },
};
