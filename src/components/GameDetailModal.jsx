import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, MapPin, Radio, Tv, X } from 'lucide-react';
import { TeamMark, getDisplayTeamName } from './TeamMark.jsx';
import './GameDetailModal.css';

const COMPONENT_LABELS = {
  competitive: 'Competition',
  teamQuality: 'Team quality',
  stakes: 'Stakes',
  narrative: 'Narrative',
  form: 'Form',
  personal: 'Personal',
};

function formatCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

function statusLabel(state) {
  if (state === 'live') return 'LIVE NOW';
  if (state === 'final') return 'FINAL';
  if (state === 'postponed') return 'POSTPONED';
  if (state === 'cancelled') return 'CANCELLED';
  return 'UPCOMING';
}

function TeamPanel({ team, score, winner, live }) {
  return (
    <div className={`game-detail-team-panel ${winner ? 'winner' : ''}`}>
      <TeamMark team={team} size="large" />
      <div className="game-detail-team-name">{getDisplayTeamName(team)}</div>
      {team?.abbreviation && <div className="game-detail-team-abbr">{team.abbreviation}</div>}
      {score != null && <div className="game-detail-score">{score}</div>}
      {live && <span className="game-detail-team-state">{winner ? 'LEADING' : 'IN PLAY'}</span>}
      {!live && winner && <span className="game-detail-team-state">WINNER</span>}
    </div>
  );
}

export function GameDetailModal({ game, onClose }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!game) return undefined;
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [game, onClose]);

  useEffect(() => {
    if (!game || game.status.state !== 'scheduled') return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [game]);

  const countdown = useMemo(() => game ? new Date(game.schedule.startTime).getTime() - now : 0, [game, now]);
  if (!game) return null;

  const isLive = game.status.state === 'live';
  const isFinal = game.status.state === 'final';
  const away = game.teams.away;
  const home = game.teams.home;
  const awayScore = game.live.awayScore;
  const homeScore = game.live.homeScore;
  const awayWinner = (isFinal || isLive) && awayScore != null && homeScore != null && awayScore > homeScore;
  const homeWinner = (isFinal || isLive) && awayScore != null && homeScore != null && homeScore > awayScore;
  const liveLabel = isLive ? 'Game in progress' : isFinal ? 'Game complete' : countdown > 0 ? `Starts in ${formatCountdown(countdown)}` : 'Starting now';
  const meta = [
    { label: 'Date', value: game.schedule.displayDate, icon: CalendarDays },
    { label: 'Time', value: game.schedule.displayTime, icon: null },
    game.details.venue ? { label: 'Venue', value: game.details.venue, icon: MapPin } : null,
    game.details.network ? { label: 'Watch', value: game.details.network, icon: Tv } : null,
  ].filter(Boolean);
  const components = Object.entries(game.v2.components)
    .sort(([, a], [, b]) => Number(b.contribution ?? 0) - Number(a.contribution ?? 0));

  return (
    <div className="game-detail-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`game-detail-modal ${isLive ? 'is-live' : ''} ${isFinal ? 'is-final' : ''}`} role="dialog" aria-modal="true" aria-labelledby="game-detail-title">
        <div className="game-detail-hero">
          <header className="game-detail-header">
            <div><span className="game-detail-eyebrow">{game.league.name}</span><h2 id="game-detail-title">{getDisplayTeamName(away)} at {getDisplayTeamName(home)}</h2></div>
            <button type="button" className="icon-button game-detail-close" onClick={onClose} aria-label="Close game details"><X size={18} /></button>
          </header>

          <div className="game-detail-status-row">
            <span className={`game-detail-status ${isLive ? 'live' : ''}`}>
              {isLive ? <span className="game-detail-live-dot" /> : <span className="game-detail-status-mark" />}
              {statusLabel(game.status.state)}
            </span>
            <div className="game-detail-score-summary"><strong>{game.v2.total}</strong><span>{game.v2.tier.label}</span><small>{Math.round(game.v2.confidence * 100)}% data confidence</small></div>
          </div>

          {(isLive || isFinal) ? (
            <div className="game-detail-scoreboard">
              <div className="game-detail-score-team"><TeamMark team={away} size="large" /><div className="game-detail-score-team-name">{getDisplayTeamName(away)}</div>{away.abbreviation && <span>{away.abbreviation}</span>}<strong className={awayWinner ? 'winner' : ''}>{awayScore ?? '—'}</strong></div>
              <div className="game-detail-score-middle"><span>{isLive ? 'LIVE' : 'FINAL'}</span>{game.status.period && <small>{game.status.period}{game.status.clock ? ` · ${game.status.clock}` : ''}</small>}</div>
              <div className="game-detail-score-team"><TeamMark team={home} size="large" /><div className="game-detail-score-team-name">{getDisplayTeamName(home)}</div>{home.abbreviation && <span>{home.abbreviation}</span>}<strong className={homeWinner ? 'winner' : ''}>{homeScore ?? '—'}</strong></div>
            </div>
          ) : (
            <div className="game-detail-matchup">
              <TeamPanel team={away} score={null} winner={false} live={false} />
              <div className="game-detail-center"><div className="game-detail-countdown">{liveLabel}</div><div className="game-detail-vs">VS</div></div>
              <TeamPanel team={home} score={null} winner={false} live={false} />
            </div>
          )}

          <section className="game-detail-intelligence">
            <div className="game-detail-section-heading">
              <span>WHY IT RANKS HERE</span>
              <strong>{game.explanation.primary || 'V2 composite ranking'}</strong>
            </div>
            {game.explanation.secondary && <p className="game-detail-summary">{game.explanation.secondary}</p>}
            <div className="game-detail-components" aria-label="GameScore V2 component contributions">
              {components.map(([id, component]) => (
                <div className="game-detail-component" key={id}>
                  <div className="game-detail-component-topline"><span>{COMPONENT_LABELS[id]}</span><strong>+{Math.round(Number(component.contribution ?? 0))}</strong></div>
                  <div className="game-detail-component-track" aria-hidden="true"><span style={{ width: `${component.contributionPercent ?? 0}%` }} /></div>
                  {component.reasons?.[0] && <small>{component.reasons[0]}</small>}
                </div>
              ))}
            </div>
          </section>

          {isLive && game.live.score != null && (
            <section className="game-detail-live-panel">
              <div><span><Radio size={14} /> Live watchability</span><strong>{game.live.score}</strong></div>
              {game.live.level && <small>{game.live.level}</small>}
              {game.live.reasons?.length > 0 && <p>{game.live.reasons.slice(0, 2).join(' · ')}</p>}
            </section>
          )}
        </div>

        <div className="game-detail-content">
          <div className="game-detail-info">
            {meta.map(({ label, value, icon: Icon }) => <div className="game-detail-info-row" key={label}><span className="game-detail-info-label">{Icon ? <Icon size={15} /> : <span className="detail-dot" />}{label}</span><strong>{value}</strong></div>)}
          </div>
          <div className="game-detail-live-note">{isLive ? 'Live score updates every 30 seconds' : liveLabel}</div>
        </div>
      </div>
    </div>
  );
}
