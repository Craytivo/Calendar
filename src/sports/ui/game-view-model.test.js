import assert from 'node:assert/strict';
import { toGameViewModel } from './game-view-model.js';

const game = {
  id: 'mlb-test-1',
  leagueId: 'mlb',
  status: 'scheduled',
  eventType: 'regular-season',
  startTime: '2026-09-11T19:00:00-06:00',
  venue: 'Test Stadium',
  network: 'Test Network',
  homeTeam: {
    id: 'home',
    name: 'Home Team',
    abbreviation: 'HOM',
    winPercentage: 0.55,
    leagueRank: 8,
    runDifferential: 20,
    homeWins: 45,
    homeLosses: 35,
    lastTenWins: 6,
    lastTenLosses: 4,
  },
  awayTeam: {
    id: 'away',
    name: 'Away Team',
    abbreviation: 'AWY',
    winPercentage: 0.52,
    leagueRank: 10,
    runDifferential: 10,
    awayWins: 42,
    awayLosses: 38,
    lastTenWins: 5,
    lastTenLosses: 5,
  },
};

const view = toGameViewModel(game);

assert.equal(view.identity.gameId, game.id);
assert.equal(view.schedule.startTime, game.startTime);
assert.equal(view.league.id, 'mlb');
assert.equal(view.teams.away.name, 'Away Team');
assert.equal(view.teams.home.name, 'Home Team');
assert.equal(typeof view.v2.total, 'number');
assert.equal(typeof view.v2.tier.id, 'string');
assert.equal(typeof view.v2.tier.label, 'string');
assert.equal(typeof view.v2.confidence, 'number');
for (const component of ['competitive', 'teamQuality', 'stakes', 'narrative', 'form', 'personal']) {
  assert.equal(typeof view.v2.components[component].score, 'number', `${component} score missing`);
  assert.equal(typeof view.v2.components[component].max, 'number', `${component} max missing`);
  assert.equal(typeof view.v2.components[component].contribution, 'number', `${component} contribution missing`);
  assert.ok(Array.isArray(view.v2.components[component].reasons), `${component} reasons missing`);
}
assert.equal(view.details.venue, 'Test Stadium');
assert.equal(view.details.network, 'Test Network');
assert.equal(view.status.state, 'scheduled');
assert.equal(view.live.available, false);
assert.equal(typeof view.explanation.dominantComponent, 'string');

console.log('GameScore V2 UI data contract tests passed');
