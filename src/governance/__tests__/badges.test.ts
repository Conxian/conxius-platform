import { describe, it, expect } from 'vitest';
import { computeBadges, BADGE_DEFINITIONS, ROLE_BADGE_MAP } from '../badges';
import type { Vote, PolicyActivity, StewardRole } from '../types';

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

describe('computeBadges', () => {
  it('returns role-based badges for steward roles', () => {
    const badges = computeBadges(['delegate', 'guardian'], [], [], 0, 0);
    const ids = badges.map((b) => b.id);
    expect(ids).toContain('delegate');
    expect(ids).toContain('guardian');
  });

  it('awards first-vote badge when votes exist', () => {
    const badges = computeBadges(['member'], [makeVote()], [], 0, 0);
    expect(badges.map((b) => b.id)).toContain('first-vote');
  });

  it('awards consistent-voter for 5 consecutive weekly votes', () => {
    const votes = [0, 1, 2, 3, 4].map((week) =>
      makeVote({
        id: `v${week}`,
        proposalId: `p${week}`,
        timestamp: new Date(`2026-07-0${week + 1}`),
      }),
    );
    const badges = computeBadges(['member'], votes, [], 0, 0);
    expect(badges.map((b) => b.id)).toContain('consistent-voter');
  });

  it('awards vote-streak-10 for 10 consecutive votes', () => {
    const votes = Array.from({ length: 10 }, (_, i) =>
      makeVote({
        id: `v${i}`,
        proposalId: `p${i}`,
        timestamp: new Date(2026, 6, i + 1),
      }),
    );
    const badges = computeBadges(['member'], votes, [], 0, 0);
    const ids = badges.map((b) => b.id);
    expect(ids).toContain('vote-streak-10');
  });

  it('awards vote-streak-25 for 25 consecutive votes', () => {
    const votes = Array.from({ length: 25 }, (_, i) =>
      makeVote({
        id: `v${i}`,
        proposalId: `p${i}`,
        timestamp: new Date(2026, 6, i + 1),
      }),
    );
    const badges = computeBadges(['member'], votes, [], 0, 0);
    const ids = badges.map((b) => b.id);
    expect(ids).toContain('vote-streak-25');
  });

  it('awards policy-shaper for 10+ policy reviews/approvals', () => {
    const activities = Array.from({ length: 10 }, (_, i) =>
      makePolicyActivity({
        id: `pa${i}`,
        action: i % 2 === 0 ? 'reviewed' : 'approved',
        timestamp: new Date(2026, 6, i + 1),
      }),
    );
    const badges = computeBadges(['member'], [], activities, 0, 0);
    expect(badges.map((b) => b.id)).toContain('policy-shaper');
  });

  it('awards community-pillar for high voting power with delegations', () => {
    const badges = computeBadges(['member'], [], [], 2000, 3);
    expect(badges.map((b) => b.id)).toContain('community-pillar');
  });

  it('does not award community-pillar without delegations', () => {
    const badges = computeBadges(['member'], [], [], 2000, 0);
    expect(badges.map((b) => b.id)).not.toContain('community-pillar');
  });

  it('returns empty badges for new member with no activity', () => {
    const badges = computeBadges(['member'], [], [], 0, 0);
    expect(badges).toHaveLength(0);
  });

  it('does not break streak for votes more than 7 days apart', () => {
    const votes = [
      makeVote({ id: 'v1', proposalId: 'p1', timestamp: new Date('2026-07-01') }),
      makeVote({ id: 'v2', proposalId: 'p2', timestamp: new Date('2026-07-03') }),
      makeVote({ id: 'v3', proposalId: 'p3', timestamp: new Date('2026-07-20') }),
    ];
    const badges = computeBadges(['member'], votes, [], 0, 0);
    expect(badges.map((b) => b.id)).not.toContain('consistent-voter');
  });
});

describe('BADGE_DEFINITIONS', () => {
  it('has definitions for all expected badges', () => {
    expect(BADGE_DEFINITIONS).toHaveProperty('first-vote');
    expect(BADGE_DEFINITIONS).toHaveProperty('consistent-voter');
    expect(BADGE_DEFINITIONS).toHaveProperty('vote-streak-10');
    expect(BADGE_DEFINITIONS).toHaveProperty('vote-streak-25');
    expect(BADGE_DEFINITIONS).toHaveProperty('delegate');
    expect(BADGE_DEFINITIONS).toHaveProperty('guardian');
    expect(BADGE_DEFINITIONS).toHaveProperty('council');
    expect(BADGE_DEFINITIONS).toHaveProperty('community-pillar');
  });
});

describe('ROLE_BADGE_MAP', () => {
  it('maps roles to appropriate badges', () => {
    expect(ROLE_BADGE_MAP['member']).toEqual([]);
    expect(ROLE_BADGE_MAP['delegate']).toContain('delegate');
    expect(ROLE_BADGE_MAP['guardian']).toContain('guardian');
    expect(ROLE_BADGE_MAP['council']).toContain('council');
  });

  it('covers all StewardRole values', () => {
    const roles: StewardRole[] = [
      'member',
      'contributor',
      'delegate',
      'policy-author',
      'guardian',
      'council',
    ];
    for (const role of roles) {
      expect(ROLE_BADGE_MAP).toHaveProperty(role);
    }
  });
});
