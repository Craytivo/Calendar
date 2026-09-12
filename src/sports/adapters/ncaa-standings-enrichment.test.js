import assert from 'node:assert/strict';
import { enrichNcaaStandings } from './ncaa-standings-enrichment.js';

const games = [
  {
    id: 'espn:ncaa-football:1',
    leagueId: 'ncaa-football',
    homeTeam: { id: 'oregon-ducks', providerId: '2483', name: 'Oregon Ducks' },
    awayTeam: { id: '9999', providerId: '9999', name: 'Test State' },
  },
  {
    id: 'espn:nfl:2',
    leagueId: 'nfl',
    homeTeam: { id: 'vikings', providerId: '16', name: 'Minnesota Vikings' },
    awayTeam: { id: '17', providerId: '17', name: 'Test Team' },
  },
];

const standings = [
  {
    id: 'oregon-ducks',
    providerId: '2483',
    name: 'Oregon Ducks',
    wins: 2,
    losses: 0,
    winPercentage: 1,
    ranking: 4,
    leagueRank: 4,
  },
  {
    id: '9999',
    providerId: '9999',
    name: 'Test State',
    wins: 1,
    losses: 1,
    winPercentage: 0.5,
    ranking: 24,
    leagueRank: 24,
  },
];

const result = enrichNcaaStandings(games, standings);

assert.equal(result[0].homeTeam.ranking, 4);
assert.equal(result[0].homeTeam.winPercentage, 1);
assert.equal(result[0].awayTeam.ranking, 24);
assert.equal(result[0].awayTeam.winPercentage, 0.5);
assert.equal(result[0].homeTeam.standingsSource, 'ESPN standings');
assert.equal(result[1].homeTeam.ranking, undefined);

console.log('NCAA standings enrichment tests passed');
