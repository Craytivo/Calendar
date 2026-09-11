function recentForm(team) {
  if (!team) return null;
  if (Number.isFinite(team.recentWinPercentage)) return team.recentWinPercentage;
  if (Array.isArray(team.recentResults) && team.recentResults.length) {
    const wins = team.recentResults.filter((result) => result === 'W' || result?.result === 'W').length;
    return wins / team.recentResults.length;
  }
  return null;
}

export function scoreForm(game) {
  const values = [recentForm(game.homeTeam), recentForm(game.awayTeam)].filter((value) => value !== null);

  if (!values.length) {
    return { score: 5, max: 10, confidence: 0.2, reasons: ['Recent-form data unavailable'] };
  }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const score = Math.round(10 * average);
  const reasons = [];
  if (average >= 0.75) reasons.push('Both teams in strong recent form');
  else if (average >= 0.6) reasons.push('Good recent form');

  return {
    score,
    max: 10,
    confidence: values.length === 2 ? 0.8 : 0.45,
    reasons,
  };
}
