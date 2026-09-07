import React from 'react';
import { GameCard } from './GameCard.jsx';

function dayLabel(dateKey, todayKey) {
  const date = new Date(`${dateKey}T12:00:00`);
  const formatted = date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  return dateKey === todayKey ? `Today · ${formatted.replace(/^\w+ /, '')}` : formatted;
}

export function DaySection({ dateKey, games, todayKey }) {
  return (
    <section className={`day-section ${dateKey === todayKey ? 'today' : ''}`}>
      <div className="day-heading">
        <div>
          <span className="day-kicker">{dateKey === todayKey ? 'Today' : new Date(`${dateKey}T12:00:00`).toLocaleDateString([], { weekday: 'short' })}</span>
          <h2>{dayLabel(dateKey, todayKey)}</h2>
        </div>
        <span className="day-count">{games.length} {games.length === 1 ? 'game' : 'games'}</span>
      </div>
      <div className="day-games">
        {games.map((game) => <GameCard key={game.id} game={game} />)}
      </div>
    </section>
  );
}
