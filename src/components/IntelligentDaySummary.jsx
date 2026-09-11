import React, { useMemo } from 'react';
import './IntelligentDaySummary.css';

const WATCH_TIERS = new Set(['must-watch', 'excellent', 'strong', 'worth-watching']);

function isWorthWatching(game) {
  return WATCH_TIERS.has(game.v2.tier.id);
}

export function IntelligentDaySummary({ games, date }) {
  const label = new Date(date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const summary = useMemo(() => {
    const sorted = [...games].sort((a, b) => b.v2.total - a.v2.total);
    return {
      total: games.length,
      meaningful: games.filter(isWorthWatching).length,
      favorites: games.filter((game) => game.v2.components.personal.score > 0).length,
      live: games.filter((game) => game.status.state === 'live').length,
      topScore: sorted[0]?.v2.total ?? null,
    };
  }, [games]);

  if (!summary.total) {
    return <div className="day-summary empty"><span className="day-kicker">Day summary</span><strong>{label}</strong><span>No games in your current sports scope.</span></div>;
  }

  return (
    <section className="day-summary" aria-label={`${label} summary`}>
      <div className="day-summary-heading">
        <div>
          <span className="day-kicker">Day summary</span>
          <h3>{label}</h3>
        </div>
        <div className="day-summary-count"><strong>{summary.topScore}</strong><span>top score</span></div>
      </div>
      <div className="day-summary-grid">
        <div><strong>{summary.total}</strong><span>games</span></div>
        <div><strong>{summary.meaningful}</strong><span>worth watching</span></div>
        <div><strong>{summary.favorites}</strong><span>your teams</span></div>
        {summary.live > 0 && <div><strong>{summary.live}</strong><span>live now</span></div>}
      </div>
    </section>
  );
}
