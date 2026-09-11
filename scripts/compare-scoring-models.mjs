import * as oldModel from '../src/sports/priority.js';
import { compareGameModels } from '../src/sports/scoring/index.js';
import { scoringFixtures } from '../src/sports/scoring/fixtures.js';

const comparisons = scoringFixtures.map((game) => compareGameModels(game, oldModel));
const ranked = [...comparisons].sort((a, b) => b.delta - a.delta);

console.log('\nSCORING MODEL A/B COMPARISON\n');
console.table(
  comparisons.map(({ id, leagueId, oldScore, newScore, delta, oldTier, newTier, confidence }) => ({
    id,
    league: leagueId,
    old: oldScore,
    new: newScore,
    delta,
    oldTier,
    newTier,
    confidence,
  })),
);

console.log('\nBIGGEST NEW-MODEL UPGRADES\n');
console.table(ranked.slice(0, 5).map(({ id, oldScore, newScore, delta }) => ({ id, oldScore, newScore, delta })));

console.log('\nBIGGEST NEW-MODEL DOWNGRADES\n');
console.table(ranked.slice(-5).reverse().map(({ id, oldScore, newScore, delta }) => ({ id, oldScore, newScore, delta })));
