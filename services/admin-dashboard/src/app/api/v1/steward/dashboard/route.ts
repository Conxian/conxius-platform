import { validateAdminAuth } from "@/lib/support/auth";
import { NextResponse } from "next/server";
import { type ContributionData, getContributorLevel } from "@/lib/launch";
import type { PointsData, ReputationData, StakingData, StewardDashboard } from "@/lib/steward/types";

function buildPointsData(): PointsData {
  return {
    total: 12450,
    earned_this_cycle: 875,
    pending: 320,
    claimable: 2140,
    level: "Steward IV",
    multiplier: 1.5,
    last_updated: new Date().toISOString(),
    oracle_address: "points-oracle.cxd",
  };
}

function buildReputationData(): ReputationData {
  return {
    score: 87.4,
    rank: "Gold Steward",
    badges: ["Early Adopter", "Governance Guardian", "Liquidity Provider", "Code Contributor"],
    history: [
      { period: "2026-W24", score: 84.2 },
      { period: "2026-W25", score: 85.8 },
      { period: "2026-W26", score: 87.4 },
    ],
    consensus_weight: 0.034,
    delegated_votes: 12500,
    last_evaluation: new Date().toISOString(),
  };
}

function buildStakingData(): StakingData {
  return {
    cxd_staked: 50000,
    cxd_locked_vesting: 25000,
    yield_apy: 12.4,
    yield_earned: 1830,
    unlock_date: "2026-12-31T00:00:00Z",
    staking_tier: "Platinum",
    rewards_pending: 450,
    contract_address: "cxd-staking.cxd",
  };
}

function buildContributionData(): ContributionData {
  const total_contributions = 47;
  const active_governance_proposals = 3;
  const votes_cast = 28;
  const proposals_created = 5;
  const proposals_passed = 4;
  const last_contribution_date = new Date().toISOString();

  return {
    contributor_level: getContributorLevel({ total_contributions, votes_cast, proposals_passed }),
    total_contributions,
    active_governance_proposals,
    votes_cast,
    proposals_created,
    proposals_passed,
    last_contribution_date,
  };
}

export async function GET(req: Request) {
  const authError = validateAdminAuth(req);
  if (authError) return authError;
  const dashboard: StewardDashboard = {
    points: buildPointsData(),
    reputation: buildReputationData(),
    staking: buildStakingData(),
    contribution: buildContributionData(),
    steward_address: "SP2AQGJQXS0KG3RB6MBK8M9NQPF1WE3N6NNPKF0NE",
  };

  return NextResponse.json(dashboard);
}
