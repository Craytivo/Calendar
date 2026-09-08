import { favoriteTeamIds } from './team-identity.js';
import { getPriorityScore } from './priority.js';

const SOCCER = new Set(['soccer', 'epl', 'laliga', 'ucl']);
const FIELD_SPORTS = new Set(['nfl', 'nba', 'ncaa-football', 'nhl']);

function number(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : undefined; }
function scoreFor(game, side) { const value = side === 'away' ? game?.awayScore ?? game?.awayTeam?.score : game?.homeScore ?? game?.homeTeam?.score; return number(value); }
function difference(game) { const away = scoreFor(game, 'away'); const home = scoreFor(game, 'home'); return away === undefined || home === undefined ? undefined : Math.abs(away - home); }
function totalPoints(game) { const away = scoreFor(game, 'away'); const home = scoreFor(game, 'home'); return away === undefined || home === undefined ? undefined : away + home; }
function isFavorite(game) { return favoriteTeamIds.has(game?.homeTeamId) || favoriteTeamIds.has(game?.awayTeamId) || Boolean(game?.homeTeam?.favorite || game?.awayTeam?.favorite); }
function isOvertime(game) { return game?.isOvertime === true || game?.overtime === true || /overtime|extra time|aet/.test(String(game?.statusDetail ?? game?.shortDetail ?? '').toLowerCase()); }
function closeScoreBonus(game) { const diff = difference(game); if (diff === undefined) return 0; if (diff === 0) return 40; if (diff === 1) return SOCCER.has(game?.leagueId) ? 34 : 38; if (diff === 2) return 28; if (diff <= 4) return 20; if (diff <= 7) return 10; return 0; }
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
    if (period !== undefined && period >= 3) return 8;
    return 0;
  }
  if (mode === 'inning' || sport === 'mlb') {
    if (period !== undefined && period >= 9) return 22;
    if (period !== undefined && period >= 7) return 14;
  }
  return 0;
}
function liveDrama(game) { if (game?.status !== 'live') return 0; let score = 12 + closeScoreBonus(game) + lateGameBonus(game); if (isOvertime(game)) score += 30; if (game?.isElimination === true) score += 14; if (game?.eventType === 'championship' || game?.eventType === 'final') score += 12; return Math.min(score, 100); }
function finalDrama(game) { if (game?.status !== 'final') return 0; const sport = game?.leagueId; const diff = difference(game); const total = totalPoints(game); let score = 4 + closeScoreBonus(game); if (isOvertime(game)) score += 30; if (game?.isElimination === true) score += 14; if (game?.eventType === 'championship' || game?.eventType === 'final') score += 12; if (SOCCER.has(sport)) { if (total !== undefined && total >= 5) score += 20; else if (total !== undefined && total >= 4) score += 12; } else if (FIELD_SPORTS.has(sport)) { if (total !== undefined && total >= 60) score += 18; else if (total !== undefined && total >= 45) score += 10; } else if (sport === 'mlb') { if (total !== undefined && total >= 10) score += 14; if (diff !== undefined && diff <= 2) score += 8; } return Math.min(score, 100); }
function importance(game) { const priority = getPriorityScore(game); const favorite = isFavorite(game); let score = Math.min(priority * 0.45, 38); if (favorite) score += 22; if (game?.isMajorEvent === true) score += 10; if (game?.isElimination === true) score += 10; if (game?.hasPlayoffImplications === true || game?.hasSeedingImplications === true || game?.hasQualificationImplications === true) score += 8; return Math.min(score, 70); }
function baseInterest(game) { const sport = game?.leagueId; const major = game?.isMajorEvent === true || game?.eventType === 'championship' || game?.eventType === 'final'; const ranked = sport === 'ncaa-football' && Number.isFinite(game?.homeTeam?.ranking) && Number.isFinite(game?.awayTeam?.ranking); if (major) return 20; if (ranked) return 14; if (SOCCER.has(sport)) return 8; return 5; }
export function getGameScore(game, { peakScore } = {}) { if (!game) return 0; const personal = importance(game); const drama = game.status === 'final' ? finalDrama(game) : liveDrama(game); const base = baseInterest(game); const current = Math.round(Math.min(140, personal + drama + base)); if (game.status === 'final' && Number.isFinite(Number(peakScore))) return Math.max(current, Number(peakScore)); return current; }
export function getGameScoreLevel(score) { const value = Number(score) || 0; if (value >= 110) return 'EPIC'; if (value >= 90) return 'HOT'; if (value >= 70) return 'GOOD'; if (value >= 45) return 'INTERESTING'; return 'LOW'; }
export function getGameScoreReasons(game) { const reasons = []; if (isFavorite(game)) reasons.push('Favorite team'); if (game?.status === 'live') { const diff = difference(game); if (isOvertime(game)) reasons.push('Overtime'); if (diff === 0) reasons.push('Tied game'); else if (diff === 1) reasons.push(SOCCER.has(game?.leagueId) ? 'One-goal game' : 'One-score game'); const clock = number(game?.clockSeconds); if (SOCCER.has(game?.leagueId) && clock !== undefined && clock >= 80 * 60) reasons.push('Late in the match'); else if (!SOCCER.has(game?.leagueId) && clock !== undefined && clock <= 120) reasons.push('Final minutes'); } if (game?.status === 'final') { if (difference(game) === 0) reasons.push('Tied at the end'); else if (difference(game) === 1) reasons.push(SOCCER.has(game?.leagueId) ? 'One-goal finish' : 'One-score finish'); if (isOvertime(game)) reasons.push('Overtime finish'); } if (game?.isElimination === true) reasons.push('Elimination'); if (game?.hasPlayoffImplications || game?.hasSeedingImplications || game?.hasQualificationImplications) reasons.push('Meaningful implications'); if (game?.isMajorEvent === true) reasons.push('Major event'); return [...new Set(reasons)].slice(0, 2); }
export function getGameScoreSnapshot(game, peakScore) { const score = getGameScore(game, { peakScore }); return { score, level: getGameScoreLevel(score), reasons: getGameScoreReasons(game) }; }
export function getGameScoreComponents(game) { return { personalRelevance: Math.round(importance(game)), liveDrama: Math.round(liveDrama(game)), finalDrama: Math.round(finalDrama(game)), baseInterest: Math.round(baseInterest(game)), }; }
