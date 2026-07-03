import { NextResponse } from "next/server";
import { getContributorLevel } from "@/lib/contracts/self-launch";

interface PointsData {
  total: number;
  earned_this_cycle: number;
  pending: number;
  claimable: number;
  level: string;
  multiplier: number;
  last_updated: string;
  oracle_address: string;
}

interface ReputationData {
  score: number;
  rank: string;
  badges: string[];
  history: { period: string; score: number }[];
  consensus_weight: number;
  delegated_votes: number;
  last_evaluation: string;
}

interface StakingData {
  cxd_staked: number;
  cxd_locked_vesting: number;
  yield_apy: number;
  yield_earned: number;
  unlock_date: string;
  staking_tier: string;
  rewards_pending: number;
  contract_address: string;
}

interface ContributionData {
  contributor_level: string;
  total_contributions: number;
  active_governance_proposals: number;
  votes_cast: number;
  proposals_created: number;
  proposals_passed: number;
  last_contribution_date: string;
}

interface StewardDashboard {
  points: PointsData;
  reputation: ReputationData;
  staking: StakingData;
  contribution: ContributionData;
  steward_address: string;
}

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
  const votes_cast = 28;
  const proposals_passed = 4;

  return {
    contributor_level: getContributorLevel({ total_contributions, votes_cast, proposals_passed }),
    total_contributions,
    active_governance_proposals: 3,
    votes_cast,
    proposals_created: 5,
    proposals_passed,
    last_contribution_date: new Date().toISOString(),
  };
}

export async function GET() {
  const dashboard: StewardDashboard = {
    points: buildPointsData(),
    reputation: buildReputationData(),
    staking: buildStakingData(),
    contribution: buildContributionData(),
    steward_address: "SP2AQGJQXS0KG3RB6MBK8M9NQPF1WE3N6NNPKF0NE",
  };

  return NextResponse.json(dashboard);
}
