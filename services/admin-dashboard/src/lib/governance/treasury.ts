export type StewardRole =
  | 'member'
  | 'contributor'
  | 'delegate'
  | 'policy-author'
  | 'guardian'
  | 'council';

export interface StewardProfile {
  id: string;
  name: string;
  roles: StewardRole[];
  joinedAt: Date;
  totalVotingPower: number;
  activeDelegations: number;
}

export type FundingTier = 'probationary' | 'active' | 'senior';

export type AllocationCategory =
  | 'community-rewards'
  | 'governance-rewards'
  | 'operational-rewards'
  | 'treasury-reserve';

export type OperationalUnit =
  | 'core-protocol'
  | 'state-indexing'
  | 'liquidity-desk'
  | 'community-grants';

export interface FundedRoleDefinition {
  id: string;
  name: string;
  description: string;
  stewardRole: StewardRole;
  operatorRole: string;
  allocationCategory: AllocationCategory;
  operationalUnits: OperationalUnit[];
  fundingCadence: 'monthly' | 'quarterly' | 'per-milestone';
  governancePropRequired: boolean;
  minContributorLevel: number;
  minVotesRequired: number;
  requiredBadges: string[];
  fundingRangeSats: { probationary: number; active: number; senior: number };
}

export interface FundedRoleAssignment {
  roleId: string;
  roleName: string;
  tier: FundingTier;
  allocationCategory: AllocationCategory;
  operationalUnits: OperationalUnit[];
  fundingCadence: 'monthly' | 'quarterly' | 'per-milestone';
  monthlyFundingEstimateSats: number;
  recognizedBy: string | null;
  recognizedAtIso: string | null;
  eligibilityScore: number;
  missingRequirements: string[];
}

export interface TreasuryFundedRoleProfile {
  stewardId: string;
  stewardName: string;
  assignedRoles: FundedRoleAssignment[];
  totalMonthlyAllocationSats: number;
  allocationBreakdown: Record<AllocationCategory, number>;
  lastEvaluatedIso: string;
}

export const FUNDED_ROLE_DEFINITIONS: FundedRoleDefinition[] = [
  {
    id: 'protocol-operator',
    name: 'Protocol Operator',
    description: 'Operates and maintains core protocol infrastructure including nodes, bridges, and settlement engines',
    stewardRole: 'guardian',
    operatorRole: 'maintainer',
    allocationCategory: 'operational-rewards',
    operationalUnits: ['core-protocol', 'liquidity-desk'],
    fundingCadence: 'monthly',
    governancePropRequired: true,
    minContributorLevel: 4,
    minVotesRequired: 15,
    requiredBadges: ['guardian', 'consistent-voter'],
    fundingRangeSats: { probationary: 2_000_000, active: 5_000_000, senior: 10_000_000 },
  },
  {
    id: 'frontend-operator',
    name: 'Frontend Operator',
    description: 'Hosts and maintains community-facing frontend deployments with governance-recognized status',
    stewardRole: 'contributor',
    operatorRole: 'frontend-host',
    allocationCategory: 'operational-rewards',
    operationalUnits: ['core-protocol'],
    fundingCadence: 'monthly',
    governancePropRequired: true,
    minContributorLevel: 3,
    minVotesRequired: 5,
    requiredBadges: ['first-vote'],
    fundingRangeSats: { probationary: 1_000_000, active: 3_000_000, senior: 6_000_000 },
  },
  {
    id: 'governance-delegate',
    name: 'Governance Delegate',
    description: 'Represents community voting power through active delegation and proposal stewardship',
    stewardRole: 'delegate',
    operatorRole: 'delegate',
    allocationCategory: 'governance-rewards',
    operationalUnits: ['core-protocol', 'state-indexing'],
    fundingCadence: 'quarterly',
    governancePropRequired: true,
    minContributorLevel: 3,
    minVotesRequired: 25,
    requiredBadges: ['delegate', 'consistent-voter'],
    fundingRangeSats: { probationary: 1_500_000, active: 4_000_000, senior: 8_000_000 },
  },
  {
    id: 'policy-steward',
    name: 'Policy Steward',
    description: 'Authors, reviews, and maintains governance policies that shape protocol direction',
    stewardRole: 'policy-author',
    operatorRole: 'steward',
    allocationCategory: 'governance-rewards',
    operationalUnits: ['state-indexing', 'community-grants'],
    fundingCadence: 'per-milestone',
    governancePropRequired: true,
    minContributorLevel: 3,
    minVotesRequired: 10,
    requiredBadges: ['policy-author', 'policy-shaper'],
    fundingRangeSats: { probationary: 1_500_000, active: 4_000_000, senior: 7_000_000 },
  },
  {
    id: 'community-steward',
    name: 'Community Steward',
    description: 'Drives community growth, onboarding, and ecosystem enablement through grants and programs',
    stewardRole: 'contributor',
    operatorRole: 'steward',
    allocationCategory: 'community-rewards',
    operationalUnits: ['community-grants'],
    fundingCadence: 'quarterly',
    governancePropRequired: true,
    minContributorLevel: 3,
    minVotesRequired: 10,
    requiredBadges: ['consistent-voter', 'community-pillar'],
    fundingRangeSats: { probationary: 1_500_000, active: 4_000_000, senior: 8_000_000 },
  },
  {
    id: 'council-member',
    name: 'Council Member',
    description: 'Serves on the governance council with oversight over treasury allocation and protocol direction',
    stewardRole: 'council',
    operatorRole: 'steward',
    allocationCategory: 'governance-rewards',
    operationalUnits: ['core-protocol', 'state-indexing', 'liquidity-desk', 'community-grants'],
    fundingCadence: 'quarterly',
    governancePropRequired: true,
    minContributorLevel: 5,
    minVotesRequired: 50,
    requiredBadges: ['council', 'vote-streak-10'],
    fundingRangeSats: { probationary: 5_000_000, active: 12_000_000, senior: 25_000_000 },
  },
  {
    id: 'security-guardian',
    name: 'Security Guardian',
    description: 'Hardens protocol security through audits, monitoring, and incident response',
    stewardRole: 'guardian',
    operatorRole: 'maintainer',
    allocationCategory: 'operational-rewards',
    operationalUnits: ['core-protocol'],
    fundingCadence: 'monthly',
    governancePropRequired: true,
    minContributorLevel: 4,
    minVotesRequired: 10,
    requiredBadges: ['guardian'],
    fundingRangeSats: { probationary: 2_500_000, active: 6_000_000, senior: 12_000_000 },
  },
  {
    id: 'treasury-custodian',
    name: 'Treasury Custodian',
    description: 'Manages treasury reserve strategy, yield harvesting, and multi-signature custody operations',
    stewardRole: 'guardian',
    operatorRole: 'steward',
    allocationCategory: 'treasury-reserve',
    operationalUnits: ['liquidity-desk'],
    fundingCadence: 'quarterly',
    governancePropRequired: true,
    minContributorLevel: 5,
    minVotesRequired: 20,
    requiredBadges: ['guardian', 'vote-streak-10', 'community-pillar'],
    fundingRangeSats: { probationary: 3_000_000, active: 8_000_000, senior: 15_000_000 },
  },
];

