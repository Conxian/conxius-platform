export interface MintedTokenEntry {
  token_id: string;
  amount: number;
  minted_at: string;
  tx_hash: string;
}

export interface ContributorProfile {
  contributor_level: string;
  total_contributions: number;
  active_governance_proposals: number;
  votes_cast: number;
  proposals_created: number;
  proposals_passed: number;
  last_contribution_date: string;
  contributor_address: string;
  minted_token_history: MintedTokenEntry[];
}

export interface ContributionData {
  contributor_level: string;
  total_contributions: number;
  active_governance_proposals: number;
  votes_cast: number;
  proposals_created: number;
  proposals_passed: number;
  last_contribution_date: string;
}

export interface ContributorMetrics {
  total_contributions: number;
  proposals_passed: number;
}

const LEVEL_THRESHOLDS: { level: string; minContributions: number; minProposalsPassed: number }[] = [
  { level: "Genesis", minContributions: 50, minProposalsPassed: 5 },
  { level: "Core", minContributions: 25, minProposalsPassed: 2 },
  { level: "Active", minContributions: 10, minProposalsPassed: 0 },
  { level: "Contributor", minContributions: 1, minProposalsPassed: 0 },
];

export function getContributorLevel(metrics: ContributorMetrics): string {
  if (metrics.total_contributions <= 0) return "";

  for (const threshold of LEVEL_THRESHOLDS) {
    if (
      metrics.total_contributions >= threshold.minContributions &&
      metrics.proposals_passed >= threshold.minProposalsPassed
    ) {
      return threshold.level;
    }
  }

  return "";
}
