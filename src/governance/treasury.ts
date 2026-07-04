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

/** Governance proposal template for treasury-funded community roles. */
export interface TreasuryFundingProposalTemplate {
  /** Unique template ID, e.g. 'prop-tpl-protocol-operator' */
  id: string;
  /** Human-readable template title */
  title: string;
  /** Role this template funds */
  roleId: string;
  /** Role display name */
  roleName: string;
  /** Allocation category for the funding */
  allocationCategory: AllocationCategory;
  /** Funding cadence */
  fundingCadence: 'monthly' | 'quarterly' | 'per-milestone';
  /** Minimum votes required for approval */
  minVotesRequired: number;
  /** Badges required to submit this proposal */
  requiredSubmitterBadges: string[];
  /** Structured sections the proposal must contain */
  sections: ProposalTemplateSection[];
  /** Pre-filled governance context */
  governanceContext: {
    /** Why this role requires a governance proposal */
    rationale: string;
    /** What governance body ratifies this */
    ratificationBody: string;
    /** Post-approval steps */
    postApprovalSteps: string[];
  };
}

export interface ProposalTemplateSection {
  id: string;
  heading: string;
  description: string;
  placeholder: string;
  required: boolean;
  /** Whether this section expects a funding amount */
  expectsAmount?: boolean;
}

/** A completed proposal instance based on a template */
export interface TreasuryFundingProposal {
  id: string;
  templateId: string;
  roleId: string;
  stewardId: string;
  stewardName: string;
  title: string;
  status: 'draft' | 'submitted' | 'voting' | 'approved' | 'rejected';
  requestedTier: FundingTier;
  requestedAmountSats: number;
  sections: ProposalTemplateSectionResponse[];
  createdAtIso: string;
  submittedAtIso?: string;
  proposalRef?: string;
}

