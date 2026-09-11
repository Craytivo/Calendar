const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

function teamStrength(team) {
  if (!team) return null;

  const signals = [];
  if (Number.isFinite(team.winPercentage)) signals.push(team.winPercentage);
  if (Number.isFinite(team.ranking) && team.ranking >= 1 && team.ranking <= 25) {
    signals.push(1 - (team.ranking - 1) / 24);
  }
  if (Number.isFinite(team.leagueRank) && team.leagueRank >= 1 && team.leagueRank <= 20) {
    signals.push(1 - (team.leagueRank - 1) / 19);
  }

  if (!signals.length) return null;
  return signals.reduce((sum, value) => sum + value, 0) / signals.length;
}

export function scoreCompetitive(game) {
  const home = teamStrength(game.homeTeam);
  const away = teamStrength(game.awayTeam);

  if (home === null || away === null) {
    return { score: 10, max: 25, confidence: 0.35, reasons: ['Limited team-strength data'] };
  }

  const balance = 1 - Math.abs(home - away);
  const combinedQuality = (home + away) / 2;
  const score = Math.round(25 * (0.7 * balance + 0.3 * combinedQuality));

  const reasons = [];
  if (balance >= 0.9) reasons.push('Very evenly matched');
  else if (balance >= 0.75) reasons.push('Competitive matchup');
  if (combinedQuality >= 0.75) reasons.push('High-quality teams');

  return {
    score: Math.max(0, Math.min(25, score)),
    max: 25,
    confidence: 0.9,
    reasons,
  };
}
