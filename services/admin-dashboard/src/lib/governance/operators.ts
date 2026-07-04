/** Operator approval governance types — distinct from treasury funding.
 *  These templates govern *recognition* of community operators, not funding. */

export type OperatorType =
  | 'frontend-host'
  | 'delegate'
  | 'service-provider'
  | 'indexer-operator'
  | 'bridge-operator'
  | 'oracle-operator';

export type OperatorStatus = 'nominated' | 'approved' | 'suspended' | 'removed';

export interface OperatorDefinition {
  id: string;
  type: OperatorType;
  name: string;
  description: string;
  /** What governance body approves this operator type */
  approvalBody: string;
  /** Minimum votes required for approval */
  minVotesRequired: number;
  /** Badges the nominee must hold */
  requiredBadges: string[];
  /** Badges the proposer must hold */
  requiredProposerBadges: string[];
  /** Minimum contributor level to be eligible */
  minContributorLevel: number;
  /** Whether operator status expires and requires renewal */
  requiresRenewal: boolean;
  /** Renewal interval in months (if requiresRenewal) */
  renewalIntervalMonths?: number;
}

export interface OperatorApprovalProposalTemplate {
  id: string;
  title: string;
  operatorType: OperatorType;
  operatorTypeName: string;
  minVotesRequired: number;
  requiredProposerBadges: string[];
  sections: ProposalTemplateSection[];
  governanceContext: {
    rationale: string;
    ratificationBody: string;
    postApprovalSteps: string[];
    /** How this transitions ownership away from Labs default control */
    decentralizationImpact: string;
  };
}

export interface ProposalTemplateSection {
  id: string;
  heading: string;
  description: string;
  placeholder: string;
  required: boolean;
}

export interface OperatorApprovalProposal {
  id: string;
  templateId: string;
  operatorType: OperatorType;
  nomineeId: string;
  nomineeName: string;
  proposerId: string;
  proposerName: string;
  title: string;
  status: 'draft' | 'submitted' | 'voting' | 'approved' | 'rejected';
  sections: ProposalSectionResponse[];
  createdAtIso: string;
  submittedAtIso?: string;
  approvedAtIso?: string;
  expiresAtIso?: string;
  proposalRef?: string;
}

export interface ProposalSectionResponse {
  sectionId: string;
  heading: string;
  content: string;
}

export const OPERATOR_DEFINITIONS: OperatorDefinition[] = [
  {
    id: 'frontend-host',
    type: 'frontend-host',
    name: 'Frontend Host',
    description:
      'Hosts and maintains a community-facing frontend deployment recognized by governance. Frontend hosts shift UI ownership from Conxian-Labs to the protocol community.',
    approvalBody: 'Community Vote',
    minVotesRequired: 5,
    requiredBadges: ['first-vote'],
    requiredProposerBadges: ['first-vote'],
    minContributorLevel: 2,
    requiresRenewal: true,
    renewalIntervalMonths: 12,
  },
  {
    id: 'delegate',
    type: 'delegate',
    name: 'Governance Delegate',
    description:
      'Represents community voting power through active delegation. Delegates are recognized as official governance participants with voting weight.',
    approvalBody: 'Community Vote',
    minVotesRequired: 15,
    requiredBadges: ['delegate', 'consistent-voter'],
    requiredProposerBadges: ['delegate'],
    minContributorLevel: 3,
    requiresRenewal: true,
    renewalIntervalMonths: 6,
  },
  {
    id: 'service-provider',
    type: 'service-provider',
    name: 'Recognized Service Provider',
    description:
      'Provides operational services to the protocol community (monitoring, analytics, support, infrastructure). Approval recognises the provider as community-endorsed.',
    approvalBody: 'Community Vote',
    minVotesRequired: 10,
    requiredBadges: ['consistent-voter'],
    requiredProposerBadges: ['consistent-voter'],
    minContributorLevel: 3,
    requiresRenewal: true,
    renewalIntervalMonths: 12,
  },
  {
    id: 'indexer-operator',
    type: 'indexer-operator',
    name: 'Indexer Operator',
    description:
      'Operates a protocol state indexer serving query APIs to the community. Approval ensures indexer data is trusted and meets community standards.',
    approvalBody: 'Governance Council',
    minVotesRequired: 10,
    requiredBadges: ['consistent-voter'],
    requiredProposerBadges: ['guardian'],
    minContributorLevel: 4,
    requiresRenewal: true,
    renewalIntervalMonths: 12,
  },
  {
    id: 'bridge-operator',
    type: 'bridge-operator',
    name: 'Bridge Operator',
    description:
      'Operates a cross-chain bridge relayer or validator node. High-trust role requiring technical competence and security diligence.',
    approvalBody: 'Governance Council (super-majority)',
    minVotesRequired: 20,
    requiredBadges: ['guardian', 'consistent-voter'],
    requiredProposerBadges: ['guardian'],
    minContributorLevel: 4,
    requiresRenewal: true,
    renewalIntervalMonths: 6,
  },
  {
    id: 'oracle-operator',
    type: 'oracle-operator',
    name: 'Oracle Operator',
    description:
      'Operates a price feed or data oracle relied upon by protocol contracts. High-trust role with direct financial impact.',
    approvalBody: 'Governance Council (super-majority)',
    minVotesRequired: 20,
    requiredBadges: ['guardian', 'consistent-voter'],
    requiredProposerBadges: ['guardian'],
    minContributorLevel: 4,
    requiresRenewal: true,
    renewalIntervalMonths: 6,
  },
];

