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

function scoreV4(game) {
  const result = scoreGameV2(game);
  const adjustedScore = getConfidenceAdjustedScore(result.total, result.confidence);
  const floor = getPriorityFloor(result.breakdown);
  const finalScore = Math.max(adjustedScore, floor.minScore);

  return {
    id: game.id,
    rawScore: result.total,
    adjustedScore,
    finalScore,
    tier: getTierFromScore(finalScore),
    confidence: result.confidence,
    floor: floor.reason,
    breakdown: result.breakdown,
  };
}

const results = scoringFixtures.map(scoreV4);
const byId = new Map(results.map((result) => [result.id, result]));

const failures = [];

function requireCase(condition, message) {
  if (!condition) failures.push(message);
}

function get(id) {
  const result = byId.get(id);
  requireCase(Boolean(result), `Missing fixture: ${id}`);
  return result;
}

// Dataset integrity.
requireCase(results.length === 20, `Expected 20 scoring fixtures, found ${results.length}`);
requireCase(new Set(results.map((result) => result.id)).size === results.length, 'Fixture IDs must be unique');

// Tier boundary regression tests.
for (const result of results) {
  requireCase(result.finalScore >= 0 && result.finalScore <= 100, `${result.id}: score outside 0-100`);
  requireCase(
    result.tier === getTierFromScore(result.finalScore),
    `${result.id}: tier does not match final score`,
  );
}

// Critical contextual floors.
requireCase(get('championship').finalScore >= 80, 'Championship must be at least 80');
requireCase(get('championship').tier === 'Major Event', 'Championship must be Major Event');
requireCase(get('elimination-game').finalScore >= 55, 'Elimination game must be at least 55');
requireCase(get('elimination-game').tier === 'Major Game', 'Elimination game must be Major Game');
requireCase(get('favorite-ordinary').finalScore >= 40, 'Favorite team must be at least 40');
requireCase(get('favorite-ordinary').tier === 'Worth Watching', 'Favorite team must be Worth Watching');
requireCase(get('favorite-rivalry').finalScore >= 50, 'Favorite rivalry must be at least 50');
requireCase(get('favorite-rivalry').tier === 'Worth Watching', 'Favorite rivalry must be Worth Watching');
requireCase(get('must-see-ordinary').finalScore >= 50, 'Must-see team must be at least 50');
requireCase(get('must-see-ordinary').tier === 'Worth Watching', 'Must-see team must be Worth Watching');

// Relative-ranking regressions.
requireCase(
  get('elite-even-matchup').finalScore > get('bad-even-matchup').finalScore,
  'Elite even matchup must outrank bad even matchup',
);
requireCase(
  get('elite-even-matchup').finalScore > get('elite-mismatch').finalScore,
  'Elite even matchup must outrank elite mismatch',
);
requireCase(
  get('championship').finalScore > get('elimination-game').finalScore,
  'Championship must outrank elimination game',
);
requireCase(
  get('elimination-game').finalScore > get('elite-even-matchup').finalScore,
  'Elimination game must outrank ordinary elite matchup',
);
requireCase(
  get('epl-title-race').finalScore > get('rivalry').finalScore,
  'Title-race game must outrank ordinary rivalry',
);
requireCase(
  get('ucl-knockout').finalScore > get('rivalry').finalScore,
  'UCL knockout must outrank ordinary rivalry',
);

// Personal-interest regressions.
requireCase(
  get('favorite-rivalry').finalScore >= get('favorite-ordinary').finalScore,
  'Favorite rivalry must not score below favorite ordinary game',
);
requireCase(
  get('must-see-ordinary').finalScore >= get('favorite-ordinary').finalScore,
  'Must-see team must not score below ordinary favorite team',
);

// Low-quality matchup guardrails.
requireCase(get('bad-even-matchup').tier !== 'Worth Watching', 'Bad even matchup must not be Worth Watching');
requireCase(get('bad-even-matchup').tier !== 'Major Game', 'Bad even matchup must not be Major Game');
requireCase(get('bad-even-matchup').tier !== 'Major Event', 'Bad even matchup must not be Major Event');
requireCase(get('missing-data').finalScore < get('elite-even-matchup').finalScore, 'Missing-data game must remain below high-confidence elite matchup');
requireCase(get('missing-data').confidence < 0.85, 'Missing-data fixture should retain low confidence');

// Confidence adjustment must only reduce uncertain scores in this fixture set.
for (const result of results) {
  if (result.confidence < 0.85) {
    requireCase(
      result.adjustedScore <= result.rawScore,
      `${result.id}: low-confidence score was not reduced`,
    );
  }
}

console.log('\nSCORING MODEL V4 — REGRESSION TEST\n');
console.table(
  results.map(({ id, rawScore, adjustedScore, finalScore, tier, confidence, floor }) => ({
    id,
    rawScore,
    adjustedScore,
    finalScore,
    tier,
    confidence,
    floor: floor ?? 'None',
  })),
);

console.log(`\nChecks: ${results.length} fixtures, ${failures.length} failures\n`);

if (failures.length > 0) {
  console.error('FAILED REGRESSIONS');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('ALL V4 REGRESSION CHECKS PASSED');
}
