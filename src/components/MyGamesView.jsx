import React from 'react';
import { groupMyGamesByDate } from '../sports/selectors.js';
import { DaySection } from './DaySection.jsx';

export function MyGamesView({ games, now }) {
  const grouped = groupMyGamesByDate(games, now);
  const todayKey = now.toLocaleDateString('en-CA');

  if (!grouped.size) {
    return (
      <section className="empty-state">
        <div className="empty-state-mark">—</div>
        <h2>No priority games in view</h2>
        <p>Your selected sports don't have a game worth surfacing in the next seven days.</p>
      </section>
    );
  }

  return (
    <div className="my-games-list">
      {[...grouped.entries()].map(([dateKey, dayGames]) => (
        <DaySection key={dateKey} dateKey={dateKey} games={dayGames} todayKey={todayKey} />
      ))}
    </div>
  );
}
