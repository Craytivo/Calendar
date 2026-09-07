import React from 'react';
import { Clock3, MapPin } from 'lucide-react';
import { leagues } from '../sports/leagues.js';
import { getPriorityTier } from '../sports/priority.js';
import { PriorityIndicator } from './PriorityIndicator.jsx';
import { TeamMark, getDisplayTeamName } from './TeamMark.jsx';

const leagueAccents = {
  nfl: 'accent-neutral', nba: 'accent-blue', 'ncaa-football': 'accent-green',
  laliga: 'accent-red', epl: 'accent-blue', mlb: 'accent-green', nhl: 'accent-red',
  ufc: 'accent-neutral', ucl: 'accent-blue',
};

function formatTime(startTime) {
  return new Date(startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function statusLabel(game) {
  if (game.status === 'live') return 'LIVE';
  if (game.status === 'final') return 'FINAL';
  return formatTime(game.startTime);
}

function teamLabel(team, leagueId) {
  const name = getDisplayTeamName(team);
  const ranking = leagueId === 'ncaa-football' && Number.isInteger(team?.ranking) && team.ranking > 0 && team.ranking <= 25
    ? `#${team.ranking} `
    : '';
  return `${ranking}${name}`;
}

export function GameCard({ game, compact = false }) {
  const league = leagues.find((item) => item.id === game.leagueId);
  const tier = getPriorityTier(game);
  const isFeatured = !compact && tier <= 1;
  const isFinal = game.status === 'final';
  const isLive = game.status === 'live';
  const away = game.awayTeam || { name: 'TBD' };
  const home = game.homeTeam || { name: 'TBD' };

  return (
    <button className={`game-card ${compact ? 'compact' : ''} ${isFeatured ? 'featured' : ''} ${isFinal ? 'final' : ''} ${isLive ? 'live' : ''} ${leagueAccents[game.leagueId] || 'accent-neutral'}`}>
      <div className="game-card-top">
        <span className="league-label">{league?.shortName || game.leagueId.toUpperCase()}</span>
        <PriorityIndicator game={game} />
      </div>
      <div className="game-card-status">{isLive && <span className="live-dot" />}{statusLabel(game)}</div>
      <div className="teams">
        <div className="team-row">
          <TeamMark team={away} size={isFeatured ? 'large' : 'medium'} />
          <span>{teamLabel(away, game.leagueId)}</span>
          {game.awayScore != null && <strong>{game.awayScore}</strong>}
        </div>
        <div className="team-row">
          <TeamMark team={home} size={isFeatured ? 'large' : 'medium'} />
          <span>{teamLabel(home, game.leagueId)}</span>
          {game.homeScore != null && <strong>{game.homeScore}</strong>}
        </div>
      </div>
      {!compact && (
        <div className="game-meta">
          <span><Clock3 size={13} /> {formatTime(game.startTime)}</span>
          {game.venue && <span><MapPin size={13} /> {game.venue}</span>}
        </div>
      )}
    </button>
  );
}
