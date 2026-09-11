import { favoriteTeamIds } from '../../team-identity.js';
import { getPriorityScore } from '../../priority.js';
import { getSportMarketContext } from '../../market-context.js';

const SOCCER_LEAGUES = new Set(['soccer', 'epl', 'epl-cup', 'laliga', 'ucl']);

function finite(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function score(game, side) {
  return finite(side === 'home' ? game?.homeScore ?? game?.homeTeam?.score : game?.awayScore ?? game?.awayTeam?.score);
}

function margin(game) {
  const home = score(game, 'home');
  const away = score(game, 'away');
  return home === undefined || away === undefined ? undefined : Math.abs(home - away);
}

function signedMargin(game) {
  const home = score(game, 'home');
  const away = score(game, 'away');
  return home === undefined || away === undefined ? undefined : home - away;
}

function goals(game) {
  const home = score(game, 'home');
  const away = score(game, 'away');
  return home === undefined || away === undefined ? undefined : home + away;
}

function minute(game) {
  const seconds = finite(game?.clockSeconds);
  if (seconds !== undefined) return Math.max(0, Math.min(120, seconds / 60));
  return undefined;
}

function favorite(game) {
  return favoriteTeamIds.has(game?.homeTeamId) || favoriteTeamIds.has(game?.awayTeamId);
}

function market(game) {
  return getSportMarketContext(game);
}

function importance(game) {
  let value = 0;
  const priority = getPriorityScore(game);
  value += Math.min(5, priority / 20);
  if (favorite(game)) value += 2;
  if (game?.isMajorEvent) value += 3;
  if (game?.isElimination) value += 5;
  if (game?.hasTitleOrUclQualificationImplications) value += 4;
  if (game?.hasQualificationImplications) value += 3;
  if (game?.hasPlayoffImplications || game?.hasSeedingImplications) value += 2;
  if (game?.competitionPhase === 'knockout' || game?.eventType === 'knockout') value += 4;
  if (game?.uclStage && ['round-of-16', 'quarter-final', 'semi-final', 'final', 'knockout'].includes(game.uclStage)) value += 4;
  return Math.min(15, value);
}

function pregameInterest(game) {
  const context = market(game);
  let value = context.available ? context.contribution : 0;
  if (game?.isMajorEvent) value += 3;
  if (game?.isElimination) value += 3;
  if (game?.competitionPhase === 'knockout') value += 2;
  return Math.min(15, value);
}

function timePressure(min) {
  if (min === undefined) return 0.2;
  if (min >= 90) return 1;
  if (min >= 80) return 0.9;
  if (min >= 70) return 0.75;
  if (min >= 60) return 0.58;
  if (min >= 45) return 0.45;
  if (min >= 30) return 0.35;
  return 0.25;
}

function resultTension(game) {
  const diff = margin(game);
  const min = minute(game);
  if (diff === undefined) return 0;
  const pressure = timePressure(min);
  let base;
  if (diff === 0) base = 30;
  else if (diff === 1) base = 27;
  else if (diff === 2) base = 15;
  else if (diff === 3) base = 7;
  else return min !== undefined && min < 35 ? 3 : 0;
  return Math.min(35, base * (0.55 + pressure * 0.65));
}

function latePressure(game) {
  const min = minute(game);
  if (min === undefined) return 0;
  if (min < 60) return 0;
  if (min < 70) return 5;
  if (min < 80) return 10;
  if (min < 85) return 14;
  return 18;
}

function expectedOutcomeSurprise(game) {
  const odds = game?.odds ?? game?.bettingOdds ?? game?.market ?? {};
  const moneyline = odds.moneyline ?? {};
  const home = finite(moneyline.home ?? odds.homeMoneyline ?? odds.homeMoneyLine);
  const away = finite(moneyline.away ?? odds.awayMoneyline ?? odds.awayMoneyLine);
  const draw = finite(moneyline.draw ?? odds.drawMoneyline ?? odds.drawMoneyLine);
  if (home === undefined || away === undefined || draw === undefined) return 0;

  const americanProbability = (value) => value > 0 ? 100 / (value + 100) : -value / (-value + 100);
  const probabilities = [home, draw, away].map(americanProbability);
  const total = probabilities.reduce((sum, value) => sum + value, 0);
  if (!total) return 0;
  const normalized = probabilities.map((value) => value / total);
  const actual = signedMargin(game);
  if (actual === undefined) return 0;

  const homeExpected = normalized[0];
  const awayExpected = normalized[2];
  if (actual > 0 && awayExpected > homeExpected) return Math.min(12, 5 + (awayExpected - homeExpected) * 20);
  if (actual < 0 && homeExpected > awayExpected) return Math.min(12, 5 + (homeExpected - awayExpected) * 20);
  if (actual === 0 && Math.max(homeExpected, awayExpected) >= 0.6) return 5;
  return 0;
}

function liveScore(game) {
  const min = minute(game);
  const resultTensionScore = resultTension(game);
  const latePressureScore = latePressure(game);
  const surprise = expectedOutcomeSurprise(game);
  const importanceScore = importance(game);
  const pregame = pregameInterest(game);

  // Pregame reputation fades as observed match state accumulates.
  const elapsed = min === undefined ? 0 : Math.min(1, min / 90);
  const pregameWeight = 0.35 * (1 - elapsed) + 0.05;
  const observed = resultTensionScore + latePressureScore + surprise + importanceScore;
  return Math.min(100, Math.round(observed + pregame * pregameWeight));
}

function finalScore(game) {
  const diff = margin(game);
  const total = goals(game);
  if (diff === undefined || total === undefined) return Math.min(20, pregameInterest(game) + importance(game));

  let excitement;
  if (diff === 0) {
    excitement = total === 0 ? 8 : total === 2 ? 30 : total * 12;
  } else if (diff === 1) {
    excitement = 28 + Math.min(18, total * 3);
  } else if (diff === 2) {
    excitement = 14 + Math.min(12, total * 2);
  } else {
    excitement = Math.max(2, 8 - diff);
  }

  if (game?.isOvertime) excitement += 12;
  if (game?.isElimination) excitement += 8;
  if (game?.eventType === 'championship' || game?.eventType === 'final') excitement += 6;
  return Math.min(100, Math.round(excitement + Math.min(10, importance(game) * 0.6)));
}

function scheduledScore(game) {
  const competitive = market(game).available ? market(game).contribution : 0;
  return Math.min(60, Math.round(pregameInterest(game) + importance(game) + competitive));
}

export function isSoccerGame(game) {
  return SOCCER_LEAGUES.has(game?.leagueId);
}

export function getSoccerRawScore(game) {
  if (!isSoccerGame(game)) return 0;
  if (game?.status === 'live') return liveScore(game);
  if (game?.status === 'final') return finalScore(game);
  return scheduledScore(game);
}

export function getSoccerScoreComponents(game) {
  const min = minute(game);
  const context = market(game);
  return {
    resultTension: Math.round(resultTension(game)),
    latePressure: Math.round(latePressure(game)),
    outcomeSurprise: Math.round(expectedOutcomeSurprise(game)),
    importance: Math.round(importance(game)),
    pregameInterest: Math.round(pregameInterest(game)),
    marketExcitement: context.available ? Math.round(context.contribution) : 0,
    matchMinute: min,
    scoreMargin: margin(game),
    goals: goals(game),
    dataConfidence: {
      score: score(game, 'home') !== undefined && score(game, 'away') !== undefined,
      clock: min !== undefined,
      market: context.available,
    },
  };
}

export function getSoccerScoreReasons(game) {
  const reasons = [];
  const diff = margin(game);
  const min = minute(game);
  const components = getSoccerScoreComponents(game);

  if (game?.status === 'live') {
    if (diff === 0) reasons.push('Tied game');
    else if (diff === 1) reasons.push('One-goal game');
    if (components.outcomeSurprise >= 5) reasons.push('Upset developing');
    if (min !== undefined && min >= 80) reasons.push('Late pressure');
    else if (min !== undefined && min >= 70 && diff !== undefined && diff <= 1) reasons.push('Late-game tension');
    if (game?.isElimination) reasons.push('Elimination match');
    if (game?.hasTitleOrUclQualificationImplications) reasons.push('Title / qualification race');
  } else if (game?.status === 'final') {
    if (diff === 0 && components.goals > 0) reasons.push('Draw with goals');
    else if (diff === 1) reasons.push('One-goal finish');
    else if (components.goals >= 5) reasons.push('High-scoring match');
    if (game?.isOvertime) reasons.push('Extra time');
  } else {
    if (components.marketExcitement >= 8) reasons.push('Expected close matchup');
    if (game?.isElimination || game?.competitionPhase === 'knockout') reasons.push('Knockout match');
    if (game?.hasTitleOrUclQualificationImplications) reasons.push('Title / qualification race');
  }

  if (favorite(game)) reasons.push('Favorite team');
  return [...new Set(reasons)].slice(0, 2);
}
