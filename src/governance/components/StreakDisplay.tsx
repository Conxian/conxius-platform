import type { ParticipationStreak } from '../types';

interface StreakDisplayProps {
  streak: ParticipationStreak;
}

const streakGradient = (count: number): string => {
  if (count >= 25) return 'from-amber-500 to-orange-600';
  if (count >= 10) return 'from-yellow-400 to-amber-500';
  if (count >= 5) return 'from-slate-400 to-slate-500';
  return 'from-slate-300 to-slate-400';
};

export function StreakDisplay({ streak }: StreakDisplayProps) {
  const { currentStreak, longestStreak, totalParticipations } = streak;

  return (
    <div className="governance-streak" data-testid="governance-streak">
      <div className="streak-current" data-testid="streak-current">
        <span className={`streak-flame bg-gradient-to-r ${streakGradient(currentStreak)}`}>
          🔥
        </span>
        <span className="streak-count">{currentStreak}</span>
        <span className="streak-label">week streak</span>
      </div>
      <div className="streak-details">
        <div className="streak-stat">
          <span className="stat-value">{longestStreak}</span>
          <span className="stat-label">best streak</span>
        </div>
        <div className="streak-stat">
          <span className="stat-value">{totalParticipations}</span>
          <span className="stat-label">total actions</span>
        </div>
      </div>
    </div>
  );
}
