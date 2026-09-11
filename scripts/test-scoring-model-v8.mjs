import { scoreGameV2 } from '../src/sports/scoring/index-v2.js';

function getConfidenceAdjustedScore(rawScore, confidence) {
  if (confidence >= 0.85) return rawScore;
  if (confidence >= 0.70) return Math.round(rawScore * 0.95);
  if (confidence >= 0.50) return Math.round(rawScore * 0.90);
  return Math.round(rawScore * 0.80);
}

const confidenceLevels = [0.95, 0.90, 0.85, 0.84, 0.80, 0.70, 0.69, 0.50, 0.49, 0.30, 0];
const rawScores = [90, 80, 67, 55, 42, 35, 20];
const failures = [];

for (const rawScore of rawScores) {
  const adjusted = confidenceLevels.map((confidence) => ({
    confidence,
    adjusted: getConfidenceAdjustedScore(rawScore, confidence),
  }));

  if (adjusted.some(({ adjusted: score }) => score > rawScore)) {
    failures.push(`Adjusted score exceeded raw score for raw=${rawScore}`);
  }

  for (let i = 1; i < adjusted.length; i += 1) {
    if (adjusted[i].adjusted > adjusted[i - 1].adjusted) {
      failures.push(`Confidence penalty is not monotonic for raw=${rawScore}: ${adjusted[i - 1].confidence} -> ${adjusted[i].confidence}`);
    }
  }

  for (const confidence of [0.95, 0.90, 0.85]) {
    if (getConfidenceAdjustedScore(rawScore, confidence) !== rawScore) {
      failures.push(`High confidence should preserve raw score for raw=${rawScore}, confidence=${confidence}`);
    }
  }

  if (getConfidenceAdjustedScore(rawScore, 0.84) !== Math.round(rawScore * 0.95)) {
    failures.push(`0.84 boundary failed for raw=${rawScore}`);
  }
  if (getConfidenceAdjustedScore(rawScore, 0.69) !== Math.round(rawScore * 0.90)) {
    failures.push(`0.69 boundary failed for raw=${rawScore}`);
  }
  if (getConfidenceAdjustedScore(rawScore, 0.49) !== Math.round(rawScore * 0.80)) {
    failures.push(`0.49 boundary failed for raw=${rawScore}`);
  }
}

const completeFixture = {
  id: 'v8-complete-high-stakes',
  leagueId: 'nba',
  eventType: 'championship',
  homeTeam: { winPercentage: 0.8, conferenceRank: 2, recentWinPercentage: 0.8 },
  awayTeam: { winPercentage: 0.8, conferenceRank: 3, recentWinPercentage: 0.8 },
};

const incompleteFixture = {
  ...completeFixture,
  id: 'v8-incomplete-high-stakes',
  homeTeam: { winPercentage: 0.8, recentWinPercentage: 0.8 },
  awayTeam: { winPercentage: 0.8, recentWinPercentage: 0.8 },
};

const complete = scoreGameV2(completeFixture);
const incomplete = scoreGameV2(incompleteFixture);
const completeAdjusted = getConfidenceAdjustedScore(complete.total, complete.confidence);
const incompleteAdjusted = getConfidenceAdjustedScore(incomplete.total, incomplete.confidence);

if (complete.confidence < 0.85) failures.push('Complete high-stakes fixture should retain high confidence');
if (incomplete.confidence >= complete.confidence) failures.push('Incomplete high-stakes fixture should have lower confidence');
if (completeAdjusted !== complete.total) failures.push('High-confidence high-stakes fixture should not be penalized');
if (incompleteAdjusted >= completeAdjusted) failures.push('Incomplete high-stakes fixture should receive a lower adjusted score');
if (complete.total !== incomplete.total) failures.push('Completeness should not change the raw high-stakes score');

const output = confidenceLevels.map((confidence) => ({
  confidence,
  raw90: 90,
  adjusted90: getConfidenceAdjustedScore(90, confidence),
  raw67: 67,
  adjusted67: getConfidenceAdjustedScore(67, confidence),
}));

console.log('\nSCORING MODEL V8 — CONFIDENCE STRESS REGRESSION TEST\n');
console.table(output);
console.log(`\nHigh-stakes complete: raw ${complete.total} confidence ${complete.confidence} adjusted ${completeAdjusted}`);
console.log(`High-stakes incomplete: raw ${incomplete.total} confidence ${incomplete.confidence} adjusted ${incompleteAdjusted}`);
console.log(`\nChecks: ${confidenceLevels.length} confidence levels x ${rawScores.length} raw scores + high-stakes scenarios, ${failures.length} failures`);

if (failures.length) {
  console.error('\nFAILED V8 CONFIDENCE STRESS REGRESSIONS');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('ALL V8 CONFIDENCE STRESS CHECKS PASSED');
