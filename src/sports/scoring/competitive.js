function teamStrength(team, leagueId) {
  if (!team) return null;
  if (Number.isFinite(team.winPercentage)) return team.winPercentage;

  if (leagueId === 'ncaa-football' && Number.isFinite(team.ranking) && team.ranking >= 1 && team.ranking <= 25) {
    return 1 - (team.ranking - 1) / 24;
  }
  if ((leagueId === 'epl' || leagueId === 'laliga') && Number.isFinite(team.leagueRank)) {
    return Math.max(0, 1 - (team.leagueRank - 1) / 19);
  }
  if ((leagueId === 'nba' || leagueId === 'nhl') && Number.isFinite(team.conferenceRank)) {
    return Math.max(0, 1 - (team.conferenceRank - 1) / 14);
  }
  return null;
}

export function scoreCompetitive(game) {
  const home = teamStrength(game.homeTeam, game.leagueId);
  const away = teamStrength(game.awayTeam, game.leagueId);

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
