import React, { useEffect, useState } from 'react';
import { Clock3, Star } from 'lucide-react';
import { leagues } from '../sports/leagues.js';
import { getPriorityReasons } from '../sports/priority.js';
import { favoriteTeamIds } from '../sports/team-identity.js';
import { scoreGameV2 } from '../sports/scoring/index-v2.js';
import { getGameScore, getGameScoreLevel, getGameScoreReasons } from '../sports/game-score.js';
import { getLiveGameSignal } from '../sports/game-intelligence.js';
import { formatScoreboardMeta } from '../sports/clock.js';
import { TeamMark, getDisplayTeamName } from './TeamMark.jsx';
import './GameCard.css';

const PEAK_SCORE_STORAGE_KEY = 'calendar:game-score-peaks:v1';
function minutesUntil(startTime) { return Math.max(0, Math.ceil((new Date(startTime).getTime() - Date.now()) / 60000)); }
function statusLabel(game, startingSoon) { if (game.status === 'live') return 'LIVE'; if (game.status === 'final') return 'FINAL'; if (game.status === 'postponed') return 'POSTPONED'; if (game.status === 'cancelled') return 'CANCELLED'; if (startingSoon) return `STARTS IN ${minutesUntil(game.startTime)}M`; return new Date(game.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
function teamLabel(team, leagueId) { const name = getDisplayTeamName(team); const ranking = leagueId === 'ncaa-football' && Number.isInteger(team?.ranking) && team.ranking > 0 && team.ranking <= 25 ? `#${team.ranking} ` : ''; return `${ranking}${name}`; }
function scoreFor(game, side) { const topLevel = side === 'away' ? game.awayScore : game.homeScore; if (topLevel != null) return topLevel; const teamScore = side === 'away' ? game.awayTeam?.score : game.homeTeam?.score; return teamScore != null ? teamScore : null; }
function readPeakScore(gameId) { if (typeof window === 'undefined' || !gameId) return 0; try { const values = JSON.parse(window.localStorage.getItem(PEAK_SCORE_STORAGE_KEY) || '{}'); return Number(values[gameId]) || 0; } catch { return 0; } }
function writePeakScore(gameId, score) { if (typeof window === 'undefined' || !gameId || !Number.isFinite(score)) return; try { const values = JSON.parse(window.localStorage.getItem(PEAK_SCORE_STORAGE_KEY) || '{}'); if (score <= (Number(values[gameId]) || 0)) return; values[gameId] = score; window.localStorage.setItem(PEAK_SCORE_STORAGE_KEY, JSON.stringify(values)); } catch { /* Non-critical persistence. */ } }
function getScoringReasons(scoring) { const breakdown = scoring?.breakdown || {}; return [...(breakdown.stakes?.reasons || []), ...(breakdown.narrative?.reasons || []), ...(breakdown.personal?.reasons || []), ...(breakdown.competitive?.reasons || []), ...(breakdown.teamQuality?.reasons || []), ...(breakdown.form?.reasons || [])].filter(Boolean).filter((reason, index, reasons) => reasons.indexOf(reason) === index); }
function getWhyItMatters(game, scoring, priorityReasons, liveSignal, gameScore) { const modelReasons = getScoringReasons(scoring); const scoreReasons = getGameScoreReasons(game); const primary = game.status === 'live' ? (scoreReasons[0] || liveSignal?.reason) : modelReasons[0]; const secondaryPool = game.status === 'live' ? [...scoreReasons, ...modelReasons, ...priorityReasons] : [...modelReasons, ...priorityReasons, ...scoreReasons]; const secondary = secondaryPool.find((reason) => reason && reason !== primary) || (gameScore >= 75 ? 'High Game Score' : null); return [primary, secondary].filter(Boolean).slice(0, 2); }
function priorityClass(tier) { return `priority-${String(tier || '').toLowerCase().replace(/\s+/g, '-')}`; }

export function GameCard({ game, compact = false, onOpen }) {
  const league = leagues.find((item) => item.id === game.leagueId);
  const scoring = scoreGameV2(game);
  const priorityScore = scoring.total;
  const priorityTier = scoring.tier;
  const priorityConfidence = scoring.confidence;
  const rawPriorityScore = scoring.rawTotal;
  const confidenceAdjustedPriority = scoring.confidenceAdjustedTotal;
  const currentGameScore = getGameScore(game);
  const [peakScore, setPeakScore] = useState(() => readPeakScore(game.id));
  const gameScore = getGameScore(game, { peakScore });
  const gameScoreLevel = getGameScoreLevel(gameScore);
  const liveSignal = getLiveGameSignal(game);
  const priorityReasons = getPriorityReasons(game);
  const isLive = game.status === 'live';
  const isFinal = game.status === 'final';
  const isStartingSoon = game.status === 'scheduled' && minutesUntil(game.startTime) <= 60 && new Date(game.startTime).getTime() >= Date.now();
  const isFavorite = favoriteTeamIds.has(game.homeTeamId) || favoriteTeamIds.has(game.awayTeamId);
  const away = game.awayTeam || { name: 'TBD' };
  const home = game.homeTeam || { name: 'TBD' };
  const awayScore = scoreFor(game, 'away');
  const homeScore = scoreFor(game, 'home');
  const hasScore = (isLive || isFinal) && (awayScore != null || homeScore != null);
  const meta = formatScoreboardMeta(game);
  const whyItMatters = getWhyItMatters(game, scoring, priorityReasons, liveSignal, gameScore);
  const lowConfidence = priorityConfidence < 0.85;

  useEffect(() => {
    if (!game.id || !Number.isFinite(currentGameScore)) return;
    const nextPeak = Math.max(peakScore, currentGameScore);
    if (nextPeak !== peakScore) setPeakScore(nextPeak);
    writePeakScore(game.id, nextPeak);
  }, [game.id, currentGameScore, peakScore]);

  return (
    <button type="button" className={`game-card ${compact ? 'compact' : ''} ${isLive ? 'live' : ''} ${isFinal ? 'final' : ''} ${isStartingSoon ? 'starting-soon' : ''} ${isFavorite ? 'favorite-team-card' : ''} ${priorityClass(priorityTier)} score-${gameScoreLevel.toLowerCase()}`} onClick={() => onOpen?.(game)} aria-label={`View details for ${getDisplayTeamName(away)} at ${getDisplayTeamName(home)}, Priority ${priorityScore}, ${priorityTier}`} data-priority-score={priorityScore} data-score={priorityScore} data-raw-score={rawPriorityScore} data-confidence-adjusted-score={confidenceAdjustedPriority} data-confidence={priorityConfidence} data-score-tier={priorityTier} data-game-score={gameScore}>
      <header className="game-card-header">
        <div className="game-card-context">
          <span className="game-card-league">{league?.shortName || game.leagueId.toUpperCase()}</span>
          {isLive && <span className="game-card-status live-status"><span className="game-card-live-dot" aria-hidden="true" />LIVE</span>}
          {!isLive && isStartingSoon && <span className="game-card-status starting-status"><Clock3 size={11} aria-hidden="true" />{statusLabel(game, true)}</span>}
          {!isLive && !isStartingSoon && isFinal && <span className="game-card-status">FINAL</span>}
        </div>
        <div className="game-card-header-right">
          <div className="game-card-priority" title={`Priority ${priorityScore} · ${priorityTier}${lowConfidence ? ` · ${Math.round(priorityConfidence * 100)}% confidence` : ''}`} aria-label={`Priority ${priorityScore}, ${priorityTier}${lowConfidence ? `, ${Math.round(priorityConfidence * 100)}% confidence` : ''}`}>
            <span>PRIORITY</span>
            <strong>{priorityScore}</strong>
          </div>
          {isLive && <div className="game-card-live-metric" title={`Live Game Score ${gameScore} · ${gameScoreLevel}`} aria-label={`Live Game Score ${gameScore}, ${gameScoreLevel}`}><span>LIVE SCORE</span><strong>{gameScore}</strong></div>}
          {isFavorite && <Star size={15} fill="currentColor" className="game-card-favorite" aria-label="Favorite team" />}
        </div>
      </header>

      <div className={`game-card-matchup ${hasScore ? 'has-score' : ''}`}>
        <div className={`game-card-team ${isFinal && awayScore != null && homeScore != null && awayScore > homeScore ? 'winner' : ''}`}>
          <TeamMark team={away} size={compact ? 'medium' : 'large'} />
          <span>{teamLabel(away, game.leagueId)}</span>
          {hasScore && <strong>{awayScore ?? '—'}</strong>}
        </div>
        <div className="game-card-divider" aria-hidden="true" />
        <div className={`game-card-team ${isFinal && awayScore != null && homeScore != null && homeScore > awayScore ? 'winner' : ''}`}>
          <TeamMark team={home} size={compact ? 'medium' : 'large'} />
          <span>{teamLabel(home, game.leagueId)}</span>
          {hasScore && <strong>{homeScore ?? '—'}</strong>}
        </div>
      </div>

      {!compact && whyItMatters.length > 0 && <footer className="game-card-insight"><span>WHY IT MATTERS</span><strong>{whyItMatters[0]}</strong></footer>}
    </button>
  );
}
