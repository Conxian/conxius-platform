import { validateAdminAuth } from "@/lib/support/auth";
import { NextResponse } from "next/server";

interface RevenueSource {
  name: string;
  amount_sats: number;
  percentage: number;
  description: string;
}

interface RewardAllocation {
  category: string;
  amount_sats: number;
  percentage: number;
  description: string;
  operational_units: string[];
}

interface RewardSourcesData {
  total_revenue_sats: number;
  revenue_sources: RevenueSource[];
  allocation: RewardAllocation[];
  treasury_reserve_sats: number;
  treasury_reserve_pct: number;
  last_updated: string;
  period: string;
  sfo_address: string;
}

function buildRewardSources(): RewardSourcesData {
  const sources: RevenueSource[] = [
    {
      name: "Protocol Fees",
      amount_sats: 2_850_000_000,
      percentage: 38,
      description: "1% non-negotiable fee on all protocol-settled transactions and liquidity operations",
    },
    {
      name: "Staking Yield",
      amount_sats: 2_100_000_000,
      percentage: 28,
      description: "Yield harvested from staked CXD and cross-chain liquidity provisioning",
    },
    {
      name: "Treasury Yield",
      amount_sats: 1_500_000_000,
      percentage: 20,
      description: "Sovereign Yield Index (SYI) returns from BTC-standard reserve management",
    },
    {
      name: "Service Revenue",
      amount_sats: 1_050_000_000,
      percentage: 14,
      description: "Operator and solver service fees from settlement engine and BitVM bridge",
    },
  ];

  const allocation: RewardAllocation[] = [
    {
      category: "Community Rewards",
      amount_sats: 3_000_000_000,
      percentage: 40,
      description: "Contributor compensation, community grants, and ecosystem incentives funded by protocol revenue",
      operational_units: ["Community Grants", "Conxian-Core"],
    },
    {
      category: "Governance Rewards",
      amount_sats: 1_875_000_000,
      percentage: 25,
      description: "Voting incentives, delegation rewards, and steward recognition for protocol governance participation",
      operational_units: ["Core Protocol", "State Indexing"],
    },
    {
      category: "Operational Rewards",
      amount_sats: 1_500_000_000,
      percentage: 20,
      description: "Infrastructure maintenance, security hardening, and core protocol operations",
      operational_units: ["Core Protocol", "Liquidity Desk", "State Indexing"],
    },
    {
      category: "Treasury Reserve",
      amount_sats: 1_125_000_000,
      percentage: 15,
      description: "Sovereign reserve buffer ensuring long-term protocol sustainability and runway",
      operational_units: ["Liquidity Desk"],
    },
  ];

  const totalRevenue = sources.reduce((sum, s) => sum + s.amount_sats, 0);

  return {
    total_revenue_sats: totalRevenue,
    revenue_sources: sources,
    allocation,
    treasury_reserve_sats: 1_125_000_000,
    treasury_reserve_pct: 15,
    last_updated: new Date().toISOString(),
    period: "2026-Q3",
    sfo_address: "sfo.cxd",
  };
}

export async function GET(req: Request) {
  const authError = validateAdminAuth(req);
  if (authError) return authError;

  return NextResponse.json(buildRewardSources());
}
