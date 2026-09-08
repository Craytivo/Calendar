import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { getPriorityReasons, getPriorityScore, getPriorityTier, getLeaguePriority } from '../sports/priority.js';
import { getWatchScore } from '../sports/watchability.js';
import { getLiveGameSignal } from '../sports/game-intelligence.js';
import { GameCard } from './GameCard.jsx';
import './NextUp.css';

function isFutureScheduled(game, now) {
  return game.status === 'scheduled' && new Date(game.startTime).getTime() >= new Date(now).getTime();
}

function score(game) {
  return (getPriorityTier(game) * -1000) + getPriorityScore(game) * 10 + getWatchScore(game) - getLeaguePriority(game.leagueId) * 0.1;
}

export function getNextUpGame(games, now = new Date()) {
  return games.filter((game) => isFutureScheduled(game, now)).sort((a, b) => score(b) - score(a) || new Date(a.startTime) - new Date(b.startTime))[0] ?? null;
}

export function NextUp({ games, now, onOpenGame }) {
  const game = getNextUpGame(games, now);
  if (!game) return null;
  const reasons = getPriorityReasons(game);
  const signal = getLiveGameSignal(game);
  const start = new Date(game.startTime);
  const mins = Math.max(0, Math.round((start.getTime() - new Date(now).getTime()) / 60000));
  const countdown = mins < 60 ? `Starts in ${mins}m` : mins < 1440 ? `Starts in ${Math.floor(mins / 60)}h` : `Starts ${start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`;

  return <section className="next-up" aria-label="Next up">
    <div className="next-up-header"><div><span className="day-kicker">Next up</span><h2>The next game worth watching</h2></div><span className="next-up-countdown">{countdown}</span></div>
    <div className="next-up-content">
      <div className="next-up-card"><GameCard game={game} onOpen={onOpenGame} /></div>
      <div className="next-up-reason">
        <span className="next-up-label">Why it matters</span>
        <h3>{reasons[0] || signal.reason || 'High-value matchup'}</h3>
        <p>{reasons.slice(1).join(' · ') || 'Selected from your priorities, stakes and watchability.'}</p>
        <button type="button" onClick={() => onOpenGame(game)}>Open game <ArrowUpRight size={14} strokeWidth={2.2} /></button>
      </div>
    </div>
  </section>;
}
