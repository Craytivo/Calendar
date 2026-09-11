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

// These cases intentionally attack interactions and missing-data paths rather than
// adding more weight-tuning assumptions to the scoring model.
const adversarialFixtures = [
  game('v5-elite-0-0', 'nfl', team({ id: 'elite-a', winPercentage: 0.9 }), team({ id: 'elite-b', winPercentage: 0.9 }), {
    homeScore: 0,
    awayScore: 0,
  }),
  game('v5-elite-mismatch-playoff', 'nfl', team({ id: 'elite', winPercentage: 0.95 }), team({ id: 'bad', winPercentage: 0.2 }), {
    hasPlayoffImplications: true,
  }),
  game('v5-mediocre-championship', 'nfl', team({ id: 'mid-a', winPercentage: 0.5 }), team({ id: 'mid-b', winPercentage: 0.5 }), {
    eventType: 'championship',
  }),
  game('v5-favorite-bad-record', 'nhl', team({ id: 'oilers', winPercentage: 0.2 }), team({ id: 'other', winPercentage: 0.2 }), {
    homeTeamId: 'oilers',
  }),
  game('v5-rivalry-low-stakes', 'nfl', team({ id: 'rival-a', winPercentage: 0.25 }), team({ id: 'rival-b', winPercentage: 0.25 }), {
    isRivalry: true,
  }),
  game('v5-rivalry-playoff', 'nfl', team({ id: 'rival-a', winPercentage: 0.6 }), team({ id: 'rival-b', winPercentage: 0.6 }), {
    isRivalry: true,
    hasPlayoffImplications: true,
  }),
  game('v5-favorite-elimination', 'nhl', team({ id: 'oilers', winPercentage: 0.5 }), team({ id: 'other', winPercentage: 0.5 }), {
    homeTeamId: 'oilers',
    isElimination: true,
  }),
  game('v5-must-see-championship', 'ncaa-football', team({ id: 'oregon-ducks', ranking: 40, winPercentage: 0.5 }), team({ id: 'other', ranking: 50, winPercentage: 0.5 }), {
    homeTeamId: 'oregon-ducks',
    eventType: 'championship',
  }),
  game('v5-missing-standings', 'nba', team({ id: 'a', winPercentage: 0.65, conferenceRank: undefined, leagueRank: undefined }), team({ id: 'b', winPercentage: 0.65, conferenceRank: undefined, leagueRank: undefined })),
  game('v5-missing-form', 'nba', team({ id: 'a', winPercentage: 0.65, recentWinPercentage: undefined }), team({ id: 'b', winPercentage: 0.65, recentWinPercentage: undefined })),
  game('v5-missing-team-quality', 'nba', team({ id: 'a', winPercentage: undefined, conferenceRank: undefined, leagueRank: undefined, ranking: undefined }), team({ id: 'b', winPercentage: undefined, conferenceRank: undefined, leagueRank: undefined, ranking: undefined })),
  game('v5-ncaa-rankings-missing', 'ncaa-football', team({ id: 'a', winPercentage: 0.8, ranking: undefined }), team({ id: 'b', winPercentage: 0.8, ranking: undefined })),
  game('v5-ucl-incomplete-context', 'ucl', team({ id: 'a', winPercentage: 0.8, leagueRank: undefined }), team({ id: 'b', winPercentage: 0.75, leagueRank: undefined }), {
    competitionPhase: 'knockout',
  }),
  game('v5-multiple-floors', 'nhl', team({ id: 'oilers', winPercentage: 0.5 }), team({ id: 'other', winPercentage: 0.5 }), {
    homeTeamId: 'oilers',
    eventType: 'championship',
    isElimination: true,
    isRivalry: true,
  }),
];

