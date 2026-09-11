import { scoreGame } from './index.js';
import { scoringFixtures } from './fixtures.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const byId = new Map(scoringFixtures.map((fixture) => [fixture.id, fixture]));

export function runScoringEngineChecks() {
  for (const fixture of scoringFixtures) {
    const result = scoreGame(fixture);
    assert(Number.isInteger(result.total), `${fixture.id} total must be an integer`);
    assert(result.total >= 0 && result.total <= 100, `${fixture.id} total must stay within 0-100`);
    assert(result.breakdown.competitive.max === 25, `${fixture.id} competitive max mismatch`);
    assert(result.breakdown.stakes.max === 25, `${fixture.id} stakes max mismatch`);
    assert(result.breakdown.teamQuality.max === 15, `${fixture.id} team quality max mismatch`);
    assert(result.breakdown.narrative.max === 10, `${fixture.id} narrative max mismatch`);
    assert(result.breakdown.form.max === 10, `${fixture.id} form max mismatch`);
    assert(result.breakdown.personal.max === 15, `${fixture.id} personal max mismatch`);
    assert(result.confidence >= 0 && result.confidence <= 1, `${fixture.id} confidence must stay within 0-1`);
  }

  assert(
    scoreGame(byId.get('elite-even-matchup')).total > scoreGame(byId.get('elite-mismatch')).total,
    'An evenly matched elite game should outrank an elite-vs-poor mismatch',
  );
  assert(
    scoreGame(byId.get('championship')).total > scoreGame(byId.get('playoff-implications')).total,
    'A championship should outrank a normal playoff-implications game when quality is comparable',
  );
  assert(
    scoreGame(byId.get('hot-teams')).total > scoreGame(byId.get('cold-teams')).total,
    'Current form should move otherwise comparable games in the expected direction',
  );
  assert(
    scoreGame(byId.get('favorite-rivalry')).total > scoreGame(byId.get('favorite-ordinary')).total,
    'Favorite-team rivalry should gain narrative value without requiring a giant favorite bonus',
  );
  assert(
    scoreGame(byId.get('must-see-ordinary')).breakdown.personal.score === 15,
    'Must-see teams should receive the full bounded personal-relevance score',
  );
  assert(
    scoreGame(byId.get('favorite-ordinary')).breakdown.personal.score === 11,
    'Favorite teams should receive bounded personal relevance',
  );
  assert(
    scoreGame(byId.get('missing-data')).confidence < scoreGame(byId.get('elite-even-matchup')).confidence,
    'Missing data should reduce confidence rather than silently pretending certainty',
  );

  return true;
}

runScoringEngineChecks();
console.log('Scoring engine checks passed.');
