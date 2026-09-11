import React, { useMemo } from 'react';
import { GameCard } from './GameCard.jsx';
import './MyGamesView.css';

const SECTION_LIMIT = 5;
const WINDOW_DAYS = 7;

function startOfDay(date) {
  const value = new Date(date);
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function localDateKey(date) {
  const value = new Date(date);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function isCurrentDay(game, now) {
  return localDateKey(game.schedule.startTime) === localDateKey(now);
}

function isFavoriteGame(game) {
  return game.v2.components.personal.score > 0;
}

function compareGames(a, b) {
  const aLive = a.status.state === 'live';
  const bLive = b.status.state === 'live';
  if (aLive !== bLive) return Number(bLive) - Number(aLive);
  if (aLive && bLive) {
    const liveDifference = (b.live.score ?? 0) - (a.live.score ?? 0);
    if (liveDifference !== 0) return liveDifference;
  }
  const scoreDifference = b.v2.total - a.v2.total;
  if (scoreDifference !== 0) return scoreDifference;
  return new Date(a.schedule.startTime).getTime() - new Date(b.schedule.startTime).getTime();
}

function chronological(a, b) {
  return new Date(a.schedule.startTime).getTime() - new Date(b.schedule.startTime).getTime();
}

function CardGrid({ games, onOpenGame }) {
  return (
    <div className="my-games-cards">
      {games.map((game) => (
        <GameCard game={game} onOpen={onOpenGame} key={game.identity.gameId} />
      ))}
    </div>
  );
}

function Section({ title, description, games, emptyMessage, onOpenGame, signal = false }) {
  return (
    <section className={`my-games-section ${signal ? 'signal-section' : ''}`}>
      <div className="my-games-section-heading">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {games.length > 0 && <span className="section-count">{games.length}</span>}
      </div>
      {games.length > 0
        ? <CardGrid games={games} onOpenGame={onOpenGame} />
        : <div className="section-empty">{emptyMessage}</div>}
    </section>
  );
}

function AllGamesSection({ games, onOpenGame }) {
  const groups = useMemo(() => {
    const map = new Map();
    [...games].sort(chronological).forEach((game) => {
      const key = localDateKey(game.schedule.startTime);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(game);
    });
    return [...map.entries()];
  }, [games]);

  return (
    <section className="my-games-section all-games-section">
      <div className="my-games-section-heading">
        <div>
          <h2>All Games</h2>
          <p>Everything in the current seven-day window, ordered by start time.</p>
        </div>
        <span className="section-count">{games.length}</span>
      </div>
      <div className="all-games-days">
        {groups.map(([key, dayGames]) => (
          <div className="all-games-day" key={key}>
            <div className="all-games-day-heading">
              {new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              <span>{dayGames.length} {dayGames.length === 1 ? 'game' : 'games'}</span>
            </div>
            <CardGrid games={dayGames} onOpenGame={onOpenGame} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function MyGamesView({ games, now, onOpenGame }) {
  const windowGames = useMemo(() => {
    const start = startOfDay(now);
    const end = new Date(start);
    end.setDate(end.getDate() + WINDOW_DAYS);
    return games.filter((game) => {
      const time = new Date(game.schedule.startTime).getTime();
      return time >= start.getTime() && time < end.getTime();
    });
  }, [games, now]);

  const worthWatching = useMemo(() => [...games]
    .filter((game) => isCurrentDay(game, now))
    .filter((game) => game.status.state !== 'final')
    .sort(compareGames)
    .slice(0, SECTION_LIMIT), [games, now]);

  const yourNextGames = useMemo(() => [...windowGames]
    .filter(isFavoriteGame)
    .filter((game) => new Date(game.schedule.startTime).getTime() >= new Date(now).getTime() || game.status.state === 'live')
    .sort(chronological)
    .slice(0, SECTION_LIMIT), [windowGames, now]);

  if (!windowGames.length) {
    return <section className="empty-state"><div className="empty-state-mark">—</div><h2>No games in view</h2><p>Your selected sports don't have any games over the next seven days.</p></section>;
  }

  return (
    <div className="my-games-list">
      <Section
        title="Worth Watching"
        description="Today's strongest games, ranked by GameScore V2."
        games={worthWatching}
        onOpenGame={onOpenGame}
        signal
        emptyMessage="No upcoming or live games are currently ranked for today."
      />
      <Section
        title="Your Teams"
        description="Upcoming games involving your favorite teams."
        games={yourNextGames}
        onOpenGame={onOpenGame}
        emptyMessage="None of your favorite teams play in the next seven days."
      />
      <AllGamesSection games={windowGames} onOpenGame={onOpenGame} />
    </div>
  );
}
