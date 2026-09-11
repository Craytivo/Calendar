import { scoreGameV2 } from '../src/sports/scoring/index-v2.js';

function team(overrides = {}) {
  return {
    id: 'team',
    winPercentage: 0.5,
    gamesPlayed: 20,
    conferenceRank: 10,
    leagueRank: 10,
    ranking: null,
    recentWinPercentage: 0.5,
    ...overrides,
  };
}

function game(id, leagueId, home, away, overrides = {}) {
  return {
    id,
    leagueId,
    homeTeamId: home.id ?? 'home',
    awayTeamId: away.id ?? 'away',
    homeTeam: home,
    awayTeam: away,
    startTime: '2026-10-01T19:00:00-06:00',
    eventType: 'regular-season',
    ...overrides,
  };
}

const fixtures = [
  game('v6-complete-nba', 'nba', team({ id: 'a', winPercentage: 0.65 }), team({ id: 'b', winPercentage: 0.65 })),
  game('v6-missing-standings', 'nba', team({ id: 'a', winPercentage: 0.65, conferenceRank: undefined, leagueRank: undefined }), team({ id: 'b', winPercentage: 0.65, conferenceRank: undefined, leagueRank: undefined })),
  game('v6-missing-form', 'nba', team({ id: 'a', winPercentage: 0.65, recentWinPercentage: undefined }), team({ id: 'b', winPercentage: 0.65, recentWinPercentage: undefined })),
  game('v6-missing-team-quality', 'nba', team({ id: 'a', winPercentage: undefined, conferenceRank: undefined, leagueRank: undefined, ranking: undefined }), team({ id: 'b', winPercentage: undefined, conferenceRank: undefined, leagueRank: undefined, ranking: undefined })),
  game('v6-ncaa-rankings-missing', 'ncaa-football', team({ id: 'a', winPercentage: 0.8, ranking: undefined }), team({ id: 'b', winPercentage: 0.8, ranking: undefined })),
  game('v6-ncaa-ranked', 'ncaa-football', team({ id: 'a', winPercentage: 0.8, ranking: 5 }), team({ id: 'b', winPercentage: 0.8, ranking: 8 })),
  game('v6-ucl-incomplete-context', 'ucl', team({ id: 'a', winPercentage: 0.8, leagueRank: undefined }), team({ id: 'b', winPercentage: 0.75, leagueRank: undefined }), {
    competitionPhase: 'knockout',
  }),
  game('v6-ucl-complete-context', 'ucl', team({ id: 'a', winPercentage: 0.8, leagueRank: 3 }), team({ id: 'b', winPercentage: 0.75, leagueRank: 8 }), {
    competitionPhase: 'knockout',
  }),
  game('v6-championship', 'nfl', team({ id: 'a', winPercentage: 0.5 }), team({ id: 'b', winPercentage: 0.5 }), {
    eventType: 'championship',
  }),
];

const results = fixtures.map((fixture) => ({ id: fixture.id, result: scoreGameV2(fixture) }));
const byId = new Map(results.map((item) => [item.id, item.result]));
const failures = [];

function requireCase(condition, message) {
  if (!condition) failures.push(message);
}

function get(id) {
  const result = byId.get(id);
  requireCase(Boolean(result), `Missing fixture: ${id}`);
  return result;
}

requireCase(results.length === 9, `Expected 9 V6 fixtures, found ${results.length}`);
requireCase(new Set(results.map((item) => item.id)).size === results.length, 'V6 fixture IDs must be unique');

for (const { id, result } of results) {
  requireCase(result.total >= 0 && result.total <= 100, `${id}: raw score outside 0-100`);
  requireCase(Number.isFinite(result.confidence), `${id}: confidence must be finite`);
}

// V6 must preserve the V5 scoring weights/raw totals. Only confidence is allowed to change.
// These expected values are the actual V5 baselines for these fixtures.
requireCase(get('v6-complete-nba').total === 35, 'Complete NBA fixture raw score changed unexpectedly');
requireCase(get('v6-missing-standings').total === 35, 'Missing NBA standings must not change raw score');
requireCase(get('v6-missing-form').total === 35, 'Missing form must not change raw score');
requireCase(get('v6-missing-team-quality').total === 20, 'Missing team quality raw score changed unexpectedly');
requireCase(get('v6-ncaa-rankings-missing').total === 39, 'Missing NCAA rankings must not change raw score');
requireCase(get('v6-ncaa-ranked').total === 39, 'Complete NCAA ranking raw score changed unexpectedly');
requireCase(get('v6-ucl-incomplete-context').total === 59, 'Incomplete UCL context must not change raw score');
requireCase(get('v6-ucl-complete-context').total === 59, 'Complete UCL raw score changed unexpectedly');

// Complete fixtures retain the prior high-confidence baseline.
requireCase(get('v6-complete-nba').confidence === 0.9, 'Complete NBA confidence should remain 0.9');
requireCase(get('v6-ncaa-ranked').confidence === 0.9, 'Complete NCAA confidence should remain 0.9');
requireCase(get('v6-ucl-complete-context').confidence === 0.9, 'Complete UCL confidence should remain 0.9');

// V6 fixes the V5 failures: important missing context caps confidence below 0.85.
requireCase(get('v6-missing-standings').confidence < 0.85, 'Missing NBA standings should reduce confidence');
requireCase(get('v6-missing-form').confidence < 0.85, 'Missing form should retain its existing confidence penalty');
requireCase(get('v6-missing-team-quality').confidence < 0.85, 'Missing team quality should reduce confidence');
requireCase(get('v6-ncaa-rankings-missing').confidence < 0.85, 'Missing NCAA rankings should reduce confidence');
requireCase(get('v6-ucl-incomplete-context').confidence < 0.85, 'Incomplete UCL context should reduce confidence');

requireCase(get('v6-missing-standings').confidence < get('v6-complete-nba').confidence, 'NBA missing standings must be less confident than complete NBA data');
requireCase(get('v6-ncaa-rankings-missing').confidence < get('v6-ncaa-ranked').confidence, 'Missing NCAA ranking context must be less confident than complete context');
requireCase(get('v6-ucl-incomplete-context').confidence < get('v6-ucl-complete-context').confidence, 'Incomplete UCL context must be less confident than complete context');

// The completeness layer is a confidence cap, not another scoring weight.
requireCase(get('v6-missing-form').total === get('v6-complete-nba').total, 'Confidence-only form degradation must not alter raw score');
requireCase(get('v6-ucl-incomplete-context').total === get('v6-ucl-complete-context').total, 'Confidence-only UCL degradation must not alter raw score');
requireCase(get('v6-championship').total === 56, 'Championship raw score changed unexpectedly');

console.log('\nSCORING MODEL V6 — DATA COMPLETENESS REGRESSION TEST\n');
console.table(
  results.map(({ id, result }) => ({
    id,
    rawScore: result.total,
    confidence: result.confidence,
    completeness: result.breakdown.dataCompleteness.confidence,
    reasons: result.breakdown.dataCompleteness.reasons.join('; ') || 'None',
  })),
);

console.log(`\nChecks: ${results.length} fixtures, ${failures.length} failures\n`);

if (failures.length > 0) {
  console.error('FAILED V6 DATA COMPLETENESS REGRESSIONS');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('ALL V6 DATA COMPLETENESS REGRESSION CHECKS PASSED');
}
