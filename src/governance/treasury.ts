import type { StewardRole, GovernanceBadge, StewardProfile } from './types';

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

export interface PayoutRecord {
  id: string;
  roleId: string;
  roleName: string;
  stewardId: string;
  stewardName: string;
  amountSats: number;
  allocationCategory: AllocationCategory;
  fundingCadence: 'monthly' | 'quarterly' | 'per-milestone';
  periodIso: string;
  paidAtIso: string;
  txHash?: string;
  recognizedBy: string;
}

export interface ActivityRecord {
  id: string;
  roleId: string;
  roleName: string;
  stewardId: string;
  stewardName: string;
  activityType:
    | 'vote-cast'
    | 'proposal-created'
    | 'policy-authored'
    | 'policy-reviewed'
    | 'delegation-received'
    | 'badge-earned'
    | 'operator-action';
  description: string;
  occurredAtIso: string;
  metadata?: Record<string, string>;
}

export interface FundedRoleHistory {
  stewardId: string;
  stewardName: string;
  roleId: string;
  roleName: string;
  allocationCategory: AllocationCategory;
  payouts: PayoutRecord[];
  activities: ActivityRecord[];
  totalPayoutSats: number;
  payoutCount: number;
  activityCount: number;
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
      monthlyFundingEstimateSats: recognized
        ? def.fundingRangeSats[tier]
        : 0,
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
    steward,
    contributorLevel,
    totalVotes,
    earnedBadgeIds,
    recognizedRoleIds,
  );

  const totalMonthlyAllocationSats = assignedRoles.reduce(
    (sum, r) => sum + r.monthlyFundingEstimateSats,
    0,
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

export const HISTORICAL_PAYOUTS: PayoutRecord[] = [
  {
    id: 'payout-001',
    roleId: 'protocol-operator',
    roleName: 'Protocol Operator',
    stewardId: 'steward-alice',
    stewardName: 'Alice',
    amountSats: 5_000_000,
    allocationCategory: 'operational-rewards',
    fundingCadence: 'monthly',
    periodIso: '2026-06-01T00:00:00Z',
    paidAtIso: '2026-07-01T12:00:00Z',
    txHash: 'a1b2c3d4e5f6...',
    recognizedBy: 'governance-prop-protocol-operator',
  },
  {
    id: 'payout-002',
    roleId: 'protocol-operator',
    roleName: 'Protocol Operator',
    stewardId: 'steward-alice',
    stewardName: 'Alice',
    amountSats: 5_000_000,
    allocationCategory: 'operational-rewards',
    fundingCadence: 'monthly',
    periodIso: '2026-05-01T00:00:00Z',
    paidAtIso: '2026-06-01T12:00:00Z',
    txHash: 'b2c3d4e5f6a1...',
    recognizedBy: 'governance-prop-protocol-operator',
  },
  {
    id: 'payout-003',
    roleId: 'governance-delegate',
    roleName: 'Governance Delegate',
    stewardId: 'steward-alice',
    stewardName: 'Alice',
    amountSats: 4_000_000,
    allocationCategory: 'governance-rewards',
    fundingCadence: 'quarterly',
    periodIso: '2026-Q2',
    paidAtIso: '2026-07-01T12:00:00Z',
    txHash: 'c3d4e5f6a1b2...',
    recognizedBy: 'governance-prop-governance-delegate',
  },
  {
    id: 'payout-004',
    roleId: 'policy-steward',
    roleName: 'Policy Steward',
    stewardId: 'steward-alice',
    stewardName: 'Alice',
    amountSats: 2_000_000,
    allocationCategory: 'governance-rewards',
    fundingCadence: 'per-milestone',
    periodIso: '2026-06-15T00:00:00Z',
    paidAtIso: '2026-06-20T09:00:00Z',
    txHash: 'd4e5f6a1b2c3...',
    recognizedBy: 'governance-prop-policy-steward',
  },
  {
    id: 'payout-005',
    roleId: 'protocol-operator',
    roleName: 'Protocol Operator',
    stewardId: 'steward-alice',
    stewardName: 'Alice',
    amountSats: 5_000_000,
    allocationCategory: 'operational-rewards',
    fundingCadence: 'monthly',
    periodIso: '2026-04-01T00:00:00Z',
    paidAtIso: '2026-05-01T12:00:00Z',
    txHash: 'e5f6a1b2c3d4...',
    recognizedBy: 'governance-prop-protocol-operator',
  },
];

export const HISTORICAL_ACTIVITIES: ActivityRecord[] = [
  {
    id: 'act-001',
    roleId: 'protocol-operator',
    roleName: 'Protocol Operator',
    stewardId: 'steward-alice',
    stewardName: 'Alice',
    activityType: 'operator-action',
    description: 'Upgraded Citrea bridge node to v2.4.1',
    occurredAtIso: '2026-07-02T14:30:00Z',
    metadata: { component: 'citrea-bridge', version: '2.4.1' },
  },
  {
    id: 'act-002',
    roleId: 'governance-delegate',
    roleName: 'Governance Delegate',
    stewardId: 'steward-alice',
    stewardName: 'Alice',
    activityType: 'vote-cast',
    description: 'Voted FOR on proposal CIP-42 (Treasury allocation rebalance)',
    occurredAtIso: '2026-06-28T10:15:00Z',
    metadata: { proposalId: 'CIP-42', choice: 'for' },
  },
  {
    id: 'act-003',
    roleId: 'policy-steward',
    roleName: 'Policy Steward',
    stewardId: 'steward-alice',
    stewardName: 'Alice',
    activityType: 'policy-authored',
    description: 'Authored governance policy GP-12 on operator recognition criteria',
    occurredAtIso: '2026-06-20T08:00:00Z',
    metadata: { policyId: 'GP-12' },
  },
  {
    id: 'act-004',
    roleId: 'protocol-operator',
    roleName: 'Protocol Operator',
    stewardId: 'steward-alice',
    stewardName: 'Alice',
    activityType: 'operator-action',
    description: 'Resolved incident: settlement engine stall during batch #1847',
    occurredAtIso: '2026-06-25T03:45:00Z',
    metadata: { component: 'settlement-engine', batchId: '1847' },
  },
  {
    id: 'act-005',
    roleId: 'governance-delegate',
    roleName: 'Governance Delegate',
    stewardId: 'steward-alice',
    stewardName: 'Alice',
    activityType: 'delegation-received',
    description: 'Received delegation of 1,200 votes from steward-bob',
    occurredAtIso: '2026-06-18T16:00:00Z',
    metadata: { delegatorId: 'steward-bob', votingPower: '1200' },
  },
  {
    id: 'act-006',
    roleId: 'protocol-operator',
    roleName: 'Protocol Operator',
    stewardId: 'steward-alice',
    stewardName: 'Alice',
    activityType: 'badge-earned',
    description: 'Earned guardian badge for protocol security contributions',
    occurredAtIso: '2026-06-10T12:00:00Z',
    metadata: { badgeId: 'guardian' },
  },
  {
    id: 'act-007',
    roleId: 'policy-steward',
    roleName: 'Policy Steward',
    stewardId: 'steward-alice',
    stewardName: 'Alice',
    activityType: 'policy-reviewed',
    description: 'Reviewed and approved policy amendment GP-08b',
    occurredAtIso: '2026-06-05T11:00:00Z',
    metadata: { policyId: 'GP-08b' },
  },
  {
    id: 'act-008',
    roleId: 'governance-delegate',
    roleName: 'Governance Delegate',
    stewardId: 'steward-alice',
    stewardName: 'Alice',
    activityType: 'vote-cast',
    description: 'Voted FOR on proposal CIP-40 (New operational unit: community-grants)',
    occurredAtIso: '2026-05-22T09:30:00Z',
    metadata: { proposalId: 'CIP-40', choice: 'for' },
  },
];

export function buildFundedRolesHistory(
  recognizedRoleIds: Set<string>,
): FundedRoleHistory[] {
  const histories: FundedRoleHistory[] = [];

  for (const def of FUNDED_ROLE_DEFINITIONS) {
    if (!recognizedRoleIds.has(def.id)) continue;

    const payouts = HISTORICAL_PAYOUTS.filter((p) => p.roleId === def.id);
    const activities = HISTORICAL_ACTIVITIES.filter((a) => a.roleId === def.id);
    const totalPayoutSats = payouts.reduce((sum, p) => sum + p.amountSats, 0);

    histories.push({
      stewardId: payouts[0]?.stewardId ?? 'steward-alice',
      stewardName: payouts[0]?.stewardName ?? 'Alice',
      roleId: def.id,
      roleName: def.name,
      allocationCategory: def.allocationCategory,
      payouts,
      activities,
      totalPayoutSats,
      payoutCount: payouts.length,
      activityCount: activities.length,
    });
  }

  return histories;
}
