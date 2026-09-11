import * as oldModel from '../src/sports/priority.js';
import { scoreGameV2 } from '../src/sports/scoring/index-v2.js';
import { scoringFixtures } from '../src/sports/scoring/fixtures.js';

function getPriorityFloor(breakdown) {
  const reasons = [
    ...(breakdown.stakes?.reasons ?? []),
    ...(breakdown.narrative?.reasons ?? []),
    ...(breakdown.personal?.reasons ?? []),
  ];

  const hasReason = (text) => reasons.includes(text);

  if (hasReason('Championship / final')) {
    return { minScore: 80, reason: 'Championship / final floor' };
  }

  if (hasReason('Elimination game')) {
    return { minScore: 55, reason: 'Elimination game floor' };
  }

  if (hasReason('Favorite-team rivalry') && breakdown.personal?.score >= 10) {
    return { minScore: 50, reason: 'Favorite-team rivalry floor' };
  }

  if (hasReason('Must-see team') && breakdown.personal?.score >= 12) {
    return { minScore: 50, reason: 'Must-see team floor' };
  }

  if (hasReason('Favorite team') && breakdown.personal?.score >= 10) {
    return { minScore: 40, reason: 'Favorite team floor' };
  }

  return { minScore: 0, reason: null };
}

function getConfidenceAdjustedScore(rawScore, confidence) {
  if (confidence >= 0.85) return rawScore;
  if (confidence >= 0.70) return Math.round(rawScore * 0.95);
  if (confidence >= 0.50) return Math.round(rawScore * 0.90);
  return Math.round(rawScore * 0.80);
}

function getTierFromScore(score) {
  if (score >= 80) return 'Major Event';
  if (score >= 55) return 'Major Game';
  if (score >= 40) return 'Worth Watching';
  if (score >= 25) return 'Low Priority';
  return 'Optional';
}

const comparisons = scoringFixtures.map((game) => {
  const result = scoreGameV2(game);
  const rawScore = result.total;
  const adjustedScore = getConfidenceAdjustedScore(rawScore, result.confidence);
  const floor = getPriorityFloor(result.breakdown);
  const finalScore = Math.max(adjustedScore, floor.minScore);
  const finalTier = getTierFromScore(finalScore);
  const oldScore = oldModel.getPriorityScore(game);

  return {
    id: game.id,
    league: game.leagueId,
    old: oldScore,
    v2: rawScore,
    v3: finalScore,
    v2ToV3: finalScore - rawScore,
    oldToV3: finalScore - oldScore,
    v2Tier: result.tier,
    v3Tier: finalTier,
    confidence: result.confidence,
    floor: floor.reason ?? 'None',
    confidenceAdjustment: adjustedScore - rawScore,
    breakdown: result.breakdown,
  };
});

console.log('\nSCORING MODEL A/B COMPARISON — THIRD RUN\n');

console.table(
  comparisons.map(({ id, league, old, v2, v3, v2ToV3, oldToV3, v2Tier, v3Tier, confidence, floor }) => ({
    id,
    league,
    old,
    v2,
    v3,
    v2ToV3,
    oldToV3,
    v2Tier,
    v3Tier,
    confidence,
    floor,
  })),
);

console.log('\nBIGGEST V2 → V3 CHANGES\n');

console.table(
  [...comparisons]
    .sort((a, b) => Math.abs(b.v2ToV3) - Math.abs(a.v2ToV3))
    .slice(0, 10)
    .map(({ id, v2, v3, v2ToV3, v2Tier, v3Tier, floor, confidenceAdjustment }) => ({
      id,
      v2Score: v2,
      v3Score: v3,
      delta: v2ToV3,
      v2Tier,
      v3Tier,
      floor,
      confidenceAdjustment,
    })),
);

console.log('\nPRIORITY FLOOR CASES\n');

console.table(
  comparisons
    .filter((row) => row.floor !== 'None')
    .map(({ id, v2, v3, v2Tier, v3Tier, floor }) => ({
      id,
      v2Score: v2,
      v3Score: v3,
      v2Tier,
      v3Tier,
      floor,
    })),
);

console.log('\nCONFIDENCE-ADJUSTMENT CASES\n');

console.table(
  comparisons
    .filter((row) => row.confidenceAdjustment !== 0)
    .map(({ id, v2, v3, confidence, confidenceAdjustment }) => ({
      id,
      v2Score: v2,
      v3Score: v3,
      confidence,
      confidenceAdjustment,
    })),
);

console.log('\nTHIRD-RUN BREAKDOWNS\n');

for (const row of comparisons) {
  console.log(`\n${row.id}`);
  console.log({
    scoreV2: row.v2,
    scoreV3: row.v3,
    tierV2: row.v2Tier,
    tierV3: row.v3Tier,
    floor: row.floor,
    confidence: row.confidence,
    breakdown: row.breakdown,
  });
}
