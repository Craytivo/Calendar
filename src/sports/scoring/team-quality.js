function normalizeRank(rank, maxRank) {
  if (!Number.isFinite(rank) || rank < 1) return null;
  return Math.max(0, 1 - (rank - 1) / Math.max(1, maxRank - 1));
}

function quality(team, leagueId) {
  if (!team) return null;
  const signals = [];

  if (Number.isFinite(team.winPercentage)) signals.push(team.winPercentage);
  if (Number.isFinite(team.ranking) && team.ranking <= 25) signals.push(normalizeRank(team.ranking, 25));
  if (Number.isFinite(team.leagueRank)) {
    const maxRank = leagueId === 'laliga' ? 20 : 20;
    signals.push(normalizeRank(team.leagueRank, maxRank));
  }
  if (Number.isFinite(team.conferenceRank)) signals.push(normalizeRank(team.conferenceRank, 15));

  if (!signals.length) return null;
  return signals.reduce((sum, value) => sum + value, 0) / signals.length;
}

export function scoreTeamQuality(game) {
  const home = quality(game.homeTeam, game.leagueId);
  const away = quality(game.awayTeam, game.leagueId);

  if (home === null && away === null) {
    return { score: 7, max: 15, confidence: 0.2, reasons: ['No team-quality data'] };
  }

  const values = [home, away].filter((value) => value !== null);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const score = Math.round(15 * average);
  const reasons = [];

  if (average >= 0.8) reasons.push('Elite team quality');
  else if (average >= 0.65) reasons.push('Strong team quality');
  if (home !== null && away !== null && Math.abs(home - away) <= 0.1) reasons.push('Quality is closely matched');

  return {
    score: Math.max(0, Math.min(15, score)),
    max: 15,
    confidence: values.length === 2 ? 0.9 : 0.55,
    reasons,
  };
}
