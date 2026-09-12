import assert from 'node:assert/strict';
import { scoreCompetitiveV2 } from './competitive-v2.js';

const game = (homeTeam, awayTeam, extra = {}) => ({
  leagueId: 'ncaa-football',
  status: 'scheduled',
  homeTeam,
  awayTeam,
  ...extra,
});

const ranked = (ranking, winPercentage) => ({ ranking, winPercentage });

const eliteClose = scoreCompetitiveV2(game(
  ranked(3, 1),
  ranked(5, 1),
  { odds: { spread: 2.5 } },
));
assert(eliteClose.score >= 20, `expected elite close NCAA matchup >= 20, got ${eliteClose.score}`);
assert(eliteClose.reasons.includes('Ranked-vs-ranked'));

const rankedMismatch = scoreCompetitiveV2(game(
  ranked(4, 1),
  { winPercentage: 0.5 },
  { odds: { spread: 24 } },
));
assert(rankedMismatch.score < eliteClose.score, 'large NCAA mismatch should score below elite close matchup');

const closeUnranked = scoreCompetitiveV2(game(
  { winPercentage: 0.75 },
  { winPercentage: 0.72 },
  { odds: { spread: 1.5 } },
));
assert(closeUnranked.score > rankedMismatch.score, 'close projected NCAA game should beat a large mismatch');

const missingData = scoreCompetitiveV2(game({}, {}));
assert.equal(missingData.score, 6);
assert.equal(missingData.confidence, 0.2);

const nfl = scoreCompetitiveV2({
  leagueId: 'nfl',
  homeTeam: { winPercentage: 0.75 },
  awayTeam: { winPercentage: 0.25 },
});
assert.equal(nfl.score, 16, 'NCAA branch must not alter generic NFL scoring');

console.log('competitive-v2 NCAA tests passed');