export interface ProposalTemplateSectionResponse {
  sectionId: string;
  heading: string;
  content: string;
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

/** Standard proposal sections shared across all treasury funding templates. */
const STANDARD_PROPOSAL_SECTIONS: ProposalTemplateSection[] = [
  {
    id: 'problem-statement',
    heading: 'Problem Statement',
    description: 'What operational or governance need does this funded role address?',
    placeholder: 'Describe the gap this role fills and why community treasury funding is the right mechanism...',
    required: true,
  },
  {
    id: 'scope-of-work',
    heading: 'Scope of Work',
    description: 'Specific responsibilities, deliverables, and operational cadence for the funding period.',
    placeholder: 'List the key responsibilities and expected outcomes for this funding period...',
    required: true,
  },
  {
    id: 'funding-request',
    heading: 'Funding Request',
    description: 'Amount requested and justification aligned with the role funding tier.',
    placeholder: 'Specify the funding tier (probationary/active/senior) and amount in sats. Reference the role definition funding range...',
    required: true,
    expectsAmount: true,
  },
  {
    id: 'success-metrics',
    heading: 'Success Metrics',
    description: 'Measurable outcomes that demonstrate the funded work delivered value.',
    placeholder: 'Define 3-5 measurable metrics such as: uptime %, proposals reviewed, community engagements completed, audits passed...',
    required: true,
  },
  {
    id: 'governance-requirements',
    heading: 'Governance Requirements',
    description: 'Voting threshold, required badges, and ratification process.',
    placeholder: 'This proposal requires {{minVotesRequired}} votes and the following submitter badges: {{requiredBadges}}...',
    required: true,
  },
  {
    id: 'steward-declaration',
    heading: 'Steward Declaration',
    description: 'Steward identity, qualifications, and commitment to the role.',
    placeholder: 'State your steward ID, relevant badges held, contributor level, and commitment to the role responsibilities...',
    required: true,
  },
];

/** Governance proposal templates for treasury-funded community roles.
 *  Each template corresponds to a FundedRoleDefinition and pre-fills
 *  the governance context, allocation category, and funding parameters. */
export const TREASURY_FUNDING_PROPOSAL_TEMPLATES: TreasuryFundingProposalTemplate[] = [
  {
    id: 'prop-tpl-protocol-operator',
    title: 'Protocol Operator Funding Proposal',
    roleId: 'protocol-operator',
    roleName: 'Protocol Operator',
    allocationCategory: 'operational-rewards',
    fundingCadence: 'monthly',
    minVotesRequired: 15,
    requiredSubmitterBadges: ['guardian', 'consistent-voter'],
    sections: STANDARD_PROPOSAL_SECTIONS,
    governanceContext: {
      rationale: 'Protocol operators maintain critical infrastructure (nodes, bridges, settlement engines). Continuous treasury funding ensures reliability and decentralised operation of core protocol services.',
      ratificationBody: 'Governance Council + Community Vote',
      postApprovalSteps: [
        'Treasury custodian reviews and countersigns the approved proposal',
        'Monthly payouts begin on the next funding cycle',
        'Operator submits monthly activity reports to maintain eligibility',
        'Funding tier re-evaluated quarterly based on performance metrics',
      ],
    },
  },
  {
    id: 'prop-tpl-frontend-operator',
    title: 'Frontend Operator Funding Proposal',
    roleId: 'frontend-operator',
    roleName: 'Frontend Operator',
    allocationCategory: 'operational-rewards',
    fundingCadence: 'monthly',
    minVotesRequired: 5,
    requiredSubmitterBadges: ['first-vote'],
    sections: STANDARD_PROPOSAL_SECTIONS,
    governanceContext: {
      rationale: 'Frontend operators host and maintain community-facing web interfaces. Treasury funding shifts frontend ownership from Conxian-Labs to the protocol community.',
      ratificationBody: 'Community Vote',
      postApprovalSteps: [
        'Treasury custodian reviews the approved proposal',
        'Monthly payouts begin on the next funding cycle',
        'Operator must display recognised frontend status badge',
        'Annual community review of frontend quality and uptime',
      ],
    },
  },
  {
    id: 'prop-tpl-governance-delegate',
    title: 'Governance Delegate Funding Proposal',
    roleId: 'governance-delegate',
    roleName: 'Governance Delegate',
    allocationCategory: 'governance-rewards',
    fundingCadence: 'quarterly',
    minVotesRequired: 25,
    requiredSubmitterBadges: ['delegate', 'consistent-voter'],
    sections: STANDARD_PROPOSAL_SECTIONS,
    governanceContext: {
      rationale: 'Governance delegates represent community voting power and steward protocol direction. Funding ensures delegates can dedicate time to proposal review, community engagement, and informed voting.',
      ratificationBody: 'Governance Council + Community Vote',
      postApprovalSteps: [
        'Treasury custodian reviews and countersigns the approved proposal',
        'Quarterly payouts with mid-quarter activity checkpoint',
        'Delegate voting record published quarterly for community review',
        'Delegation power subject to community recall if participation drops below threshold',
      ],
    },
  },
  {
    id: 'prop-tpl-policy-steward',
    title: 'Policy Steward Funding Proposal',
    roleId: 'policy-steward',
    roleName: 'Policy Steward',
    allocationCategory: 'governance-rewards',
    fundingCadence: 'per-milestone',
    minVotesRequired: 10,
    requiredSubmitterBadges: ['policy-author', 'policy-shaper'],
    sections: STANDARD_PROPOSAL_SECTIONS,
    governanceContext: {
      rationale: 'Policy stewards author, review, and maintain governance policies. Per-milestone funding aligns incentives with policy delivery rather than time spent.',
      ratificationBody: 'Governance Council',
      postApprovalSteps: [
        'Treasury custodian reviews and countersigns the approved proposal',
        'Payout released upon milestone completion verified by council',
        'Policy document merged into canonical governance repository',
        'Community review period for each completed policy milestone',
      ],
    },
  },
  {
    id: 'prop-tpl-community-steward',
    title: 'Community Steward Funding Proposal',
    roleId: 'community-steward',
    roleName: 'Community Steward',
    allocationCategory: 'community-rewards',
    fundingCadence: 'quarterly',
    minVotesRequired: 10,
    requiredSubmitterBadges: ['consistent-voter', 'community-pillar'],
    sections: STANDARD_PROPOSAL_SECTIONS,
    governanceContext: {
      rationale: 'Community stewards drive engagement, onboarding, and ecosystem growth. Treasury funding ensures community work is recognised as protocol-critical, not volunteer-dependent.',
      ratificationBody: 'Community Vote',
      postApprovalSteps: [
        'Treasury custodian reviews the approved proposal',
        'Quarterly payouts with community sentiment checkpoint',
        'Steward publishes quarterly community health report',
        'Community feedback mechanism for steward performance review',
      ],
    },
  },
  {
    id: 'prop-tpl-council-member',
    title: 'Council Member Funding Proposal',
    roleId: 'council-member',
    roleName: 'Council Member',
    allocationCategory: 'governance-rewards',
    fundingCadence: 'quarterly',
    minVotesRequired: 50,
    requiredSubmitterBadges: ['council', 'vote-streak-10'],
    sections: STANDARD_PROPOSAL_SECTIONS,
    governanceContext: {
      rationale: 'Council members provide strategic governance oversight and high-stakes decision-making. Funding reflects the significant responsibility and time commitment of council service.',
      ratificationBody: 'Governance Council (super-majority) + Community Ratification Vote',
      postApprovalSteps: [
        'Treasury custodian reviews and countersigns the approved proposal',
        'Quarterly payouts with public council activity report',
        'Council voting record and meeting minutes published monthly',
        'Council seat subject to annual re-election cycle',
      ],
    },
  },
  {
    id: 'prop-tpl-security-guardian',
    title: 'Security Guardian Funding Proposal',
    roleId: 'security-guardian',
    roleName: 'Security Guardian',
    allocationCategory: 'operational-rewards',
    fundingCadence: 'monthly',
    minVotesRequired: 10,
    requiredSubmitterBadges: ['guardian'],
    sections: STANDARD_PROPOSAL_SECTIONS,
    governanceContext: {
      rationale: 'Security guardians monitor protocol security, respond to incidents, and maintain the circuit breaker and safety mechanisms. Continuous funding ensures 24/7 security coverage.',
      ratificationBody: 'Governance Council',
      postApprovalSteps: [
        'Treasury custodian reviews and countersigns the approved proposal',
        'Monthly payouts begin on the next funding cycle',
        'Guardian submits monthly security posture report',
        'Security incident response SLA reviewed quarterly',
      ],
    },
  },
  {
    id: 'prop-tpl-treasury-custodian',
    title: 'Treasury Custodian Funding Proposal',
    roleId: 'treasury-custodian',
    roleName: 'Treasury Custodian',
    allocationCategory: 'treasury-reserve',
    fundingCadence: 'quarterly',
    minVotesRequired: 20,
    requiredSubmitterBadges: ['guardian', 'vote-streak-10', 'community-pillar'],
    sections: STANDARD_PROPOSAL_SECTIONS,
    governanceContext: {
      rationale: 'Treasury custodians manage protocol funds, countersign payouts, and maintain treasury reserve health. This is the highest-trust funded role requiring multiple governance badges.',
      ratificationBody: 'Governance Council (super-majority) + Community Ratification Vote',
      postApprovalSteps: [
        'Existing treasury custodian(s) review and countersign the approved proposal',
        'Quarterly payouts with public treasury health report',
        'Monthly reserve coverage ratio published',
        'Custodian subject to annual re-ratification with treasury audit',
      ],
    },
  },
];

/** Build a list of proposal templates filtered by optional criteria. */
export function buildProposalTemplates(
  filterRoleId?: string,
  filterCategory?: AllocationCategory,
): TreasuryFundingProposalTemplate[] {
  return TREASURY_FUNDING_PROPOSAL_TEMPLATES.filter((t) => {
    if (filterRoleId && t.roleId !== filterRoleId) return false;
    if (filterCategory && t.allocationCategory !== filterCategory) return false;
    return true;
  });
}

/** Get a single proposal template by ID. */
export function getProposalTemplate(templateId: string): TreasuryFundingProposalTemplate | undefined {
  return TREASURY_FUNDING_PROPOSAL_TEMPLATES.find((t) => t.id === templateId);
}

/** Get the funded role definition that a template applies to. */
export function getTemplateRoleDefinition(
  template: TreasuryFundingProposalTemplate,
): FundedRoleDefinition | undefined {
  return FUNDED_ROLE_DEFINITIONS.find((d) => d.id === template.roleId);
}
