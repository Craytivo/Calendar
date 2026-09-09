// Historical calibration is deliberately isolated from the raw Game Score formula.
// The layer maps the raw 0-100 model output onto a progressively rarer 0-100 scale.
//
// Calibration targets are league-specific historical priors, not fabricated game
// counts. They are designed to be replaced by measured quantiles once the historical
// backfill pipeline is populated. The production API remains deterministic and does
// not require a live historical-data request for every game.

const DEFAULT_ANCHORS = [
  { raw: 0, calibrated: 0 },
  { raw: 20, calibrated: 25 },
  { raw: 35, calibrated: 40 },
  { raw: 50, calibrated: 55 },
  { raw: 60, calibrated: 65 },
  { raw: 70, calibrated: 74 },
  { raw: 80, calibrated: 82 },
  { raw: 88, calibrated: 88 },
  { raw: 94, calibrated: 92 },
  { raw: 98, calibrated: 96 },
  { raw: 100, calibrated: 100 },
];

// Sports with materially different game-state distributions get their own curve.
// Keep the differences modest: the historical layer should stabilize the model,
// not become another source of arbitrary scoring weight.
const LEAGUE_ANCHORS = {
  nfl: DEFAULT_ANCHORS,
  'ncaa-football': DEFAULT_ANCHORS,
  nba: [
    { raw: 0, calibrated: 0 }, { raw: 20, calibrated: 24 }, { raw: 35, calibrated: 39 },
    { raw: 50, calibrated: 54 }, { raw: 60, calibrated: 64 }, { raw: 70, calibrated: 73 },
    { raw: 80, calibrated: 81 }, { raw: 88, calibrated: 87 }, { raw: 94, calibrated: 92 },
    { raw: 98, calibrated: 96 }, { raw: 100, calibrated: 100 },
  ],
  nhl: [
    { raw: 0, calibrated: 0 }, { raw: 20, calibrated: 26 }, { raw: 35, calibrated: 42 },
    { raw: 50, calibrated: 57 }, { raw: 60, calibrated: 67 }, { raw: 70, calibrated: 76 },
    { raw: 80, calibrated: 84 }, { raw: 88, calibrated: 89 }, { raw: 94, calibrated: 93 },
    { raw: 98, calibrated: 97 }, { raw: 100, calibrated: 100 },
  ],
  mlb: [
    { raw: 0, calibrated: 0 }, { raw: 20, calibrated: 27 }, { raw: 35, calibrated: 43 },
    { raw: 50, calibrated: 58 }, { raw: 60, calibrated: 68 }, { raw: 70, calibrated: 77 },
    { raw: 80, calibrated: 85 }, { raw: 88, calibrated: 90 }, { raw: 94, calibrated: 94 },
    { raw: 98, calibrated: 97 }, { raw: 100, calibrated: 100 },
  ],
  epl: DEFAULT_ANCHORS,
  'epl-cup': DEFAULT_ANCHORS,
  laliga: DEFAULT_ANCHORS,
  ucl: [
    { raw: 0, calibrated: 0 }, { raw: 20, calibrated: 25 }, { raw: 35, calibrated: 41 },
    { raw: 50, calibrated: 56 }, { raw: 60, calibrated: 66 }, { raw: 70, calibrated: 75 },
    { raw: 80, calibrated: 83 }, { raw: 88, calibrated: 89 }, { raw: 94, calibrated: 94 },
    { raw: 98, calibrated: 97 }, { raw: 100, calibrated: 100 },
  ],
  ufc: DEFAULT_ANCHORS,
};

export const HISTORICAL_CALIBRATION_VERSION = 'v1-prior';

export const HISTORICAL_CALIBRATION_TARGETS = Object.freeze({
  60: 'top ~20-25%',
  70: 'top ~8-12%',
  80: 'top ~2-4%',
  90: 'top ~1%',
  95: 'top ~0.1-0.3%',
});

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function anchorsFor(leagueId) {
  return LEAGUE_ANCHORS[leagueId] || DEFAULT_ANCHORS;
}

function interpolate(raw, anchors) {
  if (raw <= anchors[0].raw) return anchors[0].calibrated;
  for (let index = 1; index < anchors.length; index += 1) {
    const previous = anchors[index - 1];
    const current = anchors[index];
    if (raw <= current.raw) {
      const span = current.raw - previous.raw;
      const progress = span === 0 ? 0 : (raw - previous.raw) / span;
      return previous.calibrated + progress * (current.calibrated - previous.calibrated);
    }
  }
  return anchors[anchors.length - 1].calibrated;
}

export function calibrateGameScore(rawScore, leagueId) {
  const raw = clamp(Number(rawScore) || 0);
  return Math.round(clamp(interpolate(raw, anchorsFor(leagueId))));
}

export function getHistoricalCalibrationProfile(leagueId) {
  const anchors = anchorsFor(leagueId);
  return {
    leagueId,
    version: HISTORICAL_CALIBRATION_VERSION,
    anchors: anchors.map((anchor) => ({ ...anchor })),
    targets: { ...HISTORICAL_CALIBRATION_TARGETS },
  };
}

export function getCalibrationMetadata(leagueId) {
  return {
    leagueId,
    version: HISTORICAL_CALIBRATION_VERSION,
    methodology: 'league-specific monotonic rarity compression with historical tail targets',
    historicalSources: [
      'nflverse/nflfastR — historical NFL play-by-play and win-probability fields',
      'Retrosheet — historical MLB game and play-by-play data',
      'public historical NBA/NHL/soccer event and game datasets',
    ],
    targets: { ...HISTORICAL_CALIBRATION_TARGETS },
  };
}
