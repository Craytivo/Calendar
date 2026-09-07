import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, MapPin, Radio, Tv, X } from 'lucide-react';
import { leagues } from '../sports/leagues.js';
import { getPriorityReasons, getPriorityScore, getPriorityTier } from '../sports/priority.js';
import { getWatchability } from '../sports/watchability.js';
import { TeamMark, getDisplayTeamName } from './TeamMark.jsx';
import './GameDetailModal.css';

function scoreFor(game, side) { const topLevel = side === 'away' ? game.awayScore : game.homeScore; if (topLevel != null) return topLevel; const teamScore = side === 'away' ? game.awayTeam?.score : game.homeTeam?.score; return teamScore != null ? teamScore : null; }
function statusLabel(game) { if (game.status === 'live') return 'LIVE NOW'; if (game.status === 'final') return 'FINAL'; if (game.status === 'postponed') return 'POSTPONED'; if (game.status === 'cancelled') return 'CANCELLED'; return 'UPCOMING'; }
function detailValue(value) { if (!value) return null; return String(value).replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function formatDate(startTime) { return new Date(startTime).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }); }
function formatTime(startTime) { return new Date(startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
function formatCountdown(milliseconds) { const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000)); const days = Math.floor(totalSeconds / 86400); const hours = Math.floor((totalSeconds % 86400) / 3600); const minutes = Math.floor((totalSeconds % 3600) / 60); const seconds = totalSeconds % 60; if (days > 0) return `${days}d ${hours}h`; if (hours > 0) return `${hours}h ${minutes}m`; return `${minutes}m ${seconds}s`; }
function getImportanceReasons(game) { const reasons = getPriorityReasons(game); if (reasons.length) return reasons; if (game.leagueId === 'ucl') return [detailValue(game.uclStage || game.round) || 'Champions League matchup']; return []; }
function getImportanceSummary(game, reasons) { if (reasons.length === 0) return null; const tier = getPriorityTier(game); if (tier === 0) return 'One of the highest-priority games on your calendar.'; if (tier === 1) return 'A must-see matchup based on your teams and sports priorities.'; if (tier === 2) return 'A favorite-team game that belongs near the top of your schedule.'; if (tier <= 3) return 'A high-signal event worth surfacing ahead of routine games.'; return 'This game is being surfaced because it has meaningful competitive context.'; }
function TeamPanel({ team, score, winner, live }) { return <div className={`game-detail-team-panel ${winner ? 'winner' : ''}`}><TeamMark team={team} size="large" /><div className="game-detail-team-name">{getDisplayTeamName(team)}</div>{team?.abbreviation && <div className="game-detail-team-abbr">{team.abbreviation}</div>}{score != null && <div className="game-detail-score">{score}</div>}{live && <span className="game-detail-team-state">{winner ? 'LEADING' : 'IN PLAY'}</span>}{!live && winner && <span className="game-detail-team-state">WINNER</span>}</div>; }

export function GameDetailModal({ game, onClose }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { if (!game) return undefined; const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); }; document.addEventListener('keydown', onKeyDown); document.body.style.overflow = 'hidden'; return () => { document.removeEventListener('keydown', onKeyDown); document.body.style.overflow = ''; }; }, [game, onClose]);
  useEffect(() => { if (!game || game.status !== 'scheduled') return undefined; const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, [game]);
  const countdown = useMemo(() => game ? new Date(game.startTime).getTime() - now : 0, [game, now]);
  if (!game) return null;

  const league = leagues.find((item) => item.id === game.leagueId); const tier = getPriorityTier(game); const priorityScore = getPriorityScore(game); const watch = getWatchability(game);
  const awayScore = scoreFor(game, 'away'); const homeScore = scoreFor(game, 'home'); const isLive = game.status === 'live'; const isFinal = game.status === 'final';
  const away = game.awayTeam || { name: 'TBD' }; const home = game.homeTeam || { name: 'TBD' }; const awayWinner = (isFinal || isLive) && awayScore != null && homeScore != null && awayScore > homeScore; const homeWinner = (isFinal || isLive) && awayScore != null && homeScore != null && homeScore > awayScore;
  const importanceReasons = getImportanceReasons(game); const importanceSummary = getImportanceSummary(game, importanceReasons); const liveLabel = isLive ? 'Game in progress' : isFinal ? 'Game complete' : countdown > 0 ? `Starts in ${formatCountdown(countdown)}` : 'Starting now';
  const meta = [{ label: 'Date', value: formatDate(game.startTime), icon: CalendarDays }, { label: 'Time', value: formatTime(game.startTime), icon: null }, game.venue ? { label: 'Venue', value: game.venue, icon: MapPin } : null, game.network ? { label: 'Watch', value: game.network, icon: Tv } : null].filter(Boolean);

  return <div className="game-detail-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className={`game-detail-modal ${isLive ? 'is-live' : ''} ${isFinal ? 'is-final' : ''}`} role="dialog" aria-modal="true" aria-labelledby="game-detail-title">
    <div className="game-detail-hero"><header className="game-detail-header"><div className="game-detail-league"><span className="game-detail-eyebrow">{league?.shortName || game.leagueId.toUpperCase()}</span></div><button type="button" className="icon-button game-detail-close" onClick={onClose} aria-label="Close game details"><X size={18} /></button></header>
      <div className="game-detail-status-row"><span className={`game-detail-status ${isLive ? 'live' : ''}`}>{isLive ? <span className="game-detail-live-dot" /> : <span className="game-detail-status-mark" />}{statusLabel(game)}</span><span className={`game-detail-watch watch-${watch.label.toLowerCase()}`}><strong>{watch.score}</strong><span>{watch.label}</span></span></div>
      <div className="game-detail-matchup"><TeamPanel team={away} score={awayScore} winner={awayWinner} live={isLive} /><div className="game-detail-center">{isLive || isFinal ? <div className="game-detail-score-state">{isLive ? 'LIVE' : 'FINAL'}</div> : <div className="game-detail-countdown">{liveLabel}</div>}<div className="game-detail-vs">{isLive || isFinal ? '—' : 'VS'}</div></div><TeamPanel team={home} score={homeScore} winner={homeWinner} live={isLive} /></div>
      <div className="game-detail-watchline"><div><span>Watch score</span><strong>{watch.score} · {watch.label}</strong></div><div className="game-detail-watch-reasons">{watch.reasons.map((reason) => <span key={reason}>{reason}</span>)}</div></div>
      {importanceReasons.length > 0 && <div className="game-detail-storyline"><div><span>Why this matters</span><strong>{importanceSummary}</strong><div className="game-detail-reasons">{importanceReasons.map((reason) => <span key={reason}>{reason}</span>)}</div><small>Importance {priorityScore}/100</small></div></div>}
    </div>
    <div className="game-detail-content"><div className="game-detail-info">{meta.map(({ label, value, icon: Icon }) => <div className="game-detail-info-row" key={label}><span className="game-detail-info-label">{Icon ? <Icon size={15} /> : <span className="detail-dot" />}{label}</span><strong>{value}</strong></div>)}</div><div className="game-detail-live-note">{isLive ? <><Radio size={14} /> Live score</> : isFinal ? 'Final score' : liveLabel}</div></div>
  </div></div>;
}