const STANDARD_APPROVAL_SECTIONS: ProposalTemplateSection[] = [
  {
    id: 'operator-summary',
    heading: 'Operator Summary',
    description:
      'Brief description of the operator role being proposed, the nominee, and why this operator should be community-recognized.',
    placeholder:
      'Describe the operator role and why recognition by governance is important for decentralization...',
    required: true,
  },
  {
    id: 'nominee-qualifications',
    heading: 'Nominee Qualifications',
    description:
      'Evidence of the nominee\'s qualifications: relevant experience, community contributions, technical capability, and alignment with protocol values.',
    placeholder:
      'List the nominee\'s qualifications, including prior contributions, relevant badges earned, and any supporting references...',
    required: true,
  },
  {
    id: 'operator-commitments',
    heading: 'Operator Commitments',
    description:
      'Specific commitments the operator makes: uptime guarantees, response SLAs, community reporting, and operational transparency.',
    placeholder:
      'Define the commitments this operator will uphold (e.g., 99% uptime, 24h incident response, monthly community reports)...',
    required: true,
  },
  {
    id: 'decentralization-impact',
    heading: 'Decentralization Impact',
    description:
      'How this operator approval advances the transition from default Conxian-Labs control to community-operated infrastructure.',
    placeholder:
      'Explain how recognizing this operator reduces dependency on Conxian-Labs and strengthens community ownership...',
    required: true,
  },
  {
    id: 'technical-details',
    heading: 'Technical Details',
    description:
      'Technical information about the operator setup: infrastructure, security measures, monitoring, and disaster recovery.',
    placeholder:
      'Describe the technical setup, including hosting, security measures, monitoring tools, and disaster recovery plan...',
    required: false,
  },
  {
    id: 'community-support',
    heading: 'Community Support',
    description:
      'Evidence of community support: endorsements from other community members, relevant forum discussions, or prior community engagement.',
    placeholder:
      'List community members who support this nomination and any relevant community discussions...',
    required: false,
  },
];

