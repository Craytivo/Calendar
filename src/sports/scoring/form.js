function recordPercentage(wins, losses) {
  if (!Number.isFinite(wins) || !Number.isFinite(losses) || wins + losses <= 0) return null;
  return wins / (wins + losses);
}

function recentForm(team) {
  if (!team) return null;

  if (Number.isFinite(team.lastTenWinPercentage)) return team.lastTenWinPercentage;
  const lastTen = recordPercentage(team.lastTenWins, team.lastTenLosses);
  if (lastTen !== null) return lastTen;
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
  if (game.leagueId === 'mlb' && values.length === 2) reasons.push('Last-ten records included');

  return {
    score,
    max: 10,
    confidence: values.length === 2 ? (game.leagueId === 'mlb' ? 0.95 : 0.8) : 0.45,
    reasons,
  };
}
