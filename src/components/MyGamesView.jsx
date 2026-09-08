import React from 'react';
import { getMyGamesSections } from '../sports/selectors.js';
import { GameCard } from './GameCard.jsx';
import { TodayBrief } from './TodayBrief.jsx';
import { NextUp } from './NextUp.jsx';
import { IntelligentDaySummary } from './IntelligentDaySummary.jsx';
import { WeeklyRadar } from './WeeklyRadar.jsx';
import './MyGamesView.css';
import './TodayBrief.css';
import './NextUp.css';
import './IntelligentDaySummary.css';
import './WeeklyRadar.css';

function Section({ eyebrow, title, games, emptyMessage, onOpenGame }) {
  return (
    <section className="my-games-section">
      <div className="my-games-section-heading">
        <div><span className="day-kicker">{eyebrow}</span><h2>{title}</h2></div>
        {games.length > 0 && <span className="section-count">{games.length} {games.length === 1 ? 'game' : 'games'}</span>}
      </div>
      {games.length > 0 ? <div className="my-games-cards">{games.map((game) => <GameCard key={game.id} game={game} onOpen={onOpenGame} />)}</div> : <div className="section-empty">{emptyMessage}</div>}
    </section>
  );
}

export function MyGamesView({ games, now, onOpenGame }) {
  const { today, upcoming } = getMyGamesSections(games, now);
  const hasGames = today.length > 0 || upcoming.length > 0;
  if (!hasGames) return <section className="empty-state"><div className="empty-state-mark">—</div><h2>No games in view</h2><p>Your selected sports don't have any games in your category scope over the next seven days.</p></section>;

  return <div className="my-games-list">
    <header className="my-games-intro">
      <div className="my-games-title-block"><span className="day-kicker">My Games · Signal over noise</span><h1>What matters today</h1><p>Open the app and get the games worth your attention first. Look ahead when you want.</p></div>
      <div className="signal-status"><span className="signal-status-dot" />Signal active</div>
    </header>
    <TodayBrief games={games} now={now} onOpenGame={onOpenGame} />
    <NextUp games={games} now={now} onOpenGame={onOpenGame} />
    <IntelligentDaySummary games={games} date={now} onOpenGame={onOpenGame} />
    <div className="my-games-sections">
      <Section eyebrow="Today" title="Today's Games" games={today} onOpenGame={onOpenGame} emptyMessage="Nothing else from your category scope is scheduled today." />
      <Section eyebrow="Next 6 Days" title="Next 6 Days" games={upcoming} onOpenGame={onOpenGame} emptyMessage="No games from your category scope in the next six days." />
    </div>
    <WeeklyRadar games={games} now={now} onOpenGame={onOpenGame} />
  </div>;
}
