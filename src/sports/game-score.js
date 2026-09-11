import { favoriteTeamIds } from './team-identity.js';
import { getPriorityScore } from './priority.js';
import { getSportMarketContext, getSportMarketScore, getSportMarketReasons } from './market-context.js';
import { calibrateGameScore, getHistoricalCalibrationProfile } from './historical-calibration.js';
import { isSoccerGame, getSoccerRawScore, getSoccerScoreComponents, getSoccerScoreReasons } from './scoring/soccer/score.js';

const SOCCER = new Set(['soccer', 'epl', 'epl-cup', 'laliga', 'ucl']);
const FIELD_SPORTS = new Set(['nfl', 'nba', 'ncaa-football', 'nhl']);

function number(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : undefined; }
function scoreFor(game, side) { return number(side === 'away' ? game?.awayScore ?? game?.awayTeam?.score : game?.homeScore ?? game?.homeTeam?.score); }
function difference(game) { const a = scoreFor(game, 'away'); const h = scoreFor(game, 'home'); return a === undefined || h === undefined ? undefined : Math.abs(a - h); }
function signedDifference(game) { const a = scoreFor(game, 'away'); const h = scoreFor(game, 'home'); return a === undefined || h === undefined ? undefined : h - a; }
function totalPoints(game) { const a = scoreFor(game, 'away'); const h = scoreFor(game, 'home'); return a === undefined || h === undefined ? undefined : a + h; }
function isFavorite(game) { return favoriteTeamIds.has(game?.homeTeamId) || favoriteTeamIds.has(game?.awayTeamId); }
function isOvertime(game) { return game?.isOvertime === true || game?.overtime === true || /overtime|extra time|aet/.test(String(game?.statusDetail ?? game?.shortDetail ?? '').toLowerCase()); }
function isLate(game) { const clock = number(game?.clockSeconds); const period = number(game?.period); const mode = game?.clockMode; const sport = game?.leagueId; if (mode === 'elapsed' || SOCCER.has(sport)) return clock !== undefined && clock >= 75 * 60; if (mode === 'remaining' || FIELD_SPORTS.has(sport)) return (clock !== undefined && clock <= 300) || (period !== undefined && period >= 4); if (mode === 'inning' || sport === 'mlb') return period !== undefined && period >= 7; return false; }
function closeScoreBonus(game) { const diff = difference(game); if (diff === undefined) return 0; const late = isLate(game); if (game?.status === 'live' && !late) { if (diff === 0) return 10; if (diff === 1) return SOCCER.has(game?.leagueId) ? 9 : 8; if (diff === 2) return 6; if (diff <= 4) return 3; return 0; } if (diff === 0) return late ? 38 : 18; if (diff === 1) return late ? (SOCCER.has(game?.leagueId) ? 34 : 32) : (SOCCER.has(game?.leagueId) ? 16 : 14); if (diff === 2) return late ? 24 : 12; if (diff <= 4) return late ? 16 : 8; if (diff <= 7) return late ? 8 : 4; return 0; }
function lateGameBonus(game) { const clock = number(game?.clockSeconds); const period = number(game?.period); const mode = game?.clockMode; const sport = game?.leagueId; if (mode === 'elapsed' || SOCCER.has(sport)) { if (clock !== undefined && clock >= 85 * 60) return 30; if (clock !== undefined && clock >= 75 * 60) return 18; return 0; } if (mode === 'remaining' || FIELD_SPORTS.has(sport)) { if (clock !== undefined && clock <= 120) return 30; if (clock !== undefined && clock <= 300) return 18; if (period !== undefined && period >= 4) return 10; if (period !== undefined && period >= 3) return 4; return 0; } if (mode === 'inning' || sport === 'mlb') { if (period !== undefined && period >= 9) return 22; if (period !== undefined && period >= 7) return 14; } return 0; }
function liveDrama(game) { if (game?.status !== 'live') return 0; let score = 6 + closeScoreBonus(game) + lateGameBonus(game); if (isOvertime(game)) score += 24; if (game?.isElimination === true) score += 14; if (game?.eventType === 'championship' || game?.eventType === 'final') score += 12; return Math.min(score, 80); }
function finalDrama(game) { if (game?.status !== 'final') return 0; const sport = game?.leagueId; const diff = difference(game); const total = totalPoints(game); let score = 4 + closeScoreBonus(game); if (isOvertime(game)) score += 26; if (game?.isElimination === true) score += 14; if (game?.eventType === 'championship' || game?.eventType === 'final') score += 12; if (SOCCER.has(sport)) { if (total !== undefined && total >= 5) score += 18; else if (total !== undefined && total >= 4) score += 10; } else if (FIELD_SPORTS.has(sport)) { if (total !== undefined && total >= 60) score += 16; else if (total !== undefined && total >= 45) score += 8; } else if (sport === 'mlb') { if (total !== undefined && total >= 10) score += 12; if (diff !== undefined && diff <= 2) score += 6; } return Math.min(score, 80); }
function importance(game) { const priority = getPriorityScore(game); let score = Math.min(priority * 0.28, 24); if (isFavorite(game)) score += 25; if (game?.isMajorEvent === true) score += 10; if (game?.isElimination === true) score += 14; if (game?.hasPlayoffImplications === true || game?.hasSeedingImplications === true || game?.hasQualificationImplications === true) score += 10; return Math.min(score, 65); }
function baseInterest(game) { const sport = game?.leagueId; const major = game?.isMajorEvent === true || game?.eventType === 'championship' || game?.eventType === 'final'; const ranked = sport === 'ncaa-football' && Number.isFinite(game?.homeTeam?.ranking) && Number.isFinite(game?.awayTeam?.ranking); if (major) return 16; if (ranked) return 12; if (SOCCER.has(sport)) return 6; return 4; }
function liveProgress(game) { const sport = game?.leagueId; const period = number(game?.period); const clock = number(game?.clockSeconds); if (period === undefined) return undefined; if (SOCCER.has(sport)) return clock === undefined ? Math.min(0.95, period / 2) : Math.min(0.99, clock / (90 * 60)); if (sport === 'mlb') return Math.min(0.99, period / 9); return Math.min(0.99, period / 4); }
function scoringPaceBonus(game) { if (game?.status !== 'live') return 0; const market = getSportMarketContext(game); const expectedTotal = number(game?.odds?.total ?? game?.bettingOdds?.total ?? game?.market?.total); const total = totalPoints(game); const progress = liveProgress(game); if (!market.available || expectedTotal === undefined || total === undefined || progress === undefined || progress < 0.12) return 0; const projectedTotal = total / progress; if (projectedTotal >= expectedTotal * 1.25) return 10; if (projectedTotal >= expectedTotal * 1.12) return 6; return 0; }
function upsetBonus(game) { if (game?.status !== 'live') return 0; const spread = number(game?.odds?.spread ?? game?.bettingOdds?.spread ?? game?.market?.spread); const actualMargin = signedDifference(game); if (spread === undefined || actualMargin === undefined) return 0; const surprise = actualMargin + spread; if (surprise >= 14) return 12; if (surprise >= 8) return 8; if (surprise >= 4) return 4; return 0; }

