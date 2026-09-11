export function getConfidenceAdjustedScore(rawScore, confidence) {
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));
  const value = Number.isFinite(confidence) ? confidence : 0;

  if (value >= 0.85) return score;
  if (value >= 0.70) return Math.round(score * 0.95);
  if (value >= 0.50) return Math.round(score * 0.90);
  return Math.round(score * 0.80);
}

export function getPriorityFloor(breakdown) {
  const reasons = [
    ...(breakdown?.stakes?.reasons ?? []),
    ...(breakdown?.narrative?.reasons ?? []),
    ...(breakdown?.personal?.reasons ?? []),
  ];
  const hasReason = (text) => reasons.includes(text);

  if (hasReason('Championship / final')) {
    return { minScore: 80, reason: 'Championship / final floor' };
  }
  if (hasReason('Elimination game')) {
    return { minScore: 55, reason: 'Elimination game floor' };
  }
  if (hasReason('Favorite-team rivalry') && (breakdown?.personal?.score ?? 0) >= 10) {
    return { minScore: 50, reason: 'Favorite-team rivalry floor' };
  }
  if (hasReason('Must-see team') && (breakdown?.personal?.score ?? 0) >= 12) {
    return { minScore: 50, reason: 'Must-see team floor' };
  }
  if (hasReason('Favorite team') && (breakdown?.personal?.score ?? 0) >= 10) {
    return { minScore: 40, reason: 'Favorite team floor' };
  }

  return { minScore: 0, reason: null };
}
