import { favoriteTeamIds } from './team-identity.js';
import { getPriorityScore } from './priority.js';

const SOCCER = new Set(['soccer', 'epl', 'laliga', 'ucl']);

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function scoreFor(game, side) {
  const value = side === 'away' ? game?.awayScore ?? game?.awayTeam?.score : game?.homeScore ?? game?.homeTeam?.score;
  return number(value);
}

function difference(game) {
  const away = scoreFor(game, 'away');
  const home = scoreFor(game, 'home');
  return away === undefined || home === undefined ? undefined : Math.abs(away - home);
}

function isFavorite(game) {
  return favoriteTeamIds.has(game?.homeTeamId) || favoriteTeamIds.has(game?.awayTeamId)
    || Boolean(game?.homeTeam?.favorite || game?.awayTeam?.favorite);
}

function isOvertime(game) {
  return game?.isOvertime === true || game?.overtime === true || /overtime|extra time|aet/.test(String(game?.statusDetail ?? game?.shortDetail ?? '').toLowerCase());
}

function liveDrama(game) {
  if (game?.status !== 'live') return 0;

  const sport = game?.leagueId;
  const diff = difference(game);
  const clock = number(game?.clockSeconds);
  const period = number(game?.period);
  let score = 12;

  if (diff !== undefined) {
    if (diff === 0) score += 38;
    else if (SOCCER.has(sport) && diff === 1) score += 32;
    else if (diff === 1) score += 34;
    else if (diff === 2) score += 25;
    else if (diff <= 4) score += 18;
    else if (diff <= 7) score += 10;
  }

  if (isOvertime(game)) score += 30;
  if (game?.isElimination === true) score += 14;
  if (game?.eventType === 'championship' || game?.eventType === 'final') score += 12;

  if (SOCCER.has(sport)) {
    if (clock !== undefined && clock >= 80 * 60) score += 28;
    else if (clock !== undefined && clock >= 70 * 60) score += 16;
  } else if (sport === 'nfl' || sport === 'nba' || sport === 'ncaa-football' || sport === 'nhl') {
    if (clock !== undefined && clock <= 120) score += 28;
    else if (clock !== undefined && clock <= 300) score += 16;
    if (period !== undefined && period >= 3) score += 8;
  } else if (sport === 'mlb') {
    if (period !== undefined && period >= 7) score += 18;
    if (diff !== undefined && diff <= 2 && period !== undefined && period >= 7) score += 12;
  }

  return Math.min(score, 100);
}

function importance(game) {
  const priority = getPriorityScore(game);
  const favorite = isFavorite(game);
  let score = Math.min(priority * 0.45, 38);
  if (favorite) score += 22;
  if (game?.isMajorEvent === true) score += 10;
  if (game?.isElimination === true) score += 10;
  if (game?.hasPlayoffImplications === true || game?.hasSeedingImplications === true || game?.hasQualificationImplications === true) score += 8;
  return Math.min(score, 70);
}

function baseInterest(game) {
  const sport = game?.leagueId;
  const major = game?.isMajorEvent === true || game?.eventType === 'championship' || game?.eventType === 'final';
  const ranked = sport === 'ncaa-football' && Number.isFinite(game?.homeTeam?.ranking) && Number.isFinite(game?.awayTeam?.ranking);
  if (major) return 20;
  if (ranked) return 14;
  if (SOCCER.has(sport)) return 8;
  return 5;
}

export function getGameScore(game, { peakScore } = {}) {
  if (!game) return 0;
  const personal = importance(game);
  const drama = liveDrama(game);
  const base = baseInterest(game);
  const current = Math.round(Math.min(140, personal + drama + base));
  if (game.status === 'final' && Number.isFinite(Number(peakScore))) return Math.max(current, Number(peakScore));
  return current;
}

export function getGameScoreLevel(score) {
  const value = Number(score) || 0;
  if (value >= 110) return 'EPIC';
  if (value >= 90) return 'HOT';
  if (value >= 70) return 'GOOD';
  if (value >= 45) return 'INTERESTING';
  return 'LOW';
}

export function getGameScoreReasons(game) {
  const reasons = [];
  if (isFavorite(game)) reasons.push('Favorite team');
  if (game?.status === 'live') {
    const diff = difference(game);
    if (isOvertime(game)) reasons.push('Overtime');
    if (diff === 0) reasons.push('Tied game');
    else if (diff === 1) reasons.push(SOCCER.has(game?.leagueId) ? 'One-goal game' : 'One-score game');
    const clock = number(game?.clockSeconds);
    if (SOCCER.has(game?.leagueId) && clock !== undefined && clock >= 80 * 60) reasons.push('Late in the match');
    else if (!SOCCER.has(game?.leagueId) && clock !== undefined && clock <= 120) reasons.push('Final minutes');
  }
  if (game?.isElimination === true) reasons.push('Elimination');
  if (game?.hasPlayoffImplications || game?.hasSeedingImplications || game?.hasQualificationImplications) reasons.push('Meaningful implications');
  if (game?.isMajorEvent === true) reasons.push('Major event');
  return [...new Set(reasons)].slice(0, 2);
}

export function getGameScoreSnapshot(game, peakScore) {
  const score = getGameScore(game, { peakScore });
  return { score, level: getGameScoreLevel(score), reasons: getGameScoreReasons(game) };
}
