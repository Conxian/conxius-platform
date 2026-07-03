export interface Vote {
  id: string;
  proposalId: string;
  proposalTitle: string;
  voterId: string;
  choice: 'for' | 'against' | 'abstain';
  votingPower: number;
  timestamp: Date;
}

export interface Delegation {
  id: string;
  delegatorId: string;
  delegateId: string;
  delegateName: string;
  votingPower: number;
  startDate: Date;
  endDate: Date | null;
  active: boolean;
}

export interface PolicyActivity {
  id: string;
  policyId: string;
  policyName: string;
  stewardId: string;
  action: 'created' | 'updated' | 'reviewed' | 'approved' | 'executed';
  timestamp: Date;
}

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

export interface GovernanceBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'participation' | 'leadership' | 'expertise' | 'stewardship';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export interface ParticipationStreak {
  currentStreak: number;
  longestStreak: number;
  totalParticipations: number;
  lastParticipationDate: Date | null;
  streakPeriod: 'daily' | 'weekly';
}

export interface RecentVotingActivity {
  totalVotes: number;
  participationRate: number;
  recentVotes: Vote[];
  voteDistribution: {
    for: number;
    against: number;
    abstain: number;
  };
}

export interface GovernanceParticipation {
  steward: StewardProfile;
  streak: ParticipationStreak;
  votingActivity: RecentVotingActivity;
  badges: GovernanceBadge[];
  recentDelegations: Delegation[];
  recentPolicyActivity: PolicyActivity[];
  lastUpdated: Date;
}
