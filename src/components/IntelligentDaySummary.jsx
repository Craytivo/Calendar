import React, { useMemo } from 'react';
import { getDisplayTeamName } from './TeamMark.jsx';
import './IntelligentDaySummary.css';

const WATCH_TIERS = new Set(['must-watch', 'excellent', 'strong', 'worth-watching']);

function isWorthWatching(game) {
  return WATCH_TIERS.has(game.v2.tier.id);
}

export function IntelligentDaySummary({ games, date, onOpenGame }) {
  const label = new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const summary = useMemo(() => {
    const sorted = [...games].sort((a, b) => b.v2.total - a.v2.total);
    return {
      total: games.length,
      meaningful: games.filter(isWorthWatching).length,
      favorites: games.filter((game) => game.v2.components.personal.score > 0).length,
      live: games.filter((game) => game.status.state === 'live').length,
      topGame: sorted[0] ?? null,
    };
  }, [games]);

  if (!summary.total) {
    return <div className="day-summary empty"><span className="day-kicker">Day summary</span><strong>{label}</strong><span>No games in your current sports scope.</span></div>;
  }

  const topGame = summary.topGame;
  const topLevel = topGame?.live?.level ?? 'LOW';

  return (
    <section className="day-summary" aria-label={`${label} summary`}>
      <div className="day-summary-heading">
        <div><span className="day-kicker">Day summary</span><h3>{label}</h3></div>
        <div className="day-summary-count"><strong>{summary.meaningful}</strong><span>worth watching</span></div>
      </div>
      <div className="day-summary-grid">
        <div><strong>{summary.total}</strong><span>games</span></div>
        <div><strong>{summary.favorites}</strong><span>your teams</span></div>
        {summary.live > 0 && <div><strong>{summary.live}</strong><span>live now</span></div>}
      </div>
      {topGame && <button type="button" className={`day-summary-feature score-${topLevel.toLowerCase()}`} onClick={() => onOpenGame?.(topGame)}>
        <div className="day-summary-feature-copy">
          <div className="day-summary-feature-label"><span>Game of the day</span><strong className="day-summary-score">{topGame.v2.total}<small>score</small></strong></div>
          <strong className="day-summary-matchup">{getDisplayTeamName(topGame.teams.away)} at {getDisplayTeamName(topGame.teams.home)}</strong>
          <small>{[topGame.explanation.primary, topGame.explanation.secondary].filter(Boolean).join(' · ') || 'Highest-value game in your scope'}</small>
        </div>
        <span className="day-summary-arrow">Open</span>
      </button>}
    </section>
  );
}
