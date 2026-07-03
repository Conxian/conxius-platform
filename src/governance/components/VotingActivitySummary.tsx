import type { RecentVotingActivity, Vote } from '../types';

interface VotingActivitySummaryProps {
  votingActivity: RecentVotingActivity;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function VoteRow({ vote }: { vote: Vote }) {
  const choiceColors: Record<string, string> = {
    for: 'text-emerald-600',
    against: 'text-red-600',
    abstain: 'text-slate-500',
  };

  return (
    <li className="vote-row" data-testid={`vote-${vote.id}`}>
      <span className={`vote-choice ${choiceColors[vote.choice]}`}>
        {vote.choice.toUpperCase()}
      </span>
      <span className="vote-proposal">{vote.proposalTitle}</span>
      <span className="vote-power">{vote.votingPower} VP</span>
      <span className="vote-date">{formatDate(vote.timestamp)}</span>
    </li>
  );
}

export function VotingActivitySummary({ votingActivity }: VotingActivitySummaryProps) {
  const { totalVotes, participationRate, recentVotes, voteDistribution } =
    votingActivity;

  return (
    <div className="voting-activity" data-testid="voting-activity">
      <div className="voting-stats">
        <div className="voting-stat" data-testid="stat-total-votes">
          <span className="stat-value">{totalVotes}</span>
          <span className="stat-label">recent votes</span>
        </div>
        <div className="voting-stat" data-testid="stat-participation-rate">
          <span className="stat-value">{participationRate}%</span>
          <span className="stat-label">participation</span>
        </div>
        <div className="voting-stat" data-testid="stat-for">
          <span className="stat-value">{voteDistribution.for}</span>
          <span className="stat-label">for</span>
        </div>
        <div className="voting-stat" data-testid="stat-against">
          <span className="stat-value">{voteDistribution.against}</span>
          <span className="stat-label">against</span>
        </div>
      </div>

      {recentVotes.length > 0 && (
        <div className="recent-votes">
          <h4 className="recent-votes-title">Recent Votes</h4>
          <ul className="vote-list">
            {recentVotes.map((vote) => (
              <VoteRow key={vote.id} vote={vote} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
