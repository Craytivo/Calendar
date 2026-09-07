import React from 'react';
import { ArrowUpRight, CalendarDays, Radio, Sparkles, Trophy } from 'lucide-react';
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
  const hasGames = today.length > 0 || upcoming.length > 0;
  const nextGame = today.find((game) => game.status === 'scheduled') || upcoming.find((game) => game.status === 'scheduled') || upcoming[0];
  const favoriteGames = [...today, ...upcoming].filter((game) => game.homeTeam?.favorite || game.awayTeam?.favorite);

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
          <h1>Your highest-signal games</h1>
          <p>Live first, then the most important games from your seven-day window.</p>
        </div>
        <div className="signal-status"><span className="signal-status-dot" />Signal active</div>
      </header>

      <div className="my-games-overview" aria-label="Sports calendar overview">
        <div className="overview-stat overview-live">
          <span className="overview-icon"><Radio size={15} /></span>
          <div><strong>{liveGames.length}</strong><span>Live now</span></div>
        </div>
        <div className="overview-stat">
          <span className="overview-icon"><CalendarDays size={15} /></span>
          <div><strong>{today.length}</strong><span>Today</span></div>
        </div>
        <div className="overview-stat">
          <span className="overview-icon"><Trophy size={15} /></span>
          <div><strong>{favoriteGames.length}</strong><span>Favorites</span></div>
        </div>
        <div className="overview-stat overview-window">
          <span className="overview-icon"><Sparkles size={15} /></span>
          <div><strong>7</strong><span>Day signal</span></div>
        </div>
      </div>

      {liveGames.length > 0 && (
        <section className="live-center" aria-label="Live games">
          <div className="live-center-header">
            <div><span className="day-kicker live-kicker"><span className="live-pulse" />Live center</span><h2>Games happening now</h2></div>
            <span>{liveGames.length} live</span>
          </div>
          <div className="live-center-grid">
            {liveGames.map((game) => <GameCard key={game.id} game={game} compact onOpen={onOpenGame} />)}
          </div>
        </section>
      )}

      {nextGame && (
        <button type="button" className="next-up-card" onClick={() => onOpenGame?.(nextGame)}>
          <div className="next-up-copy">
            <span className="day-kicker">Next up</span>
            <strong>{nextGame.homeTeam?.name || 'Home'} <span>vs</span> {nextGame.awayTeam?.name || 'Away'}</strong>
            <p>{new Date(nextGame.startTime).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })} · {new Date(nextGame.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
          </div>
          <span className="next-up-action"><ArrowUpRight size={17} /></span>
        </button>
      )}

      <div className="my-games-sections">
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
    </div>
  );
}
