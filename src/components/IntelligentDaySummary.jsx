import React from 'react';
import { getDaySummary } from '../sports/day-intelligence.js';
import { getDisplayTeamName } from './TeamMark.jsx';
import './IntelligentDaySummary.css';

export function IntelligentDaySummary({ games, date, onOpenGame }) {
  const summary = getDaySummary(games, date);
  const label = new Date(date).toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric' });
  if (!summary.total) return <div className="day-summary empty"><span className="day-kicker">Day summary</span><strong>{label}</strong><span>No games in your current sports scope.</span></div>;
  return <section className="day-summary" aria-label={`${label} summary`}>
    <div className="day-summary-heading"><div><span className="day-kicker">Day summary</span><h3>{label}</h3></div><div className="day-summary-count"><strong>{summary.meaningful}</strong><span>worth watching</span></div></div>
    <div className="day-summary-grid">
      <div><strong>{summary.total}</strong><span>games</span></div>
      <div><strong>{summary.favorites}</strong><span>your teams</span></div>
      {summary.live > 0 && <div><strong>{summary.live}</strong><span>live now</span></div>}
    </div>
    {summary.topGame && <button type="button" className="day-summary-feature" onClick={() => onOpenGame?.(summary.topGame)}><div><span>Game of the day</span><strong>{getDisplayTeamName(summary.topGame.awayTeam)} at {getDisplayTeamName(summary.topGame.homeTeam)}</strong><small>{summary.reasons.join(' · ') || 'Highest-value game in your scope'}</small></div><span className="day-summary-arrow">View</span></button>}
  </section>;
}
