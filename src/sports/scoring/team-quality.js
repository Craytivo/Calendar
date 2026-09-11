function normalizeRank(rank, maxRank) {
  if (!Number.isFinite(rank) || rank < 1) return null;
  return Math.max(0, 1 - (rank - 1) / Math.max(1, maxRank - 1));
}

function quality(team, leagueId) {
  if (!team) return null;

  if (Number.isFinite(team.winPercentage)) return team.winPercentage;
  if (leagueId === 'ncaa-football' && Number.isFinite(team.ranking) && team.ranking <= 25) {
    return normalizeRank(team.ranking, 25);
  }
  if ((leagueId === 'epl' || leagueId === 'laliga') && Number.isFinite(team.leagueRank)) {
    return normalizeRank(team.leagueRank, 20);
  }
  if ((leagueId === 'nba' || leagueId === 'nhl') && Number.isFinite(team.conferenceRank)) {
    return normalizeRank(team.conferenceRank, 15);
  }
  return null;
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
