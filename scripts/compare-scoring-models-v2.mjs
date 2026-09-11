import * as oldModel from '../src/sports/priority.js';
import { scoreGameV2 } from '../src/sports/scoring/index-v2.js';
import { scoringFixtures } from '../src/sports/scoring/fixtures.js';

const comparisons = scoringFixtures.map((game) => {
  const result = scoreGameV2(game);
  const oldScore = oldModel.getPriorityScore(game);
  return {
    id: game.id,
    league: game.leagueId,
    old: oldScore,
    new: result.total,
    delta: result.total - oldScore,
    oldTier: oldModel.getPriorityLabel(oldModel.getPriorityTier(game)),
    newTier: result.tier,
    confidence: result.confidence,
    breakdown: result.breakdown,
  };
});

const ranked = [...comparisons].sort((a, b) => b.delta - a.delta);
console.log('\nSCORING MODEL A/B COMPARISON — SECOND RUN\n');
console.table(comparisons.map(({ id, league, old, new: next, delta, oldTier, newTier, confidence }) => ({ id, league, old, new: next, delta, oldTier, newTier, confidence })));
console.log('\nBIGGEST NEW-MODEL UPGRADES\n');
console.table(ranked.slice(0, 5).map(({ id, old, new: next, delta }) => ({ id, oldScore: old, newScore: next, delta })));
console.log('\nBIGGEST NEW-MODEL DOWNGRADES\n');
console.table(ranked.slice(-5).reverse().map(({ id, old, new: next, delta }) => ({ id, oldScore: old, newScore: next, delta })));
console.log('\nSECOND-RUN BREAKDOWNS\n');
for (const row of comparisons) {
  console.log(row.id, row.breakdown);
}
