import { favoriteTeamIds } from './team-identity.js';
import { getPriorityScore } from './priority.js';
import { getNFLMarketContext, getNFLMarketScore } from './nfl-market.js';

const SOCCER = new Set(['soccer', 'epl', 'laliga', 'ucl']);
const FIELD_SPORTS = new Set(['nfl', 'nba', 'ncaa-football', 'nhl']);

function number(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : undefined; }
function scoreFor(game, side) { const value = side === 'away' ? game?.awayScore ?? game?.awayTeam?.score : game?.homeScore ?? game?.homeTeam?.score; return number(value); }
function difference(game) { const away = scoreFor(game, 'away'); const home = scoreFor(game, 'home'); return away === undefined || home === undefined ? undefined : Math.abs(away - home); }
function totalPoints(game) { const away = scoreFor(game, 'away'); const home = scoreFor(game, 'home'); return away === undefined || home === undefined ? undefined : away + home; }
function isFavorite(game) { return favoriteTeamIds.has(game?.homeTeamId) || favoriteTeamIds.has(game?.awayTeamId); }
function isOvertime(game) { return game?.isOvertime === true || game?.overtime === true || /overtime|extra time|aet/.test(String(game?.statusDetail ?? game?.shortDetail ?? '').toLowerCase()); }

function isLate(game) {
  const clock = number(game?.clockSeconds);
  const period = number(game?.period);
  const mode = game?.clockMode;
  const sport = game?.leagueId;
  if (mode === 'elapsed' || SOCCER.has(sport)) return clock !== undefined && clock >= 75 * 60;
  if (mode === 'remaining' || FIELD_SPORTS.has(sport)) return (clock !== undefined && clock <= 300) || (period !== undefined && period >= 4);
  if (mode === 'inning' || sport === 'mlb') return period !== undefined && period >= 7;
  return false;
}

// Close scores are intentionally modest until a game is actually late.
// A generic non-favorite game should not become a top calendar item merely because it is 1-1 in the second quarter/period.
function closeScoreBonus(game) {
  const diff = difference(game);
  if (diff === undefined) return 0;
  const late = isLate(game);
  if (game?.status === 'live' && !late) {
    if (diff === 0) return 10;
    if (diff === 1) return SOCCER.has(game?.leagueId) ? 9 : 8;
    if (diff === 2) return 6;
    if (diff <= 4) return 3;
    return 0;
  }
  if (diff === 0) return late ? 38 : 18;
  if (diff === 1) return late ? (SOCCER.has(game?.leagueId) ? 34 : 32) : (SOCCER.has(game?.leagueId) ? 16 : 14);
  if (diff === 2) return late ? 24 : 12;
  if (diff <= 4) return late ? 16 : 8;
  if (diff <= 7) return late ? 8 : 4;
  return 0;
}

function lateGameBonus(game) {
  const clock = number(game?.clockSeconds);
  const period = number(game?.period);
  const mode = game?.clockMode;
  const sport = game?.leagueId;
  if (mode === 'elapsed' || SOCCER.has(sport)) {
    if (clock !== undefined && clock >= 85 * 60) return 30;
    if (clock !== undefined && clock >= 75 * 60) return 18;
    return 0;
  }
  if (mode === 'remaining' || FIELD_SPORTS.has(sport)) {
    if (clock !== undefined && clock <= 120) return 30;
    if (clock !== undefined && clock <= 300) return 18;
    if (period !== undefined && period >= 4) return 10;
    if (period !== undefined && period >= 3) return 4;
    return 0;
  }
  if (mode === 'inning' || sport === 'mlb') {
    if (period !== undefined && period >= 9) return 22;
    if (period !== undefined && period >= 7) return 14;
  }
  return 0;
}

function liveDrama(game) {
  if (game?.status !== 'live') return 0;
  let score = 6 + closeScoreBonus(game) + lateGameBonus(game);
  if (isOvertime(game)) score += 24;
  if (game?.isElimination === true) score += 14;
  if (game?.eventType === 'championship' || game?.eventType === 'final') score += 12;
  return Math.min(score, 80);
}

