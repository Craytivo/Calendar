function hasValue(value) {
  return value !== null && value !== undefined;
}

function hasAny(team, fields) {
  return fields.some((field) => hasValue(team?.[field]));
}

export function scoreDataCompleteness(game) {
  const home = game?.homeTeam;
  const away = game?.awayTeam;
  const leagueId = game?.leagueId;
  const reasons = [];

  if (leagueId === 'nba' || leagueId === 'nhl') {
    if (!hasAny(home, ['conferenceRank', 'leagueRank']) || !hasAny(away, ['conferenceRank', 'leagueRank'])) {
      reasons.push('Missing NBA/NHL standings position');
    }
  }

  if (leagueId === 'ncaa-football') {
    if (!hasValue(home?.ranking) || !hasValue(away?.ranking)) {
      reasons.push('Missing NCAA ranking context');
    }
  }

  if (leagueId === 'epl' || leagueId === 'laliga') {
    if (!hasValue(home?.leagueRank) || !hasValue(away?.leagueRank)) {
      reasons.push('Missing league position');
    }
  }

  if (leagueId === 'ucl') {
    const hasCompetitionContext = hasValue(game?.competitionPhase) || hasValue(game?.eventType);
    const hasTeamContext = hasValue(home?.leagueRank) && hasValue(away?.leagueRank);
    if (!hasCompetitionContext || !hasTeamContext) {
      reasons.push('Incomplete UCL team/competition context');
    }
  }

  return {
    confidence: reasons.length ? 0.8 : 0.9,
    reasons,
  };
}
