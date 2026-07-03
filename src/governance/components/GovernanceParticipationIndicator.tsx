import type { GovernanceParticipation } from '../types';
import { StreakDisplay } from './StreakDisplay';
import { BadgeDisplay } from './BadgeDisplay';
import { VotingActivitySummary } from './VotingActivitySummary';

interface GovernanceParticipationIndicatorProps {
  participation: GovernanceParticipation;
}

export function GovernanceParticipationIndicator({
  participation,
}: GovernanceParticipationIndicatorProps) {
  const { steward, streak, votingActivity, badges } = participation;

  return (
    <div className="governance-participation" data-testid="governance-participation">
      <div className="governance-header">
        <h3 className="governance-title">Governance Participation</h3>
        <span className="steward-name">{steward.name}</span>
        <div className="steward-roles">
          {steward.roles.map((role) => (
            <span key={role} className="steward-role-tag" data-testid={`role-${role}`}>
              {role}
            </span>
          ))}
        </div>
      </div>

      <div className="governance-sections">
        <section className="governance-section" data-testid="section-streak">
          <h4 className="section-title">Participation Streak</h4>
          <StreakDisplay streak={streak} />
        </section>

        <section className="governance-section" data-testid="section-voting">
          <h4 className="section-title">Voting Activity</h4>
          <VotingActivitySummary votingActivity={votingActivity} />
        </section>

        <section className="governance-section" data-testid="section-badges">
          <h4 className="section-title">Badges &amp; Roles</h4>
          <BadgeDisplay badges={badges} />
        </section>
      </div>
    </div>
  );
}