function finalDrama(game) {
  if (game?.status !== 'final') return 0;
  const sport = game?.leagueId;
  const diff = difference(game);
  const total = totalPoints(game);
  let score = 4 + closeScoreBonus(game);
  if (isOvertime(game)) score += 26;
  if (game?.isElimination === true) score += 14;
  if (game?.eventType === 'championship' || game?.eventType === 'final') score += 12;
  if (SOCCER.has(sport)) {
    if (total !== undefined && total >= 5) score += 18;
    else if (total !== undefined && total >= 4) score += 10;
  } else if (FIELD_SPORTS.has(sport)) {
    if (total !== undefined && total >= 60) score += 16;
    else if (total !== undefined && total >= 45) score += 8;
  } else if (sport === 'mlb') {
    if (total !== undefined && total >= 10) score += 12;
    if (diff !== undefined && diff <= 2) score += 6;
  }
  return Math.min(score, 80);
}

function importance(game) {
  const priority = getPriorityScore(game);
  const favorite = isFavorite(game);
  let score = Math.min(priority * 0.28, 24);
  if (favorite) score += 25;
  if (game?.isMajorEvent === true) score += 10;
  if (game?.isElimination === true) score += 14;
  if (game?.hasPlayoffImplications === true || game?.hasSeedingImplications === true || game?.hasQualificationImplications === true) score += 10;
  return Math.min(score, 65);
}

function baseInterest(game) {
  const sport = game?.leagueId;
  const major = game?.isMajorEvent === true || game?.eventType === 'championship' || game?.eventType === 'final';
  const ranked = sport === 'ncaa-football' && Number.isFinite(game?.homeTeam?.ranking) && Number.isFinite(game?.awayTeam?.ranking);
  if (major) return 16;
  if (ranked) return 12;
  if (SOCCER.has(sport)) return 6;
  return 4;
}

export function getGameScore(game, { peakScore } = {}) {
  if (!game) return 0;
  const personal = importance(game);
  const drama = game.status === 'final' ? finalDrama(game) : liveDrama(game);
  const base = baseInterest(game);
  // NFL betting-market context is a bounded pregame prior. It contributes to
  // the canonical Game Score without replacing the existing contextual model.
  const market = game?.leagueId === 'nfl' && game?.status !== 'live' && game?.status !== 'final'
    ? getNFLMarketScore(game)
    : 0;
  const current = Math.min(100, Math.round(personal + drama + base + market));
  if (game.status === 'final' && Number.isFinite(Number(peakScore))) return Math.min(100, Math.max(current, Number(peakScore)));
  return current;
}

export function getGameScoreLevel(score) {
  const value = Number(score) || 0;
  if (value >= 90) return 'EPIC';
  if (value >= 75) return 'HOT';
  if (value >= 60) return 'GOOD';
  if (value >= 40) return 'INTERESTING';
  return 'LOW';
}

export function getGameScoreReasons(game) {
  const reasons = [];
  if (isFavorite(game)) reasons.push('Favorite team');
  if (game?.leagueId === 'nfl' && game?.status !== 'live' && game?.status !== 'final') {
    const market = getNFLMarketContext(game);
    if (market.available) {
      if (market.competitivenessScore >= 80) reasons.push('Expected close game');
      else if (market.scoringEnvironmentScore >= 75) reasons.push('High scoring expectation');
    }
  }
  if (game?.status === 'live') {
    const diff = difference(game);
    if (isOvertime(game)) reasons.push('Overtime');
    if (diff === 0) reasons.push('Tied game');
    else if (diff === 1) reasons.push(SOCCER.has(game?.leagueId) ? 'One-goal game' : 'One-score game');
    const clock = number(game?.clockSeconds);
    if (SOCCER.has(game?.leagueId) && clock !== undefined && clock >= 80 * 60) reasons.push('Late in the match');
    else if (!SOCCER.has(game?.leagueId) && clock !== undefined && clock <= 120) reasons.push('Final minutes');
  }
  if (game?.status === 'final') {
    if (difference(game) === 0) reasons.push('Tied at the end');
    else if (difference(game) === 1) reasons.push(SOCCER.has(game?.leagueId) ? 'One-goal finish' : 'One-score finish');
    if (isOvertime(game)) reasons.push('Overtime finish');
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

export function getGameScoreComponents(game) {
  const market = game?.leagueId === 'nfl' ? getNFLMarketContext(game) : undefined;
  return {
    personalRelevance: Math.round(importance(game)),
    liveDrama: Math.round(liveDrama(game)),
    finalDrama: Math.round(finalDrama(game)),
    baseInterest: Math.round(baseInterest(game)),
    marketExcitement: market?.available ? Math.round(getNFLMarketScore(game)) : 0,
    marketCompetitiveness: market?.available ? market.competitivenessScore : 0,
    marketScoringEnvironment: market?.available ? market.scoringEnvironmentScore : 0,
  };
}
