import type { GovernanceBadge, StewardRole, Vote, PolicyActivity } from './types';

export const BADGE_DEFINITIONS: Record<string, Omit<GovernanceBadge, 'id'>> = {
  'first-vote': {
    name: 'First Vote',
    description: 'Cast your first governance vote',
    icon: '🗳️',
    category: 'participation',
    tier: 'bronze',
  },
  'consistent-voter': {
    name: 'Consistent Voter',
    description: 'Voted in 5 consecutive proposals',
    icon: '✅',
    category: 'participation',
    tier: 'silver',
  },
  'vote-streak-10': {
    name: 'Decade of Voice',
    description: 'Maintained a 10-vote participation streak',
    icon: '🔥',
    category: 'participation',
    tier: 'gold',
  },
  'vote-streak-25': {
    name: 'Voice of the Realm',
    description: 'Maintained a 25-vote participation streak',
    icon: '👑',
    category: 'participation',
    tier: 'platinum',
  },
  'delegate': {
    name: 'Delegate',
    description: 'Serving as an active governance delegate',
    icon: '🤝',
    category: 'leadership',
    tier: 'silver',
  },
  'policy-author': {
    name: 'Policy Author',
    description: 'Authored governance policies',
    icon: '📜',
    category: 'expertise',
    tier: 'silver',
  },
  'guardian': {
    name: 'Guardian',
    description: 'Serving as a governance guardian',
    icon: '🛡️',
    category: 'stewardship',
    tier: 'gold',
  },
  'council': {
    name: 'Council Member',
    description: 'Serving on the governance council',
    icon: '🏛️',
    category: 'stewardship',
    tier: 'platinum',
  },
  'policy-shaper': {
    name: 'Policy Shaper',
    description: 'Reviewed or approved 10+ policies',
    icon: '🔨',
    category: 'expertise',
    tier: 'gold',
  },
  'community-pillar': {
    name: 'Community Pillar',
    description: 'Active participant with high voting power and delegation',
    icon: '🏆',
    category: 'stewardship',
    tier: 'platinum',
  },
};

export const ROLE_BADGE_MAP: Record<StewardRole, string[]> = {
  'member': [],
  'contributor': ['first-vote', 'consistent-voter'],
  'delegate': ['delegate'],
  'policy-author': ['policy-author'],
  'guardian': ['guardian'],
  'council': ['council'],
};

export function computeBadges(
  roles: StewardRole[],
  votes: Vote[],
  policyActivities: PolicyActivity[],
  votingPower: number,
  activeDelegationCount: number,
): GovernanceBadge[] {
  const earned = new Map<string, GovernanceBadge>();

  const award = (id: string) => {
    const def = BADGE_DEFINITIONS[id];
    if (def && !earned.has(id)) {
      earned.set(id, { id, ...def });
    }
  };

  for (const role of roles) {
    for (const badgeId of ROLE_BADGE_MAP[role] ?? []) {
      award(badgeId);
    }
  }

  if (votes.length > 0) {
    award('first-vote');
  }

  const consecutiveVotes = computeConsecutiveVotes(votes);
  if (consecutiveVotes >= 5) award('consistent-voter');
  if (consecutiveVotes >= 10) award('vote-streak-10');
  if (consecutiveVotes >= 25) award('vote-streak-25');

  const policyReviewCount = policyActivities.filter(
    (a) => a.action === 'reviewed' || a.action === 'approved',
  ).length;
  if (policyReviewCount >= 10) award('policy-shaper');

  if (votingPower > 1000 && activeDelegationCount > 0) {
    award('community-pillar');
  }

  return Array.from(earned.values());
}

function computeConsecutiveVotes(votes: Vote[]): number {
  if (votes.length === 0) return 0;

  const sorted = [...votes].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
  );

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff =
      sorted[i - 1].timestamp.getTime() - sorted[i].timestamp.getTime();
    if (diff <= 7 * 24 * 60 * 60 * 1000) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