export function getGameScoreSignals(game) {
  if (isSoccerGame(game)) return { ...getSoccerScoreComponents(game), favorite: isFavorite(game) ? 1 : 0 };
  const market = getSportMarketContext(game);
  return { favorite: isFavorite(game) ? 1 : 0, priority: getPriorityScore(game), closeScore: Math.max(closeScoreBonus(game), 0), lateGame: Math.max(lateGameBonus(game), 0), overtime: isOvertime(game) ? 1 : 0, elimination: game?.isElimination === true ? 1 : 0, implications: (game?.hasPlayoffImplications || game?.hasSeedingImplications || game?.hasQualificationImplications) ? 1 : 0, baseInterest: baseInterest(game), marketExcitement: market.available ? market.contribution : 0, scoringPace: scoringPaceBonus(game), upset: upsetBonus(game) };
}

export function getRawGameScore(game) {
  if (isSoccerGame(game)) return getSoccerRawScore(game);
  const personal = importance(game); const drama = game.status === 'final' ? finalDrama(game) : liveDrama(game); const base = baseInterest(game); const market = game?.status !== 'live' && game?.status !== 'final' ? getSportMarketScore(game) : 0;
  if (game?.status === 'live') return Math.min(100, Math.round(personal * 0.35 + drama + base + scoringPaceBonus(game) + upsetBonus(game)));
  return Math.min(100, Math.round(personal + drama + base + market));
}

