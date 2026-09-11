import React from 'react';
import { scoreGameV2 } from '../sports/scoring/index-v2.js';
import { GameCard } from './GameCard.jsx';
import './NextUp.css';

function isFutureScheduled(game, now) {
  return game.status === 'scheduled' && new Date(game.startTime).getTime() >= new Date(now).getTime();
}

function score(game) {
  return scoreGameV2(game).total;
}

export function getNextUpGame(games, now = new Date()) {
  return games
    .filter((game) => isFutureScheduled(game, now))
    .sort((a, b) => score(b) - score(a) || new Date(a.startTime) - new Date(b.startTime))[0] ?? null;
}

export function NextUp({ games, now, onOpenGame }) {
  const game = getNextUpGame(games, now);
  if (!game) return null;

  const start = new Date(game.startTime);
  const mins = Math.max(0, Math.round((start.getTime() - new Date(now).getTime()) / 60000));
  const countdown = mins < 60
    ? `Starts in ${mins}m`
    : mins < 1440
      ? `Starts in ${Math.floor(mins / 60)}h`
      : `Starts ${start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`;

  return (
    <section className="next-up" aria-label="Next up">
      <div className="next-up-header">
        <div>
          <span className="day-kicker">Next up</span>
          <h2>The next game on your calendar</h2>
        </div>
        <span className="next-up-countdown">{countdown}</span>
      </div>
      <div className="next-up-card">
        <GameCard game={game} onOpen={onOpenGame} />
      </div>
    </section>
  );
}