export const OPERATOR_APPROVAL_TEMPLATES: OperatorApprovalProposalTemplate[] = [
  {
    id: 'op-aprv-frontend-host',
    title: 'Frontend Host Operator Approval',
    operatorType: 'frontend-host',
    operatorTypeName: 'Frontend Host',
    minVotesRequired: 5,
    requiredProposerBadges: ['first-vote'],
    sections: STANDARD_APPROVAL_SECTIONS,
    governanceContext: {
      rationale:
        'Recognizing community frontend hosts shifts UI ownership from Conxian-Labs to the protocol community. Approved hosts display an official recognition badge, and their frontend is listed in the canonical frontend registry.',
      ratificationBody: 'Community Vote',
      postApprovalSteps: [
        'Governance council records the approved operator in the operator registry',
        'Operator receives recognition badge and frontend listing',
        'Operator displays governance-recognized status on their frontend',
        'Annual renewal review with community vote',
      ],
      decentralizationImpact:
        'Each approved community frontend host reduces the default dependency on Conxian-Labs-hosted interfaces. Over time, the canonical frontend registry becomes community-governed rather than Labs-curated.',
    },
  },
  {
    id: 'op-aprv-delegate',
    title: 'Governance Delegate Operator Approval',
    operatorType: 'delegate',
    operatorTypeName: 'Governance Delegate',
    minVotesRequired: 15,
    requiredProposerBadges: ['delegate'],
    sections: STANDARD_APPROVAL_SECTIONS,
    governanceContext: {
      rationale:
        'Recognized delegates carry formal voting weight in governance decisions. Approval ensures delegates meet community standards for participation, transparency, and informed voting.',
      ratificationBody: 'Community Vote',
      postApprovalSteps: [
        'Delegate added to governance registry with voting weight',
        'Delegate voting record tracked and published quarterly',
        'Delegation power subject to community recall if participation drops',
        'Semi-annual renewal review',
      ],
      decentralizationImpact:
        'A broad, community-elected delegate set distributes governance power away from any single entity. Approved delegates form the backbone of protocol governance.',
    },
  },
  {
    id: 'op-aprv-service-provider',
    title: 'Service Provider Operator Approval',
    operatorType: 'service-provider',
    operatorTypeName: 'Recognized Service Provider',
    minVotesRequired: 10,
    requiredProposerBadges: ['consistent-voter'],
    sections: STANDARD_APPROVAL_SECTIONS,
    governanceContext: {
      rationale:
        'Recognized service providers offer operational services (monitoring, analytics, support) that the community relies on. Approval signals community trust and encourages a diverse provider ecosystem.',
      ratificationBody: 'Community Vote',
      postApprovalSteps: [
        'Provider listed in community service registry',
        'Provider displays governance-recognized status',
        'Annual review with community feedback mechanism',
      ],
      decentralizationImpact:
        'A competitive marketplace of community-recognized service providers reduces reliance on any single operator and fosters protocol resilience.',
    },
  },
  {
    id: 'op-aprv-indexer-operator',
    title: 'Indexer Operator Approval',
    operatorType: 'indexer-operator',
    operatorTypeName: 'Indexer Operator',
    minVotesRequired: 10,
    requiredProposerBadges: ['guardian'],
    sections: STANDARD_APPROVAL_SECTIONS,
    governanceContext: {
      rationale:
        'Indexer operators serve protocol state data to the community. Approval ensures indexer data integrity and community-trusted query surfaces.',
      ratificationBody: 'Governance Council',
      postApprovalSteps: [
        'Council records the approved indexer in the operator registry',
        'Indexer endpoint added to community API directory',
        'Operator submits monthly data integrity reports',
        'Annual renewal with data quality audit',
      ],
      decentralizationImpact:
        'Multiple community-run indexers ensure no single party controls protocol data access. This is foundational to trust-minimized verification.',
    },
  },
  {
    id: 'op-aprv-bridge-operator',
    title: 'Bridge Operator Approval',
    operatorType: 'bridge-operator',
    operatorTypeName: 'Bridge Operator',
    minVotesRequired: 20,
    requiredProposerBadges: ['guardian'],
    sections: STANDARD_APPROVAL_SECTIONS,
    governanceContext: {
      rationale:
        'Bridge operators run cross-chain relayers and validators. This is a high-trust role requiring super-majority council approval due to the financial and security implications.',
      ratificationBody: 'Governance Council (super-majority)',
      postApprovalSteps: [
        'Council records the approved bridge operator with super-majority vote',
        'Operator undergoes security review before activation',
        'Operator submits monthly bridge health and security reports',
        'Semi-annual renewal with security audit',
      ],
      decentralizationImpact:
        'Distributing bridge operation across multiple community-approved operators eliminates single points of failure in cross-chain infrastructure.',
    },
  },
  {
    id: 'op-aprv-oracle-operator',
    title: 'Oracle Operator Approval',
    operatorType: 'oracle-operator',
    operatorTypeName: 'Oracle Operator',
    minVotesRequired: 20,
    requiredProposerBadges: ['guardian'],
    sections: STANDARD_APPROVAL_SECTIONS,
    governanceContext: {
      rationale:
        'Oracle operators provide price feeds and data that protocol contracts depend on. Super-majority council approval is required due to direct financial impact on protocol users.',
      ratificationBody: 'Governance Council (super-majority)',
      postApprovalSteps: [
        'Council records the approved oracle operator with super-majority vote',
        'Operator undergoes data quality and security review',
        'Operator submits weekly data accuracy reports',
        'Semi-annual renewal with data quality audit',
      ],
      decentralizationImpact:
        'Multiple community-approved oracle operators create a robust, manipulation-resistant data layer. No single oracle operator can unilaterally influence protocol outcomes.',
    },
  },
];

/** Build operator approval templates filtered by optional criteria. */
export function buildOperatorApprovalTemplates(
  filterType?: OperatorType,
): OperatorApprovalProposalTemplate[] {
  return OPERATOR_APPROVAL_TEMPLATES.filter((t) => {
    if (filterType && t.operatorType !== filterType) return false;
    return true;
  });
}

/** Get a single operator approval template by ID. */
export function getOperatorApprovalTemplate(
  templateId: string,
): OperatorApprovalProposalTemplate | undefined {
  return OPERATOR_APPROVAL_TEMPLATES.find((t) => t.id === templateId);
}

/** Get the operator definition for a template. */
export function getOperatorDefinition(
  template: OperatorApprovalProposalTemplate,
): OperatorDefinition | undefined {
  return OPERATOR_DEFINITIONS.find((d) => d.type === template.operatorType);
}

export function getAllOperatorTypes(): OperatorType[] {
  return [...new Set(OPERATOR_DEFINITIONS.map((d) => d.type))];
}