export function getGameScore(game, { peakScore } = {}) { if (!game) return 0; const raw = getRawGameScore(game); const calibrated = calibrateGameScore(raw, game?.leagueId); if (game.status === 'final' && Number.isFinite(Number(peakScore))) return Math.min(100, Math.max(calibrated, Number(peakScore))); return calibrated; }
export function getGameScoreLevel(score) { const value = Number(score) || 0; if (value >= 90) return 'EPIC'; if (value >= 75) return 'HOT'; if (value >= 60) return 'GOOD'; if (value >= 40) return 'INTERESTING'; return 'LOW'; }

export function getGameScoreReasons(game) {
  if (isSoccerGame(game)) return getSoccerScoreReasons(game);
  const reasons = []; if (isFavorite(game)) reasons.push('Favorite team'); if (game?.status !== 'live' && game?.status !== 'final') reasons.push(...getSportMarketReasons(game)); if (game?.status === 'live') { const diff = difference(game); if (isOvertime(game)) reasons.push('Overtime'); if (diff === 0) reasons.push('Tied game'); else if (diff === 1) reasons.push('One-score game'); const clock = number(game?.clockSeconds); if (clock !== undefined && clock <= 120) reasons.push('Final minutes'); if (scoringPaceBonus(game) > 0) reasons.push('Scoring at a high pace'); if (upsetBonus(game) > 0) reasons.push('Upset developing'); } if (game?.status === 'final') { if (difference(game) === 0) reasons.push('Tied at the end'); else if (difference(game) === 1) reasons.push('One-score finish'); if (isOvertime(game)) reasons.push('Overtime finish'); } if (game?.isElimination === true) reasons.push('Elimination'); if (game?.hasPlayoffImplications || game?.hasSeedingImplications || game?.hasQualificationImplications) reasons.push('Meaningful implications'); if (game?.isMajorEvent === true) reasons.push('Major event'); return [...new Set(reasons)].slice(0, 2);
}

export function getGameScoreSnapshot(game, peakScore) { const score = getGameScore(game, { peakScore }); return { score, level: getGameScoreLevel(score), reasons: getGameScoreReasons(game) }; }

export function getGameScoreComponents(game) {
  if (isSoccerGame(game)) {
    const rawScore = getRawGameScore(game);
    const soccer = getSoccerScoreComponents(game);
    const market = getSportMarketContext(game);
    const soccerLiveDrama = game?.status === 'live'
      ? Math.min(80, soccer.resultTension + soccer.latePressure + soccer.outcomeSurprise)
      : 0;
    return {
      rawScore,
      calibratedScore: calibrateGameScore(rawScore, game?.leagueId),
      calibrationProfile: getHistoricalCalibrationProfile(game?.leagueId),
      ...soccer,
      liveDrama: Math.round(soccerLiveDrama),
      finalDrama: 0,
      baseInterest: Math.round(soccer.pregameInterest),
      marketCompetitiveness: market.available ? market.competitivenessScore : 0,
      marketScoringEnvironment: market.available ? market.scoringEnvironmentScore : 0,
    };
  }
  const market = getSportMarketContext(game); const rawScore = getRawGameScore(game); return { rawScore, calibratedScore: calibrateGameScore(rawScore, game?.leagueId), calibrationProfile: getHistoricalCalibrationProfile(game?.leagueId), personalRelevance: Math.round(importance(game)), liveDrama: Math.round(liveDrama(game)), finalDrama: Math.round(finalDrama(game)), baseInterest: Math.round(baseInterest(game)), marketExcitement: market.available ? Math.round(market.contribution) : 0, marketCompetitiveness: market.available ? market.competitivenessScore : 0, marketScoringEnvironment: market.available ? market.scoringEnvironmentScore : 0, scoringPace: Math.round(scoringPaceBonus(game)), upset: Math.round(upsetBonus(game)) };
}