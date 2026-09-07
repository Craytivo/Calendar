import assert from 'node:assert/strict';
import { getExcitementScore, getWatchLevel, getWatchScore } from './watchability.js';

const base = { id: 'test', leagueId: 'nfl', startTime: '2026-09-07T20:00:00.000Z', status: 'scheduled', eventType: 'regular-season', homeTeamId: 'home', awayTeamId: 'away', homeTeam: { id: 'home', name: 'Home', winPercentage: 0.5 }, awayTeam: { id: 'away', name: 'Away', winPercentage: 0.5 } };

assert.equal(getWatchLevel(95).label, 'EPIC');
assert.equal(getWatchLevel(82).label, 'HOT');
assert.equal(getWatchLevel(64).label, 'GOOD');
assert.equal(getWatchLevel(42).label, 'INTERESTING');
assert.equal(getWatchLevel(20).label, 'LOW');

const liveClose = { ...base, status: 'live', homeScore: 20, awayScore: 19, period: 4, clockSeconds: 48 };
const liveBlowout = { ...base, status: 'live', homeScore: 35, awayScore: 3, period: 2, clockSeconds: 600 };
const finalClose = { ...base, status: 'final', homeScore: 24, awayScore: 23 };

assert.ok(getExcitementScore(liveClose) > getExcitementScore(liveBlowout));
assert.ok(getWatchScore(liveClose) > getWatchScore(liveBlowout));
assert.ok(getWatchScore(finalClose) > getWatchScore({ ...base, status: 'final', homeScore: 35, awayScore: 10 }));
assert.ok(getExcitementScore({ ...liveClose, isOvertime: true }) > getExcitementScore(liveClose));

console.log('watchability tests passed');
