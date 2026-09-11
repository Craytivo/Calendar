import assert from 'node:assert/strict';
import { getSoccerRawScore, getSoccerScoreComponents, getSoccerScoreReasons } from './score.js';

const base = (overrides = {}) => ({
  leagueId: 'ucl',
  status: 'live',
  homeTeamId: 'home',
  awayTeamId: 'away',
  homeTeam: { name: 'Home' },
  awayTeam: { name: 'Away' },
  clockMode: 'elapsed',
  clockSeconds: 45 * 60,
  period: 2,
  homeScore: 0,
  awayScore: 0,
  ...overrides,
});

const earlyBlowout = base({ clockSeconds: 30 * 60, homeScore: 3, awayScore: 0 });
const lateOneGoal = base({ clockSeconds: 82 * 60, homeScore: 2, awayScore: 1 });
const lateDraw = base({ clockSeconds: 88 * 60, homeScore: 1, awayScore: 1 });
const lateDrawWithFavorite = base({ clockSeconds: 88 * 60, homeScore: 1, awayScore: 1, homeTeamId: 'real-madrid' });
const knockout = base({ clockSeconds: 78 * 60, homeScore: 1, awayScore: 0, isElimination: true, competitionPhase: 'knockout' });
const scheduled = base({ status: 'scheduled', clockSeconds: undefined, period: undefined, homeScore: undefined, awayScore: undefined, odds: { moneyline: { home: 150, draw: 250, away: 150 }, total: 3.5 } });
const finalClassic = base({ status: 'final', clockSeconds: 90 * 60, homeScore: 3, awayScore: 2 });
const finalDull = base({ status: 'final', clockSeconds: 90 * 60, homeScore: 0, awayScore: 0 });
const highActivity = base({ clockSeconds: 72 * 60, homeScore: 0, awayScore: 0, soccerStats: { home: { shots: 15, shotsOnTarget: 7, corners: 6, yellowCards: 2 }, away: { shots: 12, shotsOnTarget: 5, corners: 5, yellowCards: 2 } } });
const lowActivity = base({ clockSeconds: 72 * 60, homeScore: 0, awayScore: 0, soccerStats: { home: { shots: 3, shotsOnTarget: 1, corners: 1 }, away: { shots: 2, shotsOnTarget: 0, corners: 1 } } });

assert.ok(getSoccerRawScore(lateDraw) > getSoccerRawScore(earlyBlowout), 'late tied matches should outrank early blowouts');
assert.ok(getSoccerRawScore(lateDraw) > getSoccerRawScore(lateOneGoal), 'a late tie should outrank a late one-goal game');
assert.ok(getSoccerRawScore(knockout) > getSoccerRawScore(lateOneGoal) - 8, 'elimination context should materially contribute without overwhelming match state');
assert.ok(getSoccerRawScore(lateDrawWithFavorite) >= getSoccerRawScore(lateDraw), 'favorite relevance should not reduce an objective live score');
assert.ok(getSoccerRawScore(scheduled) > 0 && getSoccerRawScore(scheduled) < 60, 'scheduled score should establish a bounded pregame baseline');
assert.ok(getSoccerRawScore(finalClassic) > getSoccerRawScore(finalDull), 'high-quality close final should beat a 0-0 final');
assert.ok(getSoccerRawScore(highActivity) > getSoccerRawScore(lowActivity), 'high live shot activity should increase the soccer score');

const components = getSoccerScoreComponents(lateDraw);
assert.equal(components.scoreMargin, 0);
assert.ok(components.resultTension > 20);
assert.ok(components.latePressure >= 18);
assert.equal(components.dataConfidence.score, true);
assert.equal(components.dataConfidence.clock, true);
assert.equal(components.dataConfidence.matchStats, false);

const activityComponents = getSoccerScoreComponents(highActivity);
assert.ok(activityComponents.chancePressure >= 6);
assert.ok(activityComponents.matchIntensity > 0);
assert.equal(activityComponents.dataConfidence.matchStats, true);

const reasons = getSoccerScoreReasons(lateDraw);
assert.ok(reasons.includes('Tied game'));
assert.ok(reasons.includes('Late pressure'));

const activityReasons = getSoccerScoreReasons(highActivity);
assert.ok(activityReasons.includes('High chance volume'));

console.log('soccer scoring tests passed');
