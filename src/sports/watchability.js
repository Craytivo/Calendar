import { getPriorityScore, getPriorityTier } from './priority.js';

const LEVELS = [
  { min: 90, label: 'EPIC' },
  { min: 75, label: 'HOT' },
  { min: 55, label: 'GOOD' },
  { min: 35, label: 'INTERESTING' },
  { min: 0, label: 'LOW' },
];

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function scoreFor(game, side) {
  const value = side === 'away' ? game.awayScore ?? game.awayTeam?.score : game.homeScore ?? game.homeTeam?.score;
  return Number.isFinite(Number(value)) ? Number(value) : undefined;
}

function scoreDiff(game) {
  const away = scoreFor(game, 'away');
  const home = scoreFor(game, 'home');
  if (away === undefined || home === undefined) return undefined;
  return Math.abs(away - home);
}

function isLiveOrFinal(game) {
  return game.status === 'live' || game.status === 'final';
}

function getImportanceScore(game) {
  const priority = getPriorityScore(game);
  const tier = getPriorityTier(game);
  const tierBonus = [24, 18, 12, 7, 3, 0, 0][tier] ?? 0;
  return clamp(priority * 0.72 + tierBonus);
}

export function getExcitementScore(game) {
  const live = game.status === 'live';
  const final = game.status === 'final';
  const diff = scoreDiff(game);
  let score = 0;

  if (live) score += 20;
  if (final) score += 8;

  if (diff !== undefined) {
    if (diff === 0) score += 42;
    else if (diff === 1) score += 38;
    else if (diff === 2) score += 32;
    else if (diff <= 4) score += 24;
    else if (diff <= 7) score += 16;
    else if (diff <= 10) score += 9;
  }

  const period = Number(game.period);
  const clockSeconds = Number(game.clockSeconds);
  if (live && Number.isFinite(period)) score += Math.min(10, period * 2);
  if (live && Number.isFinite(clockSeconds) && clockSeconds <= 120) score += 12;
  if (game.isOvertime === true || game.overtime === true) score += 28;
  if (game.isElimination === true) score += 8;

  return clamp(score);
}

export function getWatchScore(game) {
  const importance = getImportanceScore(game);
  const excitement = getExcitementScore(game);
  const liveOrFinal = isLiveOrFinal(game);
  const weight = liveOrFinal ? 0.52 : 0.78;
  return Math.round(clamp(importance * weight + excitement * (1 - weight)));
}

export function getWatchLevel(score) {
  const numeric = clamp(Number(score) || 0);
  return LEVELS.find((level) => numeric >= level.min) || LEVELS.at(-1);
}

export function getWatchReasons(game) {
  const reasons = [];
  const diff = scoreDiff(game);
  const level = getWatchLevel(getWatchScore(game)).label;

  if (game.status === 'live') reasons.push('Live now');
  if (game.isOvertime === true || game.overtime === true) reasons.push('Overtime');
  if (diff === 0) reasons.push('Tied game');
  else if (diff === 1) reasons.push('One-score game');
  else if (diff !== undefined && diff <= 4) reasons.push('Close game');
  if (game.isElimination === true) reasons.push('Elimination');
  if (getPriorityTier(game) <= 2) reasons.push('High importance');
  if (game.leagueId === 'ncaa-football' && Number.isFinite(game.homeTeam?.ranking) && Number.isFinite(game.awayTeam?.ranking)) reasons.push('Ranked matchup');
  if (level === 'EPIC') reasons.push('Peak watchability');

  return [...new Set(reasons)].slice(0, 3);
}

export function getWatchability(game) {
  const score = getWatchScore(game);
  return { score, ...getWatchLevel(score), importance: Math.round(getImportanceScore(game)), excitement: Math.round(getExcitementScore(game)), reasons: getWatchReasons(game) };
}
