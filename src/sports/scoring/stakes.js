const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

export function scoreStakes(game) {
  let score = 0;
  const reasons = [];

  if (game.eventType === 'championship' || game.eventType === 'final') {
    score = 25;
    reasons.push('Championship / final');
  } else if (game.isElimination === true) {
    score = 23;
    reasons.push('Elimination game');
  } else if (game.competitionPhase === 'knockout' || game.eventType === 'knockout') {
    score = 21;
    reasons.push('Knockout stage');
  } else if (game.eventType === 'playoff' || game.eventType === 'postseason') {
    score = 19;
    reasons.push('Postseason');
  }

  if (game.hasTitleOrUclQualificationImplications === true) {
    score = Math.max(score, 18);
    reasons.push('Title / qualification race');
  }
  if (game.hasQualificationImplications === true) {
    score = Math.max(score, 16);
    reasons.push('Qualification implications');
  }
  if (game.hasPlayoffImplications === true) {
    score = Math.max(score, 15);
    reasons.push('Playoff implications');
  }
  if (game.hasSeedingImplications === true) {
    score = Math.max(score, 13);
    reasons.push('Seeding implications');
  }
  if (game.isMajorEvent === true) {
    score = Math.max(score, 10);
    reasons.push('Major event');
  }

  return {
    score: clamp(score, 0, 25),
    max: 25,
    confidence: 0.9,
    reasons: [...new Set(reasons)],
  };
}
