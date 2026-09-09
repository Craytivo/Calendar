import assert from 'node:assert/strict';
import {
  calibrateGameScore,
  getHistoricalCalibrationProfile,
  HISTORICAL_CALIBRATION_TARGETS,
} from './historical-calibration.js';

const leagues = ['nfl', 'nba', 'nhl', 'mlb', 'epl', 'laliga', 'ucl'];

for (const league of leagues) {
  const profile = getHistoricalCalibrationProfile(league);
  assert.equal(profile.version, 'v1-prior');
  assert.equal(profile.anchors[0].raw, 0);
  assert.equal(profile.anchors.at(-1).raw, 100);

  let previous = -1;
  for (const anchor of profile.anchors) {
    assert.ok(anchor.calibrated >= previous, `${league} calibration must be monotonic`);
    previous = anchor.calibrated;
  }

  assert.ok(calibrateGameScore(90, league) < 95, `${league} raw 90 should not automatically become 95+`);
  assert.ok(calibrateGameScore(95, league) >= 90, `${league} raw 95 should remain exceptional`);
  assert.equal(calibrateGameScore(100, league), 100, `${league} raw 100 should remain 100`);
}

assert.equal(HISTORICAL_CALIBRATION_TARGETS[95], 'top ~0.1-0.3%');
assert.ok(calibrateGameScore(70, 'nfl') < calibrateGameScore(80, 'nfl'));
assert.ok(calibrateGameScore(80, 'mlb') > calibrateGameScore(80, 'nba'), 'league-specific curves should remain meaningfully distinct');
assert.equal(calibrateGameScore(-10, 'nfl'), 0);
assert.equal(calibrateGameScore(120, 'nfl'), 100);

console.log('historical calibration tests passed');
