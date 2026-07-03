import { describe, it, expect } from 'vitest';
import {
  computeParticipationStreak,
  computeVotingActivity,
  computeGovernanceParticipation,
} from '../service';
import type { Vote, PolicyActivity, StewardProfile, Delegation } from '../types';

function makeVote(overrides: Partial<Vote> = {}): Vote {
  return {
    id: 'v1',
    proposalId: 'p1',
    proposalTitle: 'Test Proposal',
    voterId: 's1',
    choice: 'for',
    votingPower: 100,
    timestamp: new Date('2026-07-01'),
    ...overrides,
  };
}

function makePolicyActivity(overrides: Partial<PolicyActivity> = {}): PolicyActivity {
  return {
    id: 'pa1',
    policyId: 'pol1',
    policyName: 'Test Policy',
    stewardId: 's1',
    action: 'reviewed',
    timestamp: new Date('2026-07-01'),
    ...overrides,
  };
}

const baseSteward: StewardProfile = {
  id: 's1',
  name: 'Alice',
  roles: ['contributor', 'delegate'],
  joinedAt: new Date('2025-01-01'),
  totalVotingPower: 500,
  activeDelegations: 0,
};

describe('computeParticipationStreak', () => {
  it('returns zero streak for no activity', () => {
    const result = computeParticipationStreak([], []);
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
    expect(result.totalParticipations).toBe(0);
    expect(result.lastParticipationDate).toBeNull();
  });

  it('counts consecutive weekly activity from votes and policies', () => {
    const votes = [
      makeVote({ id: 'v1', proposalId: 'p1', timestamp: new Date('2026-07-01') }),
      makeVote({ id: 'v2', proposalId: 'p2', timestamp: new Date('2026-07-03') }),
    ];
    const policies = [
      makePolicyActivity({ id: 'pa1', timestamp: new Date('2026-06-28') }),
    ];
    const result = computeParticipationStreak(votes, policies);
    expect(result.currentStreak).toBeGreaterThanOrEqual(2);
    expect(result.totalParticipations).toBe(3);
  });

  it('breaks streak when activities are more than 7 days apart', () => {
    const votes = [
      makeVote({ id: 'v1', proposalId: 'p1', timestamp: new Date('2026-07-01') }),
      makeVote({ id: 'v2', proposalId: 'p2', timestamp: new Date('2026-07-20') }),
    ];
    const result = computeParticipationStreak(votes, []);
    expect(result.currentStreak).toBe(1);
  });

  it('tracks longest streak correctly', () => {
    const activities: PolicyActivity[] = [
      makePolicyActivity({ id: 'pa1', timestamp: new Date('2026-06-01') }),
      makePolicyActivity({ id: 'pa2', timestamp: new Date('2026-06-03') }),
      makePolicyActivity({ id: 'pa3', timestamp: new Date('2026-06-05') }),
      makePolicyActivity({ id: 'pa4', timestamp: new Date('2026-07-01') }),
    ];
    const result = computeParticipationStreak([], activities);
    expect(result.longestStreak).toBe(3);
    expect(result.currentStreak).toBe(1);
  });
});

describe('computeVotingActivity', () => {
  it('filters votes within the 90-day window', () => {
    const now = new Date();
    const recent = makeVote({
      id: 'v1',
      proposalId: 'p1',
      timestamp: new Date(now.getTime() - 5 * 86400000),
    });
    const old = makeVote({
      id: 'v2',
      proposalId: 'p2',
      timestamp: new Date(now.getTime() - 100 * 86400000),
    });

    const result = computeVotingActivity([recent, old], 10);
    expect(result.totalVotes).toBe(1);
  });

  it('calculates participation rate', () => {
    const votes = [
      makeVote({ id: 'v1', proposalId: 'p1' }),
      makeVote({ id: 'v2', proposalId: 'p2', choice: 'against' }),
      makeVote({ id: 'v3', proposalId: 'p3', choice: 'abstain' }),
    ];
    const result = computeVotingActivity(votes, 6);
    expect(result.participationRate).toBe(50);
    expect(result.voteDistribution.for).toBe(1);
    expect(result.voteDistribution.against).toBe(1);
    expect(result.voteDistribution.abstain).toBe(1);
  });

  it('returns zero participation when no proposals', () => {
    const result = computeVotingActivity([], 0);
    expect(result.participationRate).toBe(0);
    expect(result.totalVotes).toBe(0);
  });
});

describe('computeGovernanceParticipation', () => {
  it('returns a complete participation profile', () => {
    const votes = [
      makeVote({ id: 'v1', proposalId: 'p1', timestamp: new Date('2026-07-01') }),
      makeVote({ id: 'v2', proposalId: 'p2', timestamp: new Date('2026-07-03') }),
    ];
    const policies = [
      makePolicyActivity({ id: 'pa1', timestamp: new Date('2026-07-02') }),
    ];
    const delegations: Delegation[] = [];

    const result = computeGovernanceParticipation(
      baseSteward,
      votes,
      delegations,
      policies,
      5,
    );

    expect(result.steward).toBe(baseSteward);
    expect(result.streak.currentStreak).toBeGreaterThan(0);
    expect(result.votingActivity.totalVotes).toBe(2);
    expect(result.badges.length).toBeGreaterThan(0);
    expect(result.lastUpdated).toBeInstanceOf(Date);
  });

  it('includes badges aligned with steward roles', () => {
    const result = computeGovernanceParticipation(
      baseSteward,
      [makeVote()],
      [],
      [],
      1,
    );

    const badgeIds = result.badges.map((b) => b.id);
    expect(badgeIds).toContain('delegate');
    expect(badgeIds).toContain('first-vote');
  });
});
