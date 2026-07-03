import type {
  GovernanceParticipation,
  ParticipationStreak,
  RecentVotingActivity,
  StewardProfile,
  Vote,
  Delegation,
  PolicyActivity,
} from './types';
import { computeBadges } from './badges';

const VOTE_WINDOW_DAYS = 90;

export function computeParticipationStreak(
  votes: Vote[],
  policyActivities: PolicyActivity[],
): ParticipationStreak {
  const allTimestamps = [
    ...votes.map((v) => v.timestamp),
    ...policyActivities.map((p) => p.timestamp),
  ].sort((a, b) => b.getTime() - a.getTime());

  if (allTimestamps.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalParticipations: 0,
      lastParticipationDate: null,
      streakPeriod: 'weekly',
    };
  }

  let currentStreak = 1;
  let longestStreak = 1;
  let tempStreak = 1;
  let firstBreak = false;

  for (let i = 1; i < allTimestamps.length; i++) {
    const diff =
      allTimestamps[i - 1].getTime() - allTimestamps[i].getTime();
    if (diff <= 7 * 24 * 60 * 60 * 1000) {
      tempStreak++;
    } else {
      if (!firstBreak) {
        currentStreak = tempStreak;
        firstBreak = true;
      }
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);
  if (!firstBreak) {
    currentStreak = tempStreak;
  }

  return {
    currentStreak,
    longestStreak,
    totalParticipations: allTimestamps.length,
    lastParticipationDate: allTimestamps[0],
    streakPeriod: 'weekly',
  };
}

export function computeVotingActivity(
  votes: Vote[],
  totalOpenProposals: number,
): RecentVotingActivity {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - VOTE_WINDOW_DAYS);

  const recentVotes = votes
    .filter((v) => v.timestamp >= cutoff)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const distribution = { for: 0, against: 0, abstain: 0 };
  for (const v of recentVotes) {
    distribution[v.choice]++;
  }

  return {
    totalVotes: recentVotes.length,
    participationRate:
      totalOpenProposals > 0
        ? Math.round((recentVotes.length / totalOpenProposals) * 100)
        : 0,
    recentVotes: recentVotes.slice(0, 10),
    voteDistribution: distribution,
  };
}

export function computeGovernanceParticipation(
  steward: StewardProfile,
  votes: Vote[],
  delegations: Delegation[],
  policyActivities: PolicyActivity[],
  totalOpenProposals: number,
): GovernanceParticipation {
  const activeDelegations = delegations.filter((d) => d.active);
  const recentDelegations = [...delegations]
    .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
    .slice(0, 5);

  const recentPolicyActivity = [...policyActivities]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 10);

  return {
    steward,
    streak: computeParticipationStreak(votes, policyActivities),
    votingActivity: computeVotingActivity(votes, totalOpenProposals),
    badges: computeBadges(
      steward.roles,
      votes,
      policyActivities,
      steward.totalVotingPower,
      activeDelegations.length,
    ),
    recentDelegations,
    recentPolicyActivity,
    lastUpdated: new Date(),
  };
}
