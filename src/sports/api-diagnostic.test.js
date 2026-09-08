import assert from 'node:assert/strict';
import { buildDiagnosticSummary, buildGameDiagnostic } from './api-diagnostic.js';

const ucl = {
  id: 'espn:ucl:test', leagueId: 'ucl', status: 'live', eventType: 'regular-season', startTime: '2026-09-08T18:00:00.000Z',
  period: 2, clock: '88:14', clockSeconds: 5294, clockMode: 'elapsed', homeScore: 3, awayScore: 3,
  homeTeamId: 'club-brugge', awayTeamId: 'aston-villa', homeTeam: { name: 'Club Brugge' }, awayTeam: { name: 'Aston Villa' },
};

const diagnostic = buildGameDiagnostic(ucl);
assert.equal(diagnostic.clockMode, 'elapsed');
assert.equal(diagnostic.clockSeconds, 5294);
assert.equal(diagnostic.score.home, 3);
assert.equal(diagnostic.score.away, 3);
assert.ok(diagnostic.gameScore >= 70, 'late tied UCL game should score strongly');
assert.ok(diagnostic.reasons.includes('Tied game'), 'diagnostic should expose score reason');

const summary = buildDiagnosticSummary([ucl]);
assert.equal(summary.ucl.count, 1);
assert.equal(summary.ucl.live, 1);
assert.equal(summary.ucl.clockModes.elapsed, 1);
assert.equal(summary.ucl.highestScore.id, ucl.id);

console.log('API diagnostic tests passed');
