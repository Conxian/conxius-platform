import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  GovernanceParticipationIndicator,
  StreakDisplay,
  BadgeDisplay,
  VotingActivitySummary,
} from '../components';
import type {
  GovernanceParticipation,
  ParticipationStreak,
  GovernanceBadge,
  RecentVotingActivity,
} from '../types';

const mockStreak: ParticipationStreak = {
  currentStreak: 7,
  longestStreak: 12,
  totalParticipations: 45,
  lastParticipationDate: new Date('2026-07-01'),
  streakPeriod: 'weekly',
};

const mockBadges: GovernanceBadge[] = [
  {
    id: 'first-vote',
    name: 'First Vote',
    description: 'Cast your first governance vote',
    icon: '🗳️',
    category: 'participation',
    tier: 'bronze',
  },
  {
    id: 'delegate',
    name: 'Delegate',
    description: 'Serving as an active governance delegate',
    icon: '🤝',
    category: 'leadership',
    tier: 'silver',
  },
  {
    id: 'guardian',
    name: 'Guardian',
    description: 'Serving as a governance guardian',
    icon: '🛡️',
    category: 'stewardship',
    tier: 'gold',
  },
];

const mockVotingActivity: RecentVotingActivity = {
  totalVotes: 8,
  participationRate: 80,
  recentVotes: [
    {
      id: 'v1',
      proposalId: 'p1',
      proposalTitle: 'Funding Round 4',
      voterId: 's1',
      choice: 'for',
      votingPower: 100,
      timestamp: new Date('2026-07-01'),
    },
    {
      id: 'v2',
      proposalId: 'p2',
      proposalTitle: 'Policy Amendment 12',
      voterId: 's1',
      choice: 'against',
      votingPower: 100,
      timestamp: new Date('2026-06-28'),
    },
  ],
  voteDistribution: { for: 5, against: 2, abstain: 1 },
};

const mockParticipation: GovernanceParticipation = {
  steward: {
    id: 's1',
    name: 'Alice',
    roles: ['contributor', 'delegate', 'guardian'],
    joinedAt: new Date('2025-01-01'),
    totalVotingPower: 500,
    activeDelegations: 2,
  },
  streak: mockStreak,
  votingActivity: mockVotingActivity,
  badges: mockBadges,
  recentDelegations: [],
  recentPolicyActivity: [],
  lastUpdated: new Date(),
};

describe('StreakDisplay', () => {
  it('renders the current streak count', () => {
    render(<StreakDisplay streak={mockStreak} />);
    expect(screen.getByTestId('governance-streak')).toBeDefined();
    expect(screen.getByText('7')).toBeDefined();
    expect(screen.getByText('12')).toBeDefined();
    expect(screen.getByText('45')).toBeDefined();
  });
});

describe('BadgeDisplay', () => {
  it('renders badges grouped by category', () => {
    render(<BadgeDisplay badges={mockBadges} />);
    expect(screen.getByTestId('governance-badges')).toBeDefined();
    expect(screen.getByTestId('badge-category-participation')).toBeDefined();
    expect(screen.getByTestId('badge-category-leadership')).toBeDefined();
    expect(screen.getByTestId('badge-category-stewardship')).toBeDefined();
  });

  it('shows empty state when no badges', () => {
    render(<BadgeDisplay badges={[]} />);
    expect(screen.getByText(/No badges earned yet/)).toBeDefined();
  });

  it('renders individual badge items', () => {
    render(<BadgeDisplay badges={mockBadges} />);
    expect(screen.getByTestId('badge-first-vote')).toBeDefined();
    expect(screen.getByTestId('badge-delegate')).toBeDefined();
    expect(screen.getByTestId('badge-guardian')).toBeDefined();
  });
});

describe('VotingActivitySummary', () => {
  it('renders voting statistics', () => {
    render(<VotingActivitySummary votingActivity={mockVotingActivity} />);
    expect(screen.getByTestId('voting-activity')).toBeDefined();
    expect(screen.getByText('8')).toBeDefined();
    expect(screen.getByText('80%')).toBeDefined();
  });

  it('renders recent vote rows', () => {
    render(<VotingActivitySummary votingActivity={mockVotingActivity} />);
    expect(screen.getByTestId('vote-v1')).toBeDefined();
    expect(screen.getByTestId('vote-v2')).toBeDefined();
    expect(screen.getByText('Funding Round 4')).toBeDefined();
  });
});

describe('GovernanceParticipationIndicator', () => {
  it('renders all governance sections', () => {
    render(<GovernanceParticipationIndicator participation={mockParticipation} />);
    expect(screen.getByTestId('governance-participation')).toBeDefined();
    expect(screen.getByTestId('section-streak')).toBeDefined();
    expect(screen.getByTestId('section-voting')).toBeDefined();
    expect(screen.getByTestId('section-badges')).toBeDefined();
  });

  it('displays steward name and roles', () => {
    render(<GovernanceParticipationIndicator participation={mockParticipation} />);
    expect(screen.getByText('Alice')).toBeDefined();
    expect(screen.getByTestId('role-contributor')).toBeDefined();
    expect(screen.getByTestId('role-delegate')).toBeDefined();
    expect(screen.getByTestId('role-guardian')).toBeDefined();
  });
});
