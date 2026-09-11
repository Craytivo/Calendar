import React from 'react';
import { Clock3, Star } from 'lucide-react';
import { TeamMark, getDisplayTeamName } from './TeamMark.jsx';
import './GameCard.css';

function minutesUntil(startTime) {
  return Math.max(0, Math.ceil((new Date(startTime).getTime() - Date.now()) / 60000));
}

function priorityClass(tier) {
  return `priority-${String(tier || '').toLowerCase().replace(/\s+/g, '-')}`;
}

function teamLabel(team, leagueId) {
  const name = getDisplayTeamName(team);
  const ranking = leagueId === 'ncaa-football' && Number.isInteger(team?.ranking) && team.ranking > 0 && team.ranking <= 25
    ? `#${team.ranking} `
    : '';
  return `${ranking}${name}`;
}

export function GameCard({ game, compact = false, onOpen }) {
  const { identity, schedule, league, teams, status, v2, explanation, live } = game;
  const isLive = status.state === 'live';
  const isFinal = status.state === 'final';
  const isStartingSoon = status.state === 'scheduled'
    && minutesUntil(schedule.startTime) <= 60
    && new Date(schedule.startTime).getTime() >= Date.now();
  const isFavorite = v2.components.personal.score > 0;
  const away = teams.away;
  const home = teams.home;
  const awayScore = live.awayScore;
  const homeScore = live.homeScore;
  const hasScore = (isLive || isFinal) && (awayScore != null || homeScore != null);
  const whyItMatters = [
    isLive ? live.reasons?.[0] : explanation.primary,
    isLive ? live.reasons?.[1] : explanation.secondary,
  ].filter(Boolean).slice(0, 2);
  const lowConfidence = v2.confidence < 0.85;
  const liveLevel = live.level || 'LOW';

  return (
    <button
      type="button"
      className={`game-card ${compact ? 'compact' : ''} ${isLive ? 'live' : ''} ${isFinal ? 'final' : ''} ${isStartingSoon ? 'starting-soon' : ''} ${isFavorite ? 'favorite-team-card' : ''} ${priorityClass(v2.tier.label)} score-${liveLevel.toLowerCase()}`}
      onClick={() => onOpen?.(game)}
      aria-label={`View details for ${getDisplayTeamName(away)} at ${getDisplayTeamName(home)}, Priority ${v2.total}, ${v2.tier.label}`}
      data-priority-score={v2.total}
      data-score={v2.total}
      data-confidence={v2.confidence}
      data-score-tier={v2.tier.label}
      data-game-score={live.score ?? 0}
    >
      <header className="game-card-header">
        <div className="game-card-context">
          <span className="game-card-league">{league.abbreviation}</span>
          {!isLive && !isFinal && <span className="game-card-time"><Clock3 size={12} aria-hidden="true" />{schedule.displayTime}</span>}
          {isLive && <span className="game-card-status live-status"><span className="game-card-live-dot" aria-hidden="true" />LIVE</span>}
          {isStartingSoon && !isLive && <span className="game-card-status starting-status">STARTS IN {minutesUntil(schedule.startTime)}M</span>}
          {isFinal && <span className="game-card-status">FINAL</span>}
        </div>

        <div className="game-card-header-right">
          <div
            className="game-card-priority"
            title={`Priority ${v2.total} · ${v2.tier.label}${lowConfidence ? ` · ${Math.round(v2.confidence * 100)}% confidence` : ''}`}
            aria-label={`Priority ${v2.total}, ${v2.tier.label}${lowConfidence ? `, ${Math.round(v2.confidence * 100)}% confidence` : ''}`}
          >
            <span>PRIORITY</span>
            <strong>{v2.total}</strong>
          </div>
          {isLive && <div className="game-card-live-metric" title={`Live Game Score ${live.score} · ${live.level}`} aria-label={`Live Game Score ${live.score}, ${live.level}`}><span>LIVE SCORE</span><strong>{live.score}</strong></div>}
          {isFavorite && <Star size={15} fill="currentColor" className="game-card-favorite" aria-label="Favorite team" />}
        </div>
      </header>

      <div className={`game-card-matchup ${hasScore ? 'has-score' : ''}`}>
        <div className={`game-card-team ${isFinal && awayScore != null && homeScore != null && awayScore > homeScore ? 'winner' : ''}`}>
          <TeamMark team={away} size={compact ? 'medium' : 'large'} />
          <span>{teamLabel(away, league.id)}</span>
          {hasScore && <strong>{awayScore ?? '—'}</strong>}
        </div>
        <div className="game-card-divider" aria-hidden="true" />
        <div className={`game-card-team ${isFinal && awayScore != null && homeScore != null && homeScore > awayScore ? 'winner' : ''}`}>
          <TeamMark team={home} size={compact ? 'medium' : 'large'} />
          <span>{teamLabel(home, league.id)}</span>
          {hasScore && <strong>{homeScore ?? '—'}</strong>}
        </div>
      </div>

      {!compact && whyItMatters.length > 0 && (
        <footer className="game-card-insight">
          <span>WHY IT MATTERS</span>
          <strong>{whyItMatters[0]}</strong>
          {whyItMatters[1] && <small>{whyItMatters[1]}</small>}
        </footer>
      )}
    </button>
  );
}
