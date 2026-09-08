import React from 'react';
import { Clock3, Eye, Star } from 'lucide-react';
import { leagues } from '../sports/leagues.js';
import { getPriorityScore, getPriorityTier, getPriorityReasons } from '../sports/priority.js';
import { getWatchScore, getWatchLevel } from '../sports/watchability.js';
import { getLiveGameSignal } from '../sports/game-intelligence.js';
import { formatScoreboardMeta } from '../sports/clock.js';
import { TeamMark, getDisplayTeamName } from './TeamMark.jsx';
import './GameCard.css';

function formatTime(startTime) {
  return new Date(startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function minutesUntil(startTime) {
  return Math.max(0, Math.ceil((new Date(startTime).getTime() - Date.now()) / 60000));
}

function statusLabel(game, startingSoon) {
  if (game.status === 'live') return 'LIVE';
  if (game.status === 'final') return 'FINAL';
  if (game.status === 'postponed') return 'POSTPONED';
  if (game.status === 'cancelled') return 'CANCELLED';
  if (startingSoon) return `STARTS IN ${minutesUntil(game.startTime)}M`;
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

function getInsight(game, priorityReasons, liveSignal) {
  const reasons = priorityReasons.filter(Boolean);
  if (game.status === 'live' && liveSignal?.reason) {
    return [liveSignal.label || 'Live game', liveSignal.reason];
  }
  if (reasons.length >= 2) return reasons.slice(0, 2);
  if (reasons.length === 1) return [reasons[0], null];
  if (game.isMajorEvent) return ['Major event', null];
  return [null, null];
}

export function GameCard({ game, compact = false, onOpen }) {
  const league = leagues.find((item) => item.id === game.leagueId);
  const tier = getPriorityTier(game);
  const priorityScore = getPriorityScore(game);
  const watchScore = getWatchScore(game);
  const watchLevel = getWatchLevel(watchScore);
  const liveSignal = getLiveGameSignal(game);
  const priorityReasons = getPriorityReasons(game);
  const isLive = game.status === 'live';
  const isFinal = game.status === 'final';
  const isStartingSoon = game.status === 'scheduled' && minutesUntil(game.startTime) <= 60 && new Date(game.startTime).getTime() >= Date.now();
  const isFavorite = Boolean(game.homeTeam?.favorite || game.awayTeam?.favorite);
  const showWatch = watchScore >= 35 || tier <= 3;
  const away = game.awayTeam || { name: 'TBD' };
  const home = game.homeTeam || { name: 'TBD' };
  const awayScore = scoreFor(game, 'away');
  const homeScore = scoreFor(game, 'home');
  const hasScore = (isLive || isFinal) && (awayScore != null || homeScore != null);
  const meta = formatScoreboardMeta(game);
  const [primaryInsight, secondaryInsight] = getInsight(game, priorityReasons, liveSignal);

  return (
    <button
      type="button"
      className={`game-card ${compact ? 'compact' : ''} ${isLive ? 'live' : ''} ${isFinal ? 'final' : ''} ${isStartingSoon ? 'starting-soon' : ''} ${isFavorite ? 'favorite-team-card' : ''} accent-${game.leagueId === 'nba' || game.leagueId === 'epl' || game.leagueId === 'ucl' ? 'blue' : game.leagueId === 'mlb' || game.leagueId === 'ncaa-football' ? 'green' : game.leagueId === 'nhl' || game.leagueId === 'laliga' ? 'red' : 'neutral'}`}
      onClick={() => onOpen?.(game)}
      aria-label={`View details for ${getDisplayTeamName(away)} at ${getDisplayTeamName(home)}`}
      data-priority-score={priorityScore}
      data-watch-score={watchScore}
    >
      <header className="game-card-header">
        <span className="game-card-league">{league?.shortName || game.leagueId.toUpperCase()}</span>
        <div className="game-card-header-meta">
          {isStartingSoon && !isLive && <Clock3 size={12} aria-hidden="true" />}
          {isLive && <span className="game-card-live-dot" aria-hidden="true" />}
          <span className="game-card-time">{statusLabel(game, isStartingSoon)}</span>
          {showWatch && (
            <span className="game-card-signal" title={`${watchLevel.label} watchability`}>
              <Eye size={12} aria-hidden="true" />
              <strong>{watchScore}</strong>
            </span>
          )}
          {isFavorite && <Star size={13} fill="currentColor" className="game-card-favorite" aria-label="Favorite team" />}
        </div>
      </header>

      <div className={`game-card-matchup ${hasScore ? 'has-score' : ''}`}>
        <div className={`game-card-team ${isFinal && awayScore != null && homeScore != null && awayScore > homeScore ? 'winner' : ''}`}>
          <TeamMark team={away} size={compact ? 'medium' : 'large'} />
          <span>{teamLabel(away, game.leagueId)}</span>
          {hasScore && <strong>{awayScore ?? '—'}</strong>}
        </div>
        <div className="game-card-vs" aria-hidden="true">{hasScore ? (meta || (isLive ? 'LIVE' : 'FINAL')) : 'at'}</div>
        <div className={`game-card-team ${isFinal && awayScore != null && homeScore != null && homeScore > awayScore ? 'winner' : ''}`}>
          <TeamMark team={home} size={compact ? 'medium' : 'large'} />
          <span>{teamLabel(home, game.leagueId)}</span>
          {hasScore && <strong>{homeScore ?? '—'}</strong>}
        </div>
      </div>

      {!compact && (primaryInsight || secondaryInsight) && (
        <footer className="game-card-insight">
          <span>Why it matters</span>
          <div>
            {primaryInsight && <strong>{primaryInsight}</strong>}
            {secondaryInsight && <small>{secondaryInsight}</small>}
          </div>
        </footer>
      )}
    </button>
  );
}
