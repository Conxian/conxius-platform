import type { GovernanceBadge } from '../types';

interface BadgeDisplayProps {
  badges: GovernanceBadge[];
}

const tierColors: Record<string, string> = {
  bronze: 'badge-bronze',
  silver: 'badge-silver',
  gold: 'badge-gold',
  platinum: 'badge-platinum',
};

export function BadgeDisplay({ badges }: BadgeDisplayProps) {
  if (badges.length === 0) {
    return (
      <div className="governance-badges" data-testid="governance-badges">
        <p className="badges-empty">No badges earned yet. Participate in governance to earn badges.</p>
      </div>
    );
  }

  const byCategory = badges.reduce(
    (acc, badge) => {
      (acc[badge.category] ??= []).push(badge);
      return acc;
    },
    {} as Record<string, GovernanceBadge[]>,
  );

  return (
    <div className="governance-badges" data-testid="governance-badges">
      {Object.entries(byCategory).map(([category, categoryBadges]) => (
        <div key={category} className="badge-category" data-testid={`badge-category-${category}`}>
          <h4 className="badge-category-title">{category}</h4>
          <div className="badge-list">
            {categoryBadges.map((badge) => (
              <div
                key={badge.id}
                className={`badge-item ${tierColors[badge.tier]}`}
                data-testid={`badge-${badge.id}`}
                title={badge.description}
              >
                <span className="badge-icon">{badge.icon}</span>
                <span className="badge-name">{badge.name}</span>
                <span className="badge-tier">{badge.tier}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
