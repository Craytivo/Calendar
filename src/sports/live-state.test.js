import assert from 'node:assert/strict';
import { getGameStateRefreshDelay, isGameBreak, mergeGameUpdate } from './live-state.js';

const now = Date.parse('2026-09-07T18:00:00Z');
const base = { id: 'game-1', leagueId: 'nba', startTime: '2026-09-07T18:00:00Z', status: 'scheduled', homeTeam: { name: 'A' }, awayTeam: { name: 'B' } };

assert.equal(mergeGameUpdate({ ...base, status: 'final', homeScore: 2, awayScore: 1 }, { ...base, status: 'live', homeScore: 3, awayScore: 1 }), base.status === 'scheduled' ? 'scheduled' : 'final');
const finalGame = mergeGameUpdate({ ...base, status: 'final', homeScore: 2, awayScore: 1, fetchedAt: '2026-09-07T18:05:00Z' }, { ...base, status: 'live', homeScore: 3, awayScore: 1, fetchedAt: '2026-09-07T18:06:00Z' });
assert.equal(finalGame.status, 'final');
assert.equal(finalGame.homeScore, 2);

const freshLive = mergeGameUpdate({ ...base, status: 'live', homeScore: 3, awayScore: 2, fetchedAt: '2026-09-07T18:06:00Z' }, { ...base, status: 'live', homeScore: 2, awayScore: 2, fetchedAt: '2026-09-07T18:05:00Z' });
assert.equal(freshLive.homeScore, 3);

const laterFinal = mergeGameUpdate({ ...base, status: 'live', homeScore: 3, awayScore: 2, fetchedAt: '2026-09-07T18:06:00Z' }, { ...base, status: 'final', homeScore: 3, awayScore: 2, fetchedAt: '2026-09-07T18:07:00Z' });
assert.equal(laterFinal.status, 'final');

const halftime = { ...base, status: 'live', period: 2, clockSeconds: 0, statusDetail: 'Halftime' };
assert.equal(isGameBreak(halftime), true);
assert.equal(getGameStateRefreshDelay([halftime], now), 60_000);

const soccer = { ...base, id: 'soccer', leagueId: 'ucl', status: 'live', period: 2, clockSeconds: 40 * 60 };
assert.equal(getGameStateRefreshDelay([soccer], now), 30_000);

const mlb = { ...base, id: 'mlb', leagueId: 'mlb', status: 'live', period: 8 };
assert.equal(getGameStateRefreshDelay([mlb], now), 20_000);

console.log('live-state tests passed');
