import type { ContributionData } from "@/lib/launch";

export interface PointsData {
  total: number;
  earned_this_cycle: number;
  pending: number;
  claimable: number;
  level: string;
  multiplier: number;
  last_updated: string;
  oracle_address: string;
}

export interface ReputationData {
  score: number;
  rank: string;
  badges: string[];
  history: { period: string; score: number }[];
  consensus_weight: number;
  delegated_votes: number;
  last_evaluation: string;
}

export interface StakingData {
  cxd_staked: number;
  cxd_locked_vesting: number;
  yield_apy: number;
  yield_earned: number;
  unlock_date: string;
  staking_tier: string;
  rewards_pending: number;
  contract_address: string;
}

export interface StewardDashboard {
  points: PointsData;
  reputation: ReputationData;
  staking: StakingData;
  contribution: ContributionData;
  steward_address: string;
}
