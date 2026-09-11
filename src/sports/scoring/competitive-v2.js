export function scoreCompetitiveV2(game) {
  const strength = (team) => Number.isFinite(team?.winPercentage) ? team.winPercentage : null;
  const home = strength(game.homeTeam);
  const away = strength(game.awayTeam);

  if (home === null || away === null) {
    return { score: 8, max: 25, confidence: 0.35, reasons: ['Limited team-strength data'] };
  }

  const balance = 1 - Math.abs(home - away);
  const quality = (home + away) / 2;
  const score = Math.round(25 * (0.45 * balance + 0.55 * quality));
  const reasons = [];

  if (balance >= 0.9) reasons.push('Very evenly matched');
  else if (balance >= 0.75) reasons.push('Competitive matchup');
  if (quality >= 0.8) reasons.push('Elite-quality matchup');
  else if (quality >= 0.65) reasons.push('High-quality teams');

  return { score: Math.max(0, Math.min(25, score)), max: 25, confidence: 0.9, reasons };
}
