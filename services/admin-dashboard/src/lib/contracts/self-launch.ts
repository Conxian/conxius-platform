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

export interface CommunityStats {
  total_contributors: number;
  total_contributions: number;
  active_proposals: number;
  proposals_passed: number;
  total_votes_cast: number;
  total_cxd_minted: number;
  funding_target_cxd: number;
  funding_raised_cxd: number;
  community_members: number;
  last_updated: string;
}

export type ContributorLevel =
  | "Newcomer"
  | "Contributor"
  | "Regular"
  | "Core"
  | "Champion"
  | "Steward";

export interface ContributorMetrics {
  total_contributions: number;
  votes_cast: number;
  proposals_passed: number;
}

/**
 * Resolves a contributor's level from their actual protocol metrics.
 * Levels ascend: Newcomer → Contributor → Regular → Core → Champion → Steward.
 */
export function getContributorLevel(metrics: ContributorMetrics): ContributorLevel {
  const { total_contributions, votes_cast, proposals_passed } = metrics;

  if (total_contributions === 0) {
    return "Newcomer";
  }

  if (
    total_contributions >= 200 &&
    votes_cast >= 50 &&
    proposals_passed >= 5
  ) {
    return "Steward";
  }

  if (
    total_contributions >= 100 &&
    votes_cast >= 25 &&
    proposals_passed >= 3
  ) {
    return "Champion";
  }

  if (
    total_contributions >= 50 &&
    votes_cast >= 10 &&
    proposals_passed >= 1
  ) {
    return "Core";
  }

  if (total_contributions >= 20) {
    return "Regular";
  }

  if (total_contributions >= 5) {
    return "Contributor";
  }

  return "Newcomer";
}
