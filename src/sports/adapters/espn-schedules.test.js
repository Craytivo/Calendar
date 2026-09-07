import assert from 'node:assert/strict';
import { fetchEspnLeagueWindow } from './espn-schedules.js';

const originalFetch = globalThis.fetch;
const startDate = new Date('2026-09-07T00:00:00Z');
const eventPayload = {
  events: [{
    id: 'test-1',
    date: '2026-09-07T19:00:00Z',
    status: { type: { name: 'STATUS_SCHEDULED' } },
    competitions: [{
      competitors: [
        { id: '1', homeAway: 'home', team: { id: '1', displayName: 'Minnesota Vikings', abbreviation: 'MIN' } },
        { id: '2', homeAway: 'away', team: { id: '2', displayName: 'Test Opponent', abbreviation: 'TST' } },
      ],
    }],
  }],
};

try {
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(url);
    if (calls.length === 1) return { ok: false, status: 403 };
    return { ok: true, status: 200, json: async () => eventPayload };
  };
  const games = await fetchEspnLeagueWindow('nfl', startDate, 1);
  assert.equal(games.length, 1);
  assert.equal(games[0].homeTeamId, 'vikings');
  assert.equal(calls.length, 2);
  assert.ok(calls[1].includes('site.web.api.espn.com'));
  assert.ok(games[0].fetchedAt);

  let attempts = 0;
  globalThis.fetch = async () => {
    attempts += 1;
    if (attempts === 1) return { ok: false, status: 503 };
    return { ok: true, status: 200, json: async () => eventPayload };
  };
  const retried = await fetchEspnLeagueWindow('nfl', startDate, 1);
  assert.equal(retried.length, 1);
  assert.equal(attempts, 2);
} finally {
  globalThis.fetch = originalFetch;
}

console.log('ESPN reliability tests passed');
