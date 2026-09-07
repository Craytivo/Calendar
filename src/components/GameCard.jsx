import React from 'react';
import { leagues } from '../sports/leagues.js';
import { getPriorityTier } from '../sports/priority.js';
import { PriorityIndicator } from './PriorityIndicator.jsx';
import { TeamMark, getDisplayTeamName } from './TeamMark.jsx';
import './GameCard.css';

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
  if (game.status === 'postponed') return 'POSTPONED';
  if (game.status === 'cancelled') return 'CANCELLED';
  return formatTime(game.startTime);
}

function teamLabel(team, leagueId) {
  const name = getDisplayTeamName(team);
  const ranking = leagueId === 'ncaa-football' && Number.isInteger(team?.ranking) && team.ranking > 0 && team.ranking <= 25
    ? `#${team.ranking} `
    : '';
  return `${ranking}${name}`;
}

function scoreFor(game, side) {
  const topLevel = side === 'away' ? game.awayScore : game.homeScore;
  if (topLevel != null) return topLevel;
  const teamScore = side === 'away' ? game.awayTeam?.score : game.homeTeam?.score;
  return teamScore != null ? teamScore : null;
}

export function GameCard({ game, compact = false, onOpen }) {
  const league = leagues.find((item) => item.id === game.leagueId);
  const tier = getPriorityTier(game);
  const isFeatured = !compact && tier <= 1;
  const isFinal = game.status === 'final';
  const isLive = game.status === 'live';
  const isFavorite = Boolean(game.homeTeam?.favorite || game.awayTeam?.favorite);
  const away = game.awayTeam || { name: 'TBD' };
  const home = game.homeTeam || { name: 'TBD' };
  const awayScore = scoreFor(game, 'away');
  const homeScore = scoreFor(game, 'home');

  return (
    <button
      type="button"
      className={`game-card game-card-minimal ${compact ? 'compact' : ''} ${isFeatured ? 'featured' : ''} ${isFinal ? 'final' : ''} ${isLive ? 'live' : ''} ${isFavorite ? 'favorite-team-card' : ''} ${leagueAccents[game.leagueId] || 'accent-neutral'}`}
      onClick={() => onOpen?.(game)}
      aria-label={`View details for ${getDisplayTeamName(away)} at ${getDisplayTeamName(home)}`}
    >
      <div className="game-card-top">
        <span className="league-label">{league?.shortName || game.leagueId.toUpperCase()}</span>
        <div className="game-card-status-wrap">
          {isLive && <span className="live-dot" />}
          <span className="game-card-status">{statusLabel(game)}</span>
          <PriorityIndicator game={game} />
        </div>
      </div>

      <div className="teams">
        <div className="team-row">
          <TeamMark team={away} size={isFeatured ? 'large' : 'medium'} />
          <span>{teamLabel(away, game.leagueId)}</span>
          {awayScore != null && <strong>{awayScore}</strong>}
        </div>
        <div className="team-row">
          <TeamMark team={home} size={isFeatured ? 'large' : 'medium'} />
          <span>{teamLabel(home, game.leagueId)}</span>
          {homeScore != null && <strong>{homeScore}</strong>}
        </div>
      </div>
    </button>
  );
}
