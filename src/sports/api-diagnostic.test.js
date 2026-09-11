import assert from 'node:assert/strict';
import { buildDiagnosticSummary, buildGameDiagnostic, buildV2GameDiagnostic } from './api-diagnostic.js';

const ucl = {
  id: 'espn:ucl:test', leagueId: 'ucl', status: 'live', eventType: 'regular-season', startTime: '2026-09-08T18:00:00.000Z',
  period: 2, clock: '88:14', clockSeconds: 5294, clockMode: 'elapsed', homeScore: 3, awayScore: 3,
  homeTeam: { name: 'Club Brugge' }, awayTeam: { name: 'Aston Villa' },
};

const diagnostic = buildGameDiagnostic(ucl);
assert.equal(diagnostic.clockMode, 'elapsed');
assert.equal(diagnostic.clockSeconds, 5294);
assert.equal(diagnostic.score.home, 3);
assert.equal(diagnostic.score.away, 3);
assert.ok(diagnostic.gameScore >= 70, 'late tied UCL game should score strongly');
assert.ok(diagnostic.reasons.includes('Tied game'), 'diagnostic should expose score reason');
assert.equal(diagnostic.v2.id, ucl.id);
assert.equal(diagnostic.v2.v2.total, diagnostic.v2.breakdown
  ? Math.round(
    (diagnostic.v2.breakdown.competitive.score / diagnostic.v2.breakdown.competitive.max) * 30 +
    (diagnostic.v2.breakdown.teamQuality.score / diagnostic.v2.breakdown.teamQuality.max) * 20 +
    (diagnostic.v2.breakdown.stakes.score / diagnostic.v2.breakdown.stakes.max) * 20 +
    (diagnostic.v2.breakdown.narrative.score / diagnostic.v2.breakdown.narrative.max) * 15 +
    (diagnostic.v2.breakdown.form.score / diagnostic.v2.breakdown.form.max) * 10 +
    Math.min(5, (diagnostic.v2.breakdown.personal.score ?? 0) * (5 / 15)),
  ) : diagnostic.v2.v2.total);

const mlb = {
  id: 'lxf2uu', leagueId: 'mlb', status: 'scheduled', eventType: 'regular-season', startTime: '2026-09-11T23:07:00.000Z',
  homeTeamId: 'blue-jays', awayTeamId: 'orioles',
  homeTeam: {
    id: 'blue-jays', name: 'Toronto Blue Jays', winPercentage: 73 / 147, leagueRank: 4,
    runDifferential: 12, homeWinPercentage: 37 / 72, lastTenWinPercentage: 0.6,
  },
  awayTeam: {
    id: 'orioles', name: 'Baltimore Orioles', winPercentage: 71 / 147, leagueRank: 5,
    runDifferential: -40, awayWinPercentage: 35 / 72, lastTenWinPercentage: 0.3,
  },
};

const v2 = buildV2GameDiagnostic(mlb);
assert.equal(v2.id, 'lxf2uu');
assert.equal(v2.apiData.away.winPercentage, 48.3);
assert.equal(v2.apiData.home.winPercentage, 49.7);
assert.equal(v2.apiData.away.lastTenWinPercentage, 30);
assert.equal(v2.apiData.home.splitWinPercentage, 51.4);
assert.ok(Number.isFinite(v2.v2.total));
assert.ok(v2.v2.total >= 0 && v2.v2.total <= 100);
assert.ok(Number.isFinite(v2.confidence));

const summary = buildDiagnosticSummary([ucl]);
assert.equal(summary.ucl.count, 1);
assert.equal(summary.ucl.live, 1);
assert.equal(summary.ucl.clockModes.elapsed, 1);
assert.equal(summary.ucl.highestScore.id, ucl.id);

console.log('API diagnostic tests passed');
