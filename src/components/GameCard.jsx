import React, { useEffect, useState } from 'react';
import { Clock3, Star } from 'lucide-react';
import { leagues } from '../sports/leagues.js';
import { getPriorityScore, getPriorityTier, getPriorityReasons } from '../sports/priority.js';
import { favoriteTeamIds } from '../sports/team-identity.js';
import { getGameScore, getGameScoreLevel } from '../sports/game-score.js';
import { getLiveGameSignal } from '../sports/game-intelligence.js';
import { formatScoreboardMeta } from '../sports/clock.js';
import { TeamMark, getDisplayTeamName } from './TeamMark.jsx';
import './GameCard.css';

const PEAK_SCORE_STORAGE_KEY = 'calendar:game-score-peaks:v1';

function formatTime(startTime) { return new Date(startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
function minutesUntil(startTime) { return Math.max(0, Math.ceil((new Date(startTime).getTime() - Date.now()) / 60000)); }
function statusLabel(game, startingSoon) { if (game.status === 'live') return 'LIVE'; if (game.status === 'final') return 'FINAL'; if (game.status === 'postponed') return 'POSTPONED'; if (game.status === 'cancelled') return 'CANCELLED'; if (startingSoon) return `STARTS IN ${minutesUntil(game.startTime)}M`; return formatTime(game.startTime); }
function teamLabel(team, leagueId) { const name = getDisplayTeamName(team); const ranking = leagueId === 'ncaa-football' && Number.isInteger(team?.ranking) && team.ranking > 0 && team.ranking <= 25 ? `#${team.ranking} ` : ''; return `${ranking}${name}`; }
function scoreFor(game, side) { const topLevel = side === 'away' ? game.awayScore : game.homeScore; if (topLevel != null) return topLevel; const teamScore = side === 'away' ? game.awayTeam?.score : game.homeTeam?.score; return teamScore != null ? teamScore : null; }
function readPeakScore(gameId) { if (typeof window === 'undefined' || !gameId) return 0; try { const values = JSON.parse(window.localStorage.getItem(PEAK_SCORE_STORAGE_KEY) || '{}'); return Number(values[gameId]) || 0; } catch { return 0; } }
function writePeakScore(gameId, score) { if (typeof window === 'undefined' || !gameId || !Number.isFinite(score)) return; try { const values = JSON.parse(window.localStorage.getItem(PEAK_SCORE_STORAGE_KEY) || '{}'); if (score <= (Number(values[gameId]) || 0)) return; values[gameId] = score; window.localStorage.setItem(PEAK_SCORE_STORAGE_KEY, JSON.stringify(values)); } catch { /* Non-critical persistence. */ } }
function getInsight(game, priorityReasons, liveSignal, gameScore) { if (game.status === 'live' && liveSignal?.reason) return [liveSignal.label || 'Live game', liveSignal.reason]; if (gameScore >= 110) return ['Epic game', 'High drama or major stakes']; if (priorityReasons.length >= 2) return priorityReasons.slice(0, 2); if (priorityReasons.length === 1) return [priorityReasons[0], null]; if (game.isMajorEvent) return ['Major event', null]; return [null, null]; }

export function GameCard({ game, compact = false, onOpen }) {
  const league = leagues.find((item) => item.id === game.leagueId);
  const tier = getPriorityTier(game);
  const priorityScore = getPriorityScore(game);
  const currentGameScore = getGameScore(game);
  const [peakScore, setPeakScore] = useState(() => readPeakScore(game.id));
  const gameScore = getGameScore(game, { peakScore });
  const gameScoreLevel = getGameScoreLevel(gameScore);
  const liveSignal = getLiveGameSignal(game);
  const priorityReasons = getPriorityReasons(game);
  const isLive = game.status === 'live';
  const isFinal = game.status === 'final';
  const isStartingSoon = game.status === 'scheduled' && minutesUntil(game.startTime) <= 60 && new Date(game.startTime).getTime() >= Date.now();
  const isFavorite = favoriteTeamIds.has(game.homeTeamId) || favoriteTeamIds.has(game.awayTeamId) || Boolean(game.homeTeam?.favorite || game.awayTeam?.favorite);
  const away = game.awayTeam || { name: 'TBD' };
  const home = game.homeTeam || { name: 'TBD' };
  const awayScore = scoreFor(game, 'away');
  const homeScore = scoreFor(game, 'home');
  const hasScore = (isLive || isFinal) && (awayScore != null || homeScore != null);
  const meta = formatScoreboardMeta(game);
  const [primaryInsight, secondaryInsight] = getInsight(game, priorityReasons, liveSignal, gameScore);

  useEffect(() => {
    if (!game.id || !Number.isFinite(currentGameScore)) return;
    const nextPeak = Math.max(peakScore, currentGameScore);
    if (nextPeak !== peakScore) setPeakScore(nextPeak);
    writePeakScore(game.id, nextPeak);
  }, [game.id, currentGameScore, peakScore]);

  return (
    <button type="button" className={`game-card ${compact ? 'compact' : ''} ${isLive ? 'live' : ''} ${isFinal ? 'final' : ''} ${isStartingSoon ? 'starting-soon' : ''} ${isFavorite ? 'favorite-team-card' : ''} accent-${game.leagueId === 'nba' || game.leagueId === 'epl' || game.leagueId === 'ucl' ? 'blue' : game.leagueId === 'mlb' || game.leagueId === 'ncaa-football' ? 'green' : game.leagueId === 'nhl' || game.leagueId === 'laliga' ? 'red' : 'neutral'}`} onClick={() => onOpen?.(game)} aria-label={`View details for ${getDisplayTeamName(away)} at ${getDisplayTeamName(home)}`} data-priority-score={priorityScore} data-game-score={gameScore}>
      <header className="game-card-header">
        <span className="game-card-league">{league?.shortName || game.leagueId.toUpperCase()}</span>
        <div className="game-card-header-meta">
          <span className="game-card-signal" title={`Game Score: ${gameScore} · ${gameScoreLevel}`} aria-label={`Game Score ${gameScore}`}>
            <strong style={{ fontFamily: 'Manrope', fontSize: compact ? 16 : 20, lineHeight: 1, fontWeight: 850, letterSpacing: '-0.06em', color: 'var(--text)' }}>{gameScore}</strong>
            <small style={{ fontSize: compact ? 6 : 7, fontWeight: 850, letterSpacing: '.1em', textTransform: 'uppercase' }}>GAME SCORE</small>
          </span>
          {isStartingSoon && !isLive && <Clock3 size={12} aria-hidden="true" />}
          {isLive && <span className="game-card-live-dot" aria-hidden="true" />}
          <span className="game-card-time">{statusLabel(game, isStartingSoon)}</span>
          {isFavorite && <Star size={13} fill="currentColor" className="game-card-favorite" aria-label="Favorite team" />}
        </div>
      </header>
      <div className={`game-card-matchup ${hasScore ? 'has-score' : ''}`}>
        <div className={`game-card-team ${isFinal && awayScore != null && homeScore != null && awayScore > homeScore ? 'winner' : ''}`}><TeamMark team={away} size={compact ? 'medium' : 'large'} /><span>{teamLabel(away, game.leagueId)}</span>{hasScore && <strong>{awayScore ?? '—'}</strong>}</div>
        <div className="game-card-vs" aria-hidden="true">{hasScore ? (meta || (isLive ? 'LIVE' : 'FINAL')) : 'at'}</div>
        <div className={`game-card-team ${isFinal && awayScore != null && homeScore != null && homeScore > awayScore ? 'winner' : ''}`}><TeamMark team={home} size={compact ? 'medium' : 'large'} /><span>{teamLabel(home, game.leagueId)}</span>{hasScore && <strong>{homeScore ?? '—'}</strong>}</div>
      </div>
      {!compact && (primaryInsight || secondaryInsight) && <footer className="game-card-insight"><span>Why it matters</span><div>{primaryInsight && <strong>{primaryInsight}</strong>}{secondaryInsight && <small>{secondaryInsight}</small>}</div></footer>}
    </button>
  );
}
