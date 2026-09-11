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
      {games.length > 0
        ? <div className="my-games-cards">{games.map((game) => <GameCard key={game.id} game={game} onOpen={onOpenGame} />)}</div>
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
        <div>
          <span className="day-kicker">Everything in scope</span>
          <h2>All Games</h2>
        </div>
        <span className="section-count">{games.length} games</span>
      </div>
      <div className="all-games-days">
        {groups.map(([key, dayGames]) => (
          <div className="all-games-day" key={key}>
            <div className="all-games-day-heading">
              {new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
            <div className="my-games-cards">
              {dayGames.map((game) => <GameCard key={game.id} game={game} onOpen={onOpenGame} />)}
            </div>
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

  const worthWatching = useMemo(() => [...windowGames].sort(compareGames).slice(0, SECTION_LIMIT), [windowGames]);

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
      <Section
        eyebrow="Algorithmic ranking"
        title="Worth Watching"
        games={worthWatching}
        onOpenGame={onOpenGame}
        emptyMessage="No games are currently ranked in your scope."
      />

      <Section
        eyebrow="Your favorites"
        title="Your Next Games"
        games={yourNextGames}
        onOpenGame={onOpenGame}
        emptyMessage="None of your favorite teams have another game in this seven-day window."
      />

      <AllGamesSection games={windowGames} onOpenGame={onOpenGame} />
    </div>
  );
}
