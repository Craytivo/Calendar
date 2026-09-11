import { getGameScore } from './game-score.js';

function scoreFor(game, side) {
  const value = side === 'away' ? game?.awayScore ?? game?.awayTeam?.score : game?.homeScore ?? game?.homeTeam?.score;
  return Number.isFinite(Number(value)) ? Number(value) : undefined;
}

function scoreDifference(game) {
  const away = scoreFor(game, 'away');
  const home = scoreFor(game, 'home');
  return away === undefined || home === undefined ? undefined : Math.abs(away - home);
}

function clock(game) {
  const value = Number(game?.clockSeconds);
  return Number.isFinite(value) ? value : undefined;
}

function detail(game) {
  return String(game?.statusDetail ?? game?.shortDetail ?? '').toLowerCase();
}

export function getLiveGameSignal(game) {
  if (game?.status !== 'live') return { level: 'scheduled', label: '', reason: '' };

  const diff = scoreDifference(game);
  const seconds = clock(game);
  const sport = game?.leagueId;
  const late = seconds !== undefined && (sport === 'soccer' || sport === 'epl' || sport === 'laliga' || sport === 'ucl' ? seconds >= 80 * 60 : seconds <= 120);
  const close = diff !== undefined && diff <= (sport === 'soccer' || sport === 'epl' || sport === 'laliga' || sport === 'ucl' ? 1 : sport === 'mlb' ? 2 : 7);
  const overtime = game?.isOvertime === true || game?.overtime === true || /overtime|extra time|aet/.test(detail(game));
  const elimination = game?.isElimination === true;
  const gameScore = getGameScore(game);

  if (elimination || overtime || (late && close) || gameScore >= 90) return { level: 'critical', label: 'CRITICAL MOMENT', reason: elimination ? 'Elimination game' : overtime ? 'Overtime' : late && close ? 'Late and close' : 'Exceptional game' };
  if (late || close || gameScore >= 75) return { level: 'heating', label: 'HEATING UP', reason: late ? 'Late in the game' : close ? 'Close game' : 'High Game Score' };
  if (gameScore >= 55) return { level: 'favorite', label: 'HIGH INTEREST', reason: 'High Game Score' };
  return { level: 'live', label: 'LIVE', reason: 'Game in progress' };
}

export function getLiveGameReasons(game) {
  if (game?.status !== 'live') return [];
  const reasons = [];
  const signal = getLiveGameSignal(game);
  const diff = scoreDifference(game);
  const seconds = clock(game);
  const sport = game?.leagueId;
  const overtime = game?.isOvertime === true || game?.overtime === true || /overtime|extra time|aet/.test(detail(game));
  if (signal.level === 'critical') reasons.push(signal.reason);
  if (overtime) reasons.push('Overtime');
  if (diff === 0) reasons.push('Tied game');
  else if (diff === 1) reasons.push(sport === 'mlb' ? 'One-run game' : 'One-score game');
  else if (diff !== undefined && ((sport === 'nfl' || sport === 'ncaaf') ? diff <= 8 : diff <= (sport === 'mlb' ? 2 : 7))) reasons.push('One-score game');
  if (seconds !== undefined && ((sport === 'soccer' || sport === 'epl' || sport === 'laliga' || sport === 'ucl') ? seconds >= 80 * 60 : seconds <= 120)) reasons.push('Late in the game');
  if (game?.isElimination === true) reasons.push('Elimination');
  return [...new Set(reasons)].slice(0, 3);
}

export function getLiveSignalRank(game) {
  const rank = { critical: 0, heating: 1, favorite: 2, live: 3, scheduled: 4 };
  return rank[getLiveGameSignal(game).level] ?? 4;
}
