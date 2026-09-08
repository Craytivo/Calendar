import assert from 'node:assert/strict';
import { getLiveGameReasons, getLiveGameSignal, getLiveSignalRank } from './game-intelligence.js';

const base = {
  id: 'game-1', leagueId: 'nfl', status: 'live', startTime: '2026-09-08T18:00:00Z',
  homeScore: 24, awayScore: 21, clockSeconds: 60, period: 4,
  homeTeam: { name: 'Home' }, awayTeam: { name: 'Away' },
};

assert.equal(getLiveGameSignal(base).level, 'critical');
assert.ok(getLiveGameReasons(base).includes('Late in the game'));
assert.ok(getLiveGameReasons(base).includes('One-score game'));
assert.equal(getLiveSignalRank(base), 0);
assert.equal(getLiveGameSignal({ ...base, status: 'scheduled' }).level, 'scheduled');
assert.equal(getLiveGameSignal({ ...base, clockSeconds: 900, period: 2, homeScore: 30, awayScore: 7 }).level, 'live');
assert.equal(getLiveGameSignal({ ...base, clockSeconds: 900, period: 2, homeScore: 30, awayScore: 29 }).level, 'heating');
assert.ok(!getLiveGameReasons({ ...base, status: 'scheduled' }).length);

console.log('game-intelligence.test.js passed');
