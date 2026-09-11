export function getConfidenceAdjustedScore(rawScore, confidence) {
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));
  return score;
}

export function getPriorityFloor() {
  return { minScore: 0, reason: null };
}
