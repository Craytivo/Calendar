import React, { useMemo } from 'react';
import { favoriteTeamIds } from '../sports/team-identity.js';
import { getLiveSignalRank } from '../sports/game-intelligence.js';
import { scoreGameV2 } from '../sports/scoring/index-v2.js';
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
  return localDateKey(game.startTime) === localDateKey(now);
}

function isFavoriteGame(game) {
  return favoriteTeamIds.has(game.homeTeamId) || favoriteTeamIds.has(game.awayTeamId);
}

function priorityScore(game) {
  return scoreGameV2(game).total;
}

function compareGames(a, b) {
  const aLive = a.status === 'live';
  const bLive = b.status === 'live';
  if (aLive !== bLive) return Number(bLive) - Number(aLive);
  if (aLive && bLive) {
    const liveDifference = getLiveSignalRank(a) - getLiveSignalRank(b);
    if (liveDifference !== 0) return liveDifference;
  }
  const scoreDifference = priorityScore(b) - priorityScore(a);
  if (scoreDifference !== 0) return scoreDifference;
  return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
}

function chronological(a, b) {
  return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
}

function CardGrid({ games, onOpenGame, signal = false }) {
  return (
    <div className={`my-games-cards ${signal ? 'signal-grid' : 'standard-grid'}`}>
      {games.map((game) => (
        <div className="game-card-slot" key={game.id}>
          <GameCard game={game} onOpen={onOpenGame} />
        </div>
      ))}
    </div>
  );
}

function Section({ title, games, emptyMessage, onOpenGame, signal = false }) {
  return (
    <section className={`my-games-section ${signal ? 'signal-section' : ''}`}>
      <div className="my-games-section-heading">
        <h2>{title}</h2>
        {games.length > 0 && <span className="section-count">{games.length}</span>}
      </div>
      {games.length > 0
        ? <CardGrid games={games} onOpenGame={onOpenGame} signal={signal} />
        : <div className="section-empty">{emptyMessage}</div>}
    </section>
  );
}

function AllGamesSection({ games, onOpenGame }) {
  const groups = useMemo(() => {
    const map = new Map();
    [...games].sort(chronological).forEach((game) => {
      const key = localDateKey(game.startTime);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(game);
    });
    return [...map.entries()];
  }, [games]);

  return (
    <section className="my-games-section all-games-section">
      <div className="my-games-section-heading">
        <h2>All Games</h2>
        <span className="section-count">{games.length}</span>
      </div>
      <div className="all-games-days">
        {groups.map(([key, dayGames]) => (
          <div className="all-games-day" key={key}>
            <div className="all-games-day-heading">
              {new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
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
      const time = new Date(game.startTime).getTime();
      return time >= start.getTime() && time < end.getTime();
    });
  }, [games, now]);

  const worthWatching = useMemo(() => games
    .filter((game) => isCurrentDay(game, now))
    .filter((game) => game.status !== 'final')
    .sort(compareGames)
    .slice(0, SECTION_LIMIT), [games, now]);

  const yourNextGames = useMemo(() => [...windowGames]
    .filter(isFavoriteGame)
    .filter((game) => new Date(game.startTime).getTime() >= new Date(now).getTime() || game.status === 'live')
    .sort(chronological)
    .slice(0, SECTION_LIMIT), [windowGames, now]);

  if (!windowGames.length) {
    return <section className="empty-state"><div className="empty-state-mark">—</div><h2>No games in view</h2><p>Your selected sports don't have any games over the next seven days.</p></section>;
  }

  return (
    <div className="my-games-list">
      <Section title="Worth Watching" games={worthWatching} onOpenGame={onOpenGame} signal emptyMessage="No upcoming or live games are currently ranked for today." />
      <Section title="Your Teams" games={yourNextGames} onOpenGame={onOpenGame} emptyMessage="None of your favorite teams play in the next seven days." />
      <AllGamesSection games={windowGames} onOpenGame={onOpenGame} />
    </div>
  );
}
