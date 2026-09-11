export const WATCH_TIERS = {
  MUST_WATCH: { min: 90, label: 'Must Watch' },
  EXCELLENT: { min: 80, label: 'Excellent' },
  STRONG: { min: 70, label: 'Strong' },
  WORTH_WATCHING: { min: 55, label: 'Worth Watching' },
  OPTIONAL: { min: 40, label: 'Optional' },
  LOW_PRIORITY: { min: 0, label: 'Low Priority' },
};

export function getWatchTier(score) {
  if (score >= 90) return WATCH_TIERS.MUST_WATCH;
  if (score >= 80) return WATCH_TIERS.EXCELLENT;
  if (score >= 70) return WATCH_TIERS.STRONG;
  if (score >= 55) return WATCH_TIERS.WORTH_WATCHING;
  if (score >= 40) return WATCH_TIERS.OPTIONAL;
  return WATCH_TIERS.LOW_PRIORITY;
}
