import { scoreGameV2 } from '../src/sports/scoring/index-v2.js';

const base = {
  homeTeam: { winPercentage: 0.8, conferenceRank: 2, recentWinPercentage: 0.8 },
  awayTeam: { winPercentage: 0.8, conferenceRank: 3, recentWinPercentage: 0.8 },
};

const fixtures = [
  {
    id: 'v7-high-confidence-strong',
    leagueId: 'nba',
    ...base,
  },
  {
    id: 'v7-low-confidence-strong',
    leagueId: 'nba',
    homeTeam: { winPercentage: 0.8, recentWinPercentage: 0.8 },
    awayTeam: { winPercentage: 0.8, recentWinPercentage: 0.8 },
  },
  {
    id: 'v7-high-confidence-average',
    leagueId: 'nba',
    homeTeam: { winPercentage: 0.6, conferenceRank: 7, recentWinPercentage: 0.6 },
    awayTeam: { winPercentage: 0.6, conferenceRank: 8, recentWinPercentage: 0.6 },
  },
  {
    id: 'v7-high-confidence-championship',
    leagueId: 'nba',
    eventType: 'championship',
    ...base,
  },
  {
    id: 'v7-low-confidence-championship',
    leagueId: 'nba',
    eventType: 'championship',
    homeTeam: { winPercentage: 0.8, recentWinPercentage: 0.8 },
    awayTeam: { winPercentage: 0.8, recentWinPercentage: 0.8 },
  },
  {
    id: 'v7-favorite-low-confidence',
    leagueId: 'nba',
    homeTeam: { id: 'lakers', winPercentage: 0.8, recentWinPercentage: 0.8 },
    awayTeam: { winPercentage: 0.8, recentWinPercentage: 0.8 },
  },
];

function adjustedScore(result) {
  if (result.confidence >= 0.85) return result.total;
  if (result.confidence >= 0.70) return Math.round(result.total * 0.95);
  if (result.confidence >= 0.50) return Math.round(result.total * 0.90);
  return Math.round(result.total * 0.80);
}

const results = fixtures.map((fixture) => {
  const scoring = scoreGameV2(fixture);
  return {
    id: fixture.id,
    rawScore: scoring.total,
    confidence: scoring.confidence,
    adjustedScore: adjustedScore(scoring),
    tier: scoring.tier,
  };
});

console.table(results);

const byId = Object.fromEntries(results.map((result) => [result.id, result]));
const failures = [];

const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

assert(byId['v7-high-confidence-strong'].rawScore === byId['v7-low-confidence-strong'].rawScore,
  'Missing non-critical context must not change raw score');
assert(byId['v7-low-confidence-strong'].adjustedScore < byId['v7-high-confidence-strong'].adjustedScore,
  'Lower confidence must reduce adjusted ranking score');
assert(byId['v7-high-confidence-strong'].adjustedScore > byId['v7-high-confidence-average'].adjustedScore,
  'Strong high-confidence matchup must outrank average matchup');
assert(byId['v7-high-confidence-championship'].adjustedScore === byId['v7-high-confidence-championship'].rawScore,
  'High-confidence championship must receive no confidence penalty');
assert(byId['v7-low-confidence-championship'].rawScore === byId['v7-high-confidence-championship'].rawScore,
  'Confidence changes must not alter championship raw score');
assert(byId['v7-low-confidence-championship'].adjustedScore < byId['v7-high-confidence-championship'].adjustedScore,
  'Low-confidence championship must be ranked below complete championship');
assert(byId['v7-low-confidence-strong'].adjustedScore <= byId['v7-low-confidence-strong'].rawScore,
  'Adjusted score must never exceed raw score');
assert(byId['v7-high-confidence-strong'].confidence >= 0.85,
  'Complete matchup should retain high confidence');
assert(byId['v7-low-confidence-strong'].confidence < byId['v7-high-confidence-strong'].confidence,
  'Incomplete matchup must have lower confidence');

console.log(`\nChecks: ${fixtures.length} fixtures, ${failures.length} failures`);

if (failures.length) {
  console.error('\nFAILED V7 CONFIDENCE-ADJUSTED RANKING REGRESSIONS');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log('ALL V7 CONFIDENCE-ADJUSTED RANKING CHECKS PASSED');
}
