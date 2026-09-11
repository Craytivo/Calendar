import { scoreGameV2 } from '../src/sports/scoring/index-v2.js';

const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const complete = {
  leagueId: 'nba',
  homeTeam: { winPercentage: 0.8, conferenceRank: 2, recentWinPercentage: 0.8 },
  awayTeam: { winPercentage: 0.8, conferenceRank: 3, recentWinPercentage: 0.8 },
};

const incomplete = {
  leagueId: 'nba',
  homeTeam: { winPercentage: 0.8, recentWinPercentage: 0.8 },
  awayTeam: { winPercentage: 0.8, recentWinPercentage: 0.8 },
};

const normalComplete = scoreGameV2({ id: 'v9-normal-complete', ...complete });
const normalIncomplete = scoreGameV2({ id: 'v9-normal-incomplete', ...incomplete });

assert(normalComplete.rawTotal === normalIncomplete.rawTotal,
  'Completeness must not alter the underlying raw score');
assert(normalComplete.confidence >= 0.85,
  'Complete normal matchup should have high confidence');
assert(normalIncomplete.confidence < normalComplete.confidence,
  'Incomplete normal matchup should have lower confidence');
assert(normalComplete.total === normalComplete.rawTotal,
  'High-confidence normal matchup should retain raw production score');
assert(normalIncomplete.total < normalIncomplete.rawTotal,
  'Low-confidence normal matchup should receive a production ranking penalty');
assert(normalIncomplete.total === normalIncomplete.confidenceAdjustedTotal,
  'Normal matchup without a floor should use confidence-adjusted score');

const championshipComplete = scoreGameV2({
  id: 'v9-championship-complete',
  eventType: 'championship',
  ...complete,
});
const championshipIncomplete = scoreGameV2({
  id: 'v9-championship-incomplete',
  eventType: 'championship',
  ...incomplete,
});

assert(championshipComplete.priorityFloor.minScore === 80,
  'Championship must expose an 80-point priority floor');
assert(championshipComplete.total >= 80,
  'Complete championship must remain at or above 80');
assert(championshipIncomplete.confidence < championshipComplete.confidence,
  'Incomplete championship should have lower confidence');
assert(championshipIncomplete.confidenceAdjustedTotal < championshipIncomplete.rawTotal,
  'Incomplete championship should still receive confidence adjustment before the floor');
assert(championshipIncomplete.total === 80,
  'Championship priority floor must protect final production score at 80');
assert(championshipIncomplete.total >= championshipIncomplete.confidenceAdjustedTotal,
  'Priority floor must never be below the confidence-adjusted score');

const eliminationComplete = scoreGameV2({
  id: 'v9-elimination-complete',
  eventType: 'elimination',
  isElimination: true,
  ...complete,
});
const eliminationIncomplete = scoreGameV2({
  id: 'v9-elimination-incomplete',
  eventType: 'elimination',
  isElimination: true,
  ...incomplete,
});

assert(eliminationComplete.priorityFloor.minScore === 55,
  'Elimination game must expose a 55-point priority floor');
assert(eliminationComplete.total >= 55,
  'Complete elimination game must remain at or above 55');
assert(eliminationIncomplete.confidence < eliminationComplete.confidence,
  'Incomplete elimination game should have lower confidence');
assert(eliminationIncomplete.total >= 55,
  'Elimination priority floor must protect production score at 55');

const results = [
  ['normal-complete', normalComplete],
  ['normal-incomplete', normalIncomplete],
  ['championship-complete', championshipComplete],
  ['championship-incomplete', championshipIncomplete],
  ['elimination-complete', eliminationComplete],
  ['elimination-incomplete', eliminationIncomplete],
].map(([id, result]) => ({
  id,
  raw: result.rawTotal,
  confidenceAdjusted: result.confidenceAdjustedTotal,
  final: result.total,
  confidence: result.confidence,
  floor: result.priorityFloor.minScore,
  tier: result.tier,
}));

console.log('\nSCORING MODEL V9 — PRODUCTION CONFIDENCE INTEGRATION TEST\n');
console.table(results);
console.log(`\nChecks: ${results.length} production scenarios, ${failures.length} failures`);

if (failures.length) {
  console.error('\nFAILED V9 PRODUCTION CONFIDENCE REGRESSIONS');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('ALL V9 PRODUCTION CONFIDENCE CHECKS PASSED');
