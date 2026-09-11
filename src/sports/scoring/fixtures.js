function team(overrides = {}) {
  return {
    winPercentage: 0.5,
    gamesPlayed: 20,
    conferenceRank: 10,
    leagueRank: 10,
    ranking: null,
    recentWinPercentage: 0.5,
    ...overrides,
  };
}

const base = (id, leagueId, homeTeam, awayTeam, overrides = {}) => ({
  id,
  leagueId,
  homeTeamId: homeTeam.id,
  awayTeamId: awayTeam.id,
  homeTeam,
  awayTeam,
  startTime: '2026-10-01T19:00:00-06:00',
  eventType: 'regular-season',
  ...overrides,
});

export const scoringFixtures = [
  base('elite-even-matchup', 'nfl', team({ winPercentage: 0.9 }), team({ winPercentage: 0.9 })),
  base('elite-mismatch', 'nfl', team({ winPercentage: 0.95 }), team({ winPercentage: 0.35 })),
  base('average-even-matchup', 'nba', team({ winPercentage: 0.55, conferenceRank: 8 }), team({ winPercentage: 0.55, conferenceRank: 8 })),
  base('bad-even-matchup', 'nba', team({ winPercentage: 0.25, conferenceRank: 14 }), team({ winPercentage: 0.25, conferenceRank: 14 })),
  base('playoff-implications', 'nfl', team({ winPercentage: 0.65 }), team({ winPercentage: 0.65 }), { hasPlayoffImplications: true }),
  base('seeding-implications', 'nba', team({ winPercentage: 0.7, conferenceRank: 5 }), team({ winPercentage: 0.68, conferenceRank: 6 }), { hasSeedingImplications: true }),
  base('elimination-game', 'nfl', team({ winPercentage: 0.6 }), team({ winPercentage: 0.6 }), { isElimination: true }),
  base('championship', 'nfl', team({ winPercentage: 0.75 }), team({ winPercentage: 0.75 }), { eventType: 'championship' }),
  base('rivalry', 'nfl', team({ winPercentage: 0.55 }), team({ winPercentage: 0.55 }), { isRivalry: true }),
  base('divisional', 'nfl', team({ winPercentage: 0.55 }), team({ winPercentage: 0.55 }), { isDivisional: true }),
  base('hot-teams', 'nba', team({ winPercentage: 0.6, recentWinPercentage: 0.9 }), team({ winPercentage: 0.6, recentWinPercentage: 0.8 })),
  base('cold-teams', 'nba', team({ winPercentage: 0.6, recentWinPercentage: 0.2 }), team({ winPercentage: 0.6, recentWinPercentage: 0.3 })),
  base('ncaa-top-10', 'ncaa-football', team({ ranking: 4, winPercentage: 0.9 }), team({ ranking: 9, winPercentage: 0.8 })),
  base('ncaa-24-vs-25', 'ncaa-football', team({ ranking: 24, winPercentage: 0.6 }), team({ ranking: 25, winPercentage: 0.6 })),
  base('epl-title-race', 'epl', team({ leagueRank: 1, winPercentage: 0.85 }), team({ leagueRank: 2, winPercentage: 0.8 }), { hasTitleOrUclQualificationImplications: true }),
  base('ucl-knockout', 'ucl', team({ leagueRank: 1, winPercentage: 0.8 }), team({ leagueRank: 3, winPercentage: 0.75 }), { competitionPhase: 'knockout', eventType: 'knockout' }),
  base('favorite-ordinary', 'nhl', team({ winPercentage: 0.5 }), team({ winPercentage: 0.5 }), { homeTeamId: 'oilers' }),
  base('favorite-rivalry', 'nhl', team({ winPercentage: 0.5 }), team({ winPercentage: 0.5 }), { homeTeamId: 'oilers', isRivalry: true }),
  base('must-see-ordinary', 'ncaa-football', team({ ranking: 40, winPercentage: 0.5 }), team({ ranking: 50, winPercentage: 0.5 }), { homeTeamId: 'oregon-ducks' }),
  base('missing-data', 'mlb', { id: 'mlb-a' }, { id: 'mlb-b' }),
];