export const CONTRIBUTOR_LEVEL_THRESHOLDS: Record<number, string> = {
  0: 'Newcomer',
  1: 'Contributor',
  2: 'Regular',
  3: 'Core',
  4: 'Champion',
  5: 'Steward',
};

export function computeFundingTier(
  contributorLevel: number,
  voteCount: number,
  hasAllBadges: boolean,
): FundingTier {
  if (!hasAllBadges) return 'probationary';
  if (contributorLevel >= 5 && voteCount >= 50) return 'senior';
  if (contributorLevel >= 4 && voteCount >= 15) return 'active';
  return 'probationary';
}

export function computeFundedRoleEligibility(
  steward: StewardProfile,
  contributorLevel: number,
  totalVotes: number,
  earnedBadgeIds: string[],
  recognizedRoleIds: Set<string>,
): FundedRoleAssignment[] {
  return FUNDED_ROLE_DEFINITIONS.map((def) => {
    const missing: string[] = [];
    let score = 0;

    if (!steward.roles.includes(def.stewardRole)) {
      missing.push(`Missing steward role: ${def.stewardRole}`);
    } else {
      score += 30;
    }

    if (contributorLevel < def.minContributorLevel) {
      missing.push(
        `Contributor level too low (need ${CONTRIBUTOR_LEVEL_THRESHOLDS[def.minContributorLevel]}, have ${CONTRIBUTOR_LEVEL_THRESHOLDS[contributorLevel] ?? 'Unknown'})`,
      );
    } else {
      score += 20 + (contributorLevel - def.minContributorLevel) * 5;
    }

    if (totalVotes < def.minVotesRequired) {
      missing.push(`Insufficient votes (need ${def.minVotesRequired}, have ${totalVotes})`);
    } else {
      score += 15;
    }

    const missingBadges = def.requiredBadges.filter((b) => !earnedBadgeIds.includes(b));
    if (missingBadges.length > 0) {
      missing.push(`Missing badges: ${missingBadges.join(', ')}`);
    } else {
      score += 25;
    }

    const hasAllBadges = missingBadges.length === 0;
    const tier = computeFundingTier(contributorLevel, totalVotes, hasAllBadges);
    const recognized = recognizedRoleIds.has(def.id);

    return {
      roleId: def.id,
      roleName: def.name,
      tier,
      allocationCategory: def.allocationCategory,
      operationalUnits: def.operationalUnits,
      fundingCadence: def.fundingCadence,
      monthlyFundingEstimateSats: recognized ? def.fundingRangeSats[tier] : 0,
      recognizedBy: recognized ? `governance-prop-${def.id}` : null,
      recognizedAtIso: recognized ? new Date().toISOString() : null,
      eligibilityScore: score,
      missingRequirements: missing,
    };
  });
}

export function buildTreasuryFundedRoleProfile(
  steward: StewardProfile,
  contributorLevel: number,
  totalVotes: number,
  earnedBadgeIds: string[],
  recognizedRoleIds: Set<string>,
): TreasuryFundedRoleProfile {
  const assignedRoles = computeFundedRoleEligibility(
    steward, contributorLevel, totalVotes, earnedBadgeIds, recognizedRoleIds,
  );

  const totalMonthlyAllocationSats = assignedRoles.reduce(
    (sum, r) => sum + r.monthlyFundingEstimateSats, 0,
  );

  const allocationBreakdown: Record<AllocationCategory, number> = {
    'community-rewards': 0,
    'governance-rewards': 0,
    'operational-rewards': 0,
    'treasury-reserve': 0,
  };

  for (const role of assignedRoles) {
    if (role.monthlyFundingEstimateSats > 0) {
      allocationBreakdown[role.allocationCategory] += role.monthlyFundingEstimateSats;
    }
  }

  return {
    stewardId: steward.id,
    stewardName: steward.name,
    assignedRoles,
    totalMonthlyAllocationSats,
    allocationBreakdown,
    lastEvaluatedIso: new Date().toISOString(),
  };
}
