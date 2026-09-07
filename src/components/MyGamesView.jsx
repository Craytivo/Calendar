import React from 'react';
import { Radio } from 'lucide-react';
import { getMyGamesSections } from '../sports/selectors.js';
import { GameCard } from './GameCard.jsx';

function Section({ eyebrow, title, games, emptyMessage, onOpenGame }) {
  return (
    <section className="my-games-section">
      <div className="my-games-section-heading">
        <div>
          <span className="day-kicker">{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        {games.length > 0 && <span className="section-count">{games.length} {games.length === 1 ? 'game' : 'games'}</span>}
      </div>

      {games.length > 0 ? (
        <div className="my-games-cards">
          {games.map((game) => <GameCard key={game.id} game={game} onOpen={onOpenGame} />)}
        </div>
      ) : (
        <div className="section-empty">{emptyMessage}</div>
      )}
    </section>
  );
}

export function MyGamesView({ games, now, onOpenGame }) {
  const { today, upcoming } = getMyGamesSections(games, now);
  const liveGames = today.filter((game) => game.status === 'live');
  const hasGames = today.length > 0 || upcoming.length > 0;

  if (!hasGames) {
    return (
      <section className="empty-state">
        <div className="empty-state-mark">—</div>
        <h2>No games in view</h2>
        <p>Your selected sports don't have any games in your category scope over the next seven days.</p>
      </section>
    );
  }

  return (
    <div className="my-games-list">
      <header className="my-games-intro">
        <span className="day-kicker">My Games</span>
        <h1>Your highest-signal games</h1>
        <p>Live first, then the most important games from your seven-day window.</p>
      </header>

      {liveGames.length > 0 && (
        <div className="live-now-banner" aria-label={`${liveGames.length} live game${liveGames.length === 1 ? '' : 's'}`}>
          <Radio size={15} />
          <strong>LIVE NOW</strong>
          <span>{liveGames.length} game{liveGames.length === 1 ? '' : 's'} in progress</span>
        </div>
      )}

      <Section
        eyebrow="Today"
        title="Today's Games"
        games={today}
        onOpenGame={onOpenGame}
        emptyMessage="No games from your category scope today."
      />

      <Section
        eyebrow="Next 6 Days"
        title="Next 6 Days"
        games={upcoming}
        onOpenGame={onOpenGame}
        emptyMessage="No games from your category scope in the next six days."
      />
    </div>
  );
}
