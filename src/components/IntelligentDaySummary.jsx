import React from 'react';
import { getDaySummary } from '../sports/day-intelligence.js';
import { getGameScore, getGameScoreLevel } from '../sports/game-score.js';
import { getDisplayTeamName } from './TeamMark.jsx';
import './IntelligentDaySummary.css';

export function IntelligentDaySummary({ games, date, onOpenGame }) {
  const summary = getDaySummary(games, date);
  const label = new Date(date).toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric' });
  if (!summary.total) return <div className="day-summary empty"><span className="day-kicker">Day summary</span><strong>{label}</strong><span>No games in your current sports scope.</span></div>;
  const topScore = summary.topGame ? getGameScore(summary.topGame) : 0;
  const topLevel = getGameScoreLevel(topScore);
  return <section className="day-summary" aria-label={`${label} summary`}>
    <div className="day-summary-heading"><div><span className="day-kicker">Day summary</span><h3>{label}</h3></div><div className="day-summary-count"><strong>{summary.meaningful}</strong><span>worth watching</span></div></div>
    <div className="day-summary-grid">
      <div><strong>{summary.total}</strong><span>games</span></div>
      <div><strong>{summary.favorites}</strong><span>your teams</span></div>
      {summary.live > 0 && <div><strong>{summary.live}</strong><span>live now</span></div>}
    </div>
    {summary.topGame && <button type="button" className={`day-summary-feature score-${topLevel.toLowerCase()}`} onClick={() => onOpenGame?.(summary.topGame)}>
      <div className="day-summary-feature-copy"><div className="day-summary-feature-label"><span>Game of the day</span><strong className="day-summary-score">{topScore}<small>score</small></strong></div>
        <strong className="day-summary-matchup">{getDisplayTeamName(summary.topGame.awayTeam)} at {getDisplayTeamName(summary.topGame.homeTeam)}</strong>
        <small>{summary.reasons.join(' · ') || 'Highest-value game in your scope'}</small>
      </div><span className="day-summary-arrow">Open</span>
    </button>}
  </section>;
}
