import React from 'react';
import { Radio } from 'lucide-react';
import { getMyGamesSections } from '../sports/selectors.js';
import { GameCard } from './GameCard.jsx';
import './MyGamesView.css';

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
  const todayNonLive = today.filter((game) => game.status !== 'live');
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
        <div className="my-games-title-block">
          <span className="day-kicker">My Games</span>
          <h1>What matters today</h1>
          <p>Live first. Then the strongest games from your category scope.</p>
        </div>
        <div className="signal-status"><span className="signal-status-dot" />Signal active</div>
      </header>

      {liveGames.length > 0 && (
        <section className="live-center" aria-label="Live games">
          <div className="live-center-header">
            <div>
              <span className="day-kicker live-kicker"><span className="live-pulse" />Live now</span>
              <h2>Games happening now</h2>
            </div>
            <span>{liveGames.length} live</span>
          </div>
          <div className="live-center-grid">
            {liveGames.map((game) => <GameCard key={game.id} game={game} onOpen={onOpenGame} />)}
          </div>
        </section>
      )}

      <div className="my-games-sections">
        <Section
          eyebrow="Today"
          title={liveGames.length > 0 ? "Today's remaining games" : "Today's Games"}
          games={todayNonLive}
          onOpenGame={onOpenGame}
          emptyMessage={liveGames.length > 0 ? 'Live games are above. Nothing else from your category scope is scheduled today.' : 'No games from your category scope today.'}
        />

        <Section
          eyebrow="Next 6 Days"
          title="Next 6 Days"
          games={upcoming}
          onOpenGame={onOpenGame}
          emptyMessage="No games from your category scope in the next six days."
        />
      </div>
    </div>
  );
}