function getPriorityFloor(breakdown) {
  const reasons = [
    ...(breakdown.stakes?.reasons ?? []),
    ...(breakdown.narrative?.reasons ?? []),
    ...(breakdown.personal?.reasons ?? []),
  ];

  const hasReason = (text) => reasons.includes(text);

  if (hasReason('Championship / final')) return { minScore: 80, reason: 'Championship / final floor' };
  if (hasReason('Elimination game')) return { minScore: 55, reason: 'Elimination game floor' };
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

function scoreV5(fixture) {
  const result = scoreGameV2(fixture);
  const adjustedScore = getConfidenceAdjustedScore(result.total, result.confidence);
  const floor = getPriorityFloor(result.breakdown);
  const finalScore = Math.max(adjustedScore, floor.minScore);

  return {
    id: fixture.id,
    rawScore: result.total,
    adjustedScore,
    finalScore,
    tier: getTierFromScore(finalScore),
    confidence: result.confidence,
    floor: floor.reason,
    breakdown: result.breakdown,
  };
}

const results = adversarialFixtures.map(scoreV5);
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

// Basic integrity and score invariants.
requireCase(results.length === 14, `Expected 14 V5 adversarial fixtures, found ${results.length}`);
requireCase(new Set(results.map((result) => result.id)).size === results.length, 'V5 fixture IDs must be unique');

for (const result of results) {
  requireCase(result.finalScore >= 0 && result.finalScore <= 100, `${result.id}: score outside 0-100`);
  requireCase(result.tier === getTierFromScore(result.finalScore), `${result.id}: tier mismatch`);
  requireCase(Number.isFinite(result.confidence), `${result.id}: confidence must be finite`);
}

// Competitive-quality adversaries.
requireCase(
  get('v5-elite-0-0').finalScore > get('v5-rivalry-low-stakes').finalScore,
  'Elite 0-0 matchup should still outrank a weak low-stakes rivalry',
);
requireCase(
  get('v5-elite-mismatch-playoff').finalScore >= 40,
  'Strong playoff implications should keep an elite-vs-weak matchup relevant',
);

// Contextual floors must survive poor underlying matchup quality.
requireCase(get('v5-mediocre-championship').finalScore >= 80, 'Championship floor must survive mediocre teams');
requireCase(get('v5-mediocre-championship').tier === 'Major Event', 'Mediocre championship must be Major Event');
requireCase(get('v5-must-see-championship').finalScore >= 80, 'Must-see championship must retain championship floor');
requireCase(get('v5-favorite-elimination').finalScore >= 55, 'Favorite elimination game must retain elimination floor');
requireCase(get('v5-multiple-floors').finalScore >= 80, 'Multiple priority floors must resolve to the strongest floor');
requireCase(get('v5-multiple-floors').tier === 'Major Event', 'Multiple priority floors must produce Major Event');

// Rivalry should add context without overpowering meaningful stakes.
requireCase(
  get('v5-rivalry-playoff').finalScore > get('v5-rivalry-low-stakes').finalScore,
  'Rivalry plus playoff implications must outrank low-stakes rivalry',
);
requireCase(
  get('v5-rivalry-low-stakes').finalScore < 40,
  'Weak low-stakes rivalry should not automatically become Worth Watching',
);

// Personal-interest rules must not completely erase bad team quality.
requireCase(
  get('v5-favorite-bad-record').finalScore >= 40,
  'Favorite-team floor should preserve minimum personal relevance',
);
requireCase(
  get('v5-favorite-bad-record').finalScore < 55,
  'Bad favorite-team game should not become Major Game from personal interest alone',
);

// Missing-data cases should degrade confidence and never create a score advantage over
// a comparable high-confidence matchup solely because data is absent.
for (const id of [
  'v5-missing-standings',
  'v5-missing-form',
  'v5-missing-team-quality',
  'v5-ncaa-rankings-missing',
  'v5-ucl-incomplete-context',
]) {
  requireCase(get(id).confidence < 0.85, `${id}: incomplete data should reduce confidence`);
  requireCase(get(id).adjustedScore <= get(id).rawScore, `${id}: confidence adjustment must not increase score`);
}

requireCase(
  get('v5-missing-team-quality').finalScore < get('v5-elite-0-0').finalScore,
  'Missing team-quality data must not outrank a known elite matchup',
);
requireCase(
  get('v5-ucl-incomplete-context').confidence < get('v5-elite-0-0').confidence,
  'Incomplete UCL context should be less confident than a fully specified matchup',
);

// A championship remains the strongest contextual signal even when other floors overlap.
requireCase(
  get('v5-multiple-floors').finalScore >= get('v5-favorite-elimination').finalScore,
  'Championship floor must not rank below elimination floor when both are present',
);

console.log('\nSCORING MODEL V5 — ADVERSARIAL REGRESSION TEST\n');
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
  console.error('FAILED V5 ADVERSARIAL REGRESSIONS');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('ALL V5 ADVERSARIAL REGRESSION CHECKS PASSED');
}
