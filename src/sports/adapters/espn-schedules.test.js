import assert from 'node:assert/strict';
import { fetchEspnLeagueWindow } from './espn-schedules.js';
import { getGameScore, getRawGameScore } from '../game-score.js';

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

  const rams49ersPayload = {
    events: [{
      id: 'rams-49ers-test',
      date: '2026-09-10T20:15:00Z',
      status: { type: { name: 'STATUS_SCHEDULED' } },
      competitions: [{
        divisionCompetition: true,
        conferenceCompetition: true,
        competitors: [
          {
            id: '14',
            homeAway: 'home',
            team: { id: '14', displayName: 'San Francisco 49ers', abbreviation: 'SF' },
            records: [{ type: 'total', summary: '1-0' }],
          },
          {
            id: '14-rams',
            homeAway: 'away',
            team: { id: '14-rams', displayName: 'Los Angeles Rams', abbreviation: 'LAR' },
            records: [{ type: 'total', summary: '0-1' }],
          },
        ],
      }],
    }],
  };

  globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => rams49ersPayload });
  const [rams49ers] = await fetchEspnLeagueWindow('nfl', new Date('2026-09-10T00:00:00Z'), 1);
  const scoredFixture = { ...rams49ers, odds: { spread: 3.5, total: 48.5 } };
  const rawScore = getRawGameScore(scoredFixture);
  const calibratedScore = getGameScore(scoredFixture);

  assert.equal(rams49ers.isDivisional, true, 'NFL divisionCompetition must survive normalization');
  assert.equal(rams49ers.homeTeam.winPercentage, 1, 'NFL home record should produce win percentage');
  assert.equal(rams49ers.awayTeam.winPercentage, 0, 'NFL away record should produce win percentage');
  assert.equal(rams49ers.homeTeam.wins, 1);
  assert.equal(rams49ers.awayTeam.losses, 1);
  assert.ok(rawScore >= 20, `Rams-49ers raw score should reflect divisional + market context, got ${rawScore}`);
  assert.ok(calibratedScore >= 25, `Rams-49ers calibrated score should not collapse to ~5, got ${calibratedScore}`);

  console.log(JSON.stringify({
    diagnostic: 'Rams vs 49ers adapter + scoring regression',
    isDivisional: rams49ers.isDivisional,
    home: { name: rams49ers.homeTeam.name, wins: rams49ers.homeTeam.wins, losses: rams49ers.homeTeam.losses, winPercentage: rams49ers.homeTeam.winPercentage },
    away: { name: rams49ers.awayTeam.name, wins: rams49ers.awayTeam.wins, losses: rams49ers.awayTeam.losses, winPercentage: rams49ers.awayTeam.winPercentage },
    odds: scoredFixture.odds,
    rawScore,
    calibratedScore,
  }, null, 2));
} finally {
  globalThis.fetch = originalFetch;
}

console.log('ESPN schedule + NFL scoring regression tests passed');
