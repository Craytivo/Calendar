import React, { useEffect } from 'react';
import { CalendarDays, Clock3, MapPin, X } from 'lucide-react';
import { leagues } from '../sports/leagues.js';
import { getPriorityLabel, getPriorityTier } from '../sports/priority.js';
import { TeamMark, getDisplayTeamName } from './TeamMark.jsx';
import './GameDetailModal.css';

function formatDateTime(startTime) {
  return new Date(startTime).toLocaleString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function scoreFor(game, side) {
  const topLevel = side === 'away' ? game.awayScore : game.homeScore;
  if (topLevel != null) return topLevel;
  const teamScore = side === 'away' ? game.awayTeam?.score : game.homeTeam?.score;
  return teamScore != null ? teamScore : null;
}

function statusLabel(game) {
  if (game.status === 'live') return 'LIVE NOW';
  if (game.status === 'final') return 'FINAL';
  if (game.status === 'postponed') return 'POSTPONED';
  if (game.status === 'cancelled') return 'CANCELLED';
  return 'UPCOMING';
}

function detailValue(value) {
  if (!value) return null;
  return String(value).replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function GameDetailModal({ game, onClose }) {
  useEffect(() => {
    if (!game) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [game, onClose]);

  if (!game) return null;

  const league = leagues.find((item) => item.id === game.leagueId);
  const tier = getPriorityTier(game);
  const awayScore = scoreFor(game, 'away');
  const homeScore = scoreFor(game, 'home');
  const isLive = game.status === 'live';
  const away = game.awayTeam || { name: 'TBD' };
  const home = game.homeTeam || { name: 'TBD' };

  const details = [
    { label: 'Date & time', value: formatDateTime(game.startTime), icon: CalendarDays },
    game.venue ? { label: 'Venue', value: game.venue, icon: MapPin } : null,
    game.round ? { label: 'Round', value: detailValue(game.round), icon: null } : null,
    game.competitionPhase ? { label: 'Phase', value: detailValue(game.competitionPhase), icon: null } : null,
  ].filter(Boolean);

  return (
    <div className="game-detail-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`game-detail-modal ${isLive ? 'is-live' : ''}`} role="dialog" aria-modal="true" aria-labelledby="game-detail-title">
        <header className="game-detail-header">
          <div>
            <span className="game-detail-eyebrow">{league?.shortName || game.leagueId.toUpperCase()}</span>
            <h2 id="game-detail-title">Game Details</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close game details"><X size={18} /></button>
        </header>

        <div className="game-detail-body">
          <div className="game-detail-status-row">
            <span className={`game-detail-status ${isLive ? 'live' : ''}`}>
              {isLive && <span className="game-detail-live-dot" />}
              {statusLabel(game)}
            </span>
            {tier < 6 && <span className="game-detail-priority">{getPriorityLabel(tier)}</span>}
          </div>

          <div className="game-detail-matchup">
            <div className="game-detail-team">
              <TeamMark team={away} size="large" />
              <strong>{getDisplayTeamName(away)}</strong>
              {awayScore != null && <span className="game-detail-score">{awayScore}</span>}
            </div>
            <div className="game-detail-vs">{isLive || game.status === 'final' ? '—' : 'VS'}</div>
            <div className="game-detail-team">
              <TeamMark team={home} size="large" />
              <strong>{getDisplayTeamName(home)}</strong>
              {homeScore != null && <span className="game-detail-score">{homeScore}</span>}
            </div>
          </div>

          <div className="game-detail-info">
            {details.map(({ label, value, icon: Icon }) => (
              <div className="game-detail-info-row" key={label}>
                <span className="game-detail-info-label">{Icon ? <Icon size={15} /> : <span className="detail-dot" />}{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
