import assert from 'node:assert/strict';
import {
  applyDomesticSoccerRaceContext,
  applyUclTieContext,
  isUclKnockoutStage,
  isUclLeaguePhaseStage,
  normalizeUclStage,
} from './soccer-context.js';

assert.equal(normalizeUclStage({ strRound: '1' }, '2026-09-08T18:00:00Z'), 'league-phase');
assert.equal(normalizeUclStage({ strRound: 'Round of 16' }, '2027-03-09T18:00:00Z'), 'round-of-16');
assert.equal(normalizeUclStage({ strRound: 'Quarter-final' }, '2027-04-06T18:00:00Z'), 'quarter-final');
assert.equal(normalizeUclStage({ strRound: 'Semi-final' }, '2027-04-27T18:00:00Z'), 'semi-final');
assert.equal(normalizeUclStage({ strRound: 'Final' }, '2027-06-05T18:00:00Z'), 'final');
assert.equal(isUclLeaguePhaseStage('league-phase'), true);
assert.equal(isUclKnockoutStage('round-of-16'), true);
assert.equal(isUclKnockoutStage('league-phase'), false);

const knockoutGames = applyUclTieContext([
  {
    id: 'r16-1',
    leagueId: 'ucl',
    uclStage: 'round-of-16',
    homeTeamId: 'team-a',
    awayTeamId: 'team-b',
    startTime: '2027-03-09T18:00:00Z',
  },
  {
    id: 'r16-2',
    leagueId: 'ucl',
    uclStage: 'round-of-16',
    homeTeamId: 'team-b',
    awayTeamId: 'team-a',
    startTime: '2027-03-16T18:00:00Z',
  },
]);
assert.equal(knockoutGames[0].isTwoLegTie, true);
assert.equal(knockoutGames[0].leg, 1);
assert.equal(knockoutGames[0].isFirstLeg, true);
assert.equal(knockoutGames[1].leg, 2);
assert.equal(knockoutGames[1].isSecondLeg, true);
assert.equal(knockoutGames[0].tieId, knockoutGames[1].tieId);

const eplRace = applyDomesticSoccerRaceContext([
  {
    id: 'epl-race',
    leagueId: 'epl',
    homeTeam: { leagueRank: 4, gamesPlayed: 24 },
    awayTeam: { leagueRank: 6, gamesPlayed: 24 },
  },
]);
assert.equal(eplRace[0].hasTitleOrUclQualificationImplications, true);

const earlyEpl = applyDomesticSoccerRaceContext([
  {
    id: 'epl-early',
    leagueId: 'epl',
    homeTeam: { leagueRank: 1, gamesPlayed: 4 },
    awayTeam: { leagueRank: 5, gamesPlayed: 4 },
  },
]);
assert.equal(earlyEpl[0].hasTitleOrUclQualificationImplications, undefined);

const laligaRace = applyDomesticSoccerRaceContext([
  {
    id: 'laliga-race',
    leagueId: 'laliga',
    homeTeam: { leagueRank: 2, gamesPlayed: 22 },
    awayTeam: { leagueRank: 5, gamesPlayed: 22 },
  },
]);
assert.equal(laligaRace[0].hasTitleOrUclQualificationImplications, true);

console.log('soccer-context tests passed');
