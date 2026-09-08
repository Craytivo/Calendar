import React from 'react';
import { GameCard } from './GameCard.jsx';
import { getPriorityLabel, getPriorityTier } from '../sports/priority.js';

function isToday(game, now) {
  const a = new Date(game.startTime);
  const b = new Date(now);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function priorityRank(game) {
  return getPriorityTier(game);
}

export function TodayBrief({ games, now, onOpenGame }) {
  const today = games.filter((game) => isToday(game, now));
  const live = today.filter((game) => game.status === 'live').sort((a, b) => priorityRank(a) - priorityRank(b));
  const priority = today.filter((game) => game.status !== 'live' && priorityRank(game) <= 3).sort((a, b) => priorityRank(a) - priorityRank(b) || new Date(a.startTime) - new Date(b.startTime));
  const next = today.filter((game) => game.status === 'scheduled').sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  const highlights = [...live, ...priority, ...next.filter((game) => !priority.some((item) => item.id === game.id))].filter((game, index, list) => list.findIndex((item) => item.id === game.id) === index).slice(0, 4);

  return (
    <section className="today-brief" aria-label="Today's games">
      <div className="today-brief-heading">
        <div>
          <span className="day-kicker">Today · Decision view</span>
          <h2>What matters today</h2>
          <p>{live.length ? `${live.length} live now. ` : ''}{priority.length ? `${priority.length} priority ${priority.length === 1 ? 'game' : 'games'}.` : 'Your strongest games are ready when you are.'}</p>
        </div>
        <div className="today-brief-stats">
          <span><strong>{today.length}</strong> games</span>
          <span><strong>{priority.length}</strong> priority</span>
        </div>
      </div>
      {highlights.length > 0 ? (
        <div className="today-brief-grid">
          {highlights.map((game) => <div key={game.id} className="today-brief-card"><GameCard game={game} onOpen={onOpenGame} /></div>)}
        </div>
      ) : (
        <div className="today-brief-empty">Nothing from your current sports scope is scheduled today.</div>
      )}
      {priority.length > 0 && <div className="today-brief-footer"><span>Priority is based on your teams, major events, rankings and meaningful stakes.</span><span>{getPriorityLabel(priority[0])}</span></div>}
    </section>
  );
}
