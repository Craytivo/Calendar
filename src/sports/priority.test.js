import {
  getPriorityTier,
  isMajorGameForPriority,
  isMajorUclGameForPriority,
  sortGamesByPriority,
} from './priority.js';
import { PRIORITY_TIERS } from './types.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertTier(game, expectedTier) {
  const actualTier = getPriorityTier(game);
  assert(
    actualTier === expectedTier,
    `${game.id} expected priority ${expectedTier}, got ${actualTier}`,
  );
}

function team(overrides = {}) {
  return {
    winPercentage: 0.5,
    gamesPlayed: 20,
    conferenceRank: 15,
    leagueRank: 10,
    ranking: null,
    ...overrides,
  };
}

const fixtures = {
  uclRealMadrid: {
    id: 'ucl-real-madrid',
    leagueId: 'ucl',
    homeTeamId: 'real-madrid',
    awayTeamId: 'ucl-opponent',
    startTime: '2026-09-08T13:00:00-06:00',
    eventType: 'regular-season',
  },
  uclMajor: {
    id: 'ucl-major',
    leagueId: 'ucl',
    homeTeamId: 'ucl-a',
    awayTeamId: 'ucl-b',
    startTime: '2026-09-09T13:00:00-06:00',
    eventType: 'regular-season',
    isMajorEvent: true,
  },
  uclKnockout: {
    id: 'ucl-knockout',
    leagueId: 'ucl',
    homeTeamId: 'ucl-a',
    awayTeamId: 'ucl-b',
    startTime: '2026-09-10T13:00:00-06:00',
    eventType: 'knockout',
    competitionPhase: 'knockout',
  },
  uclOrdinary: {
    id: 'ucl-ordinary',
    leagueId: 'ucl',
    homeTeamId: 'ucl-a',
    awayTeamId: 'ucl-b',
    startTime: '2026-09-11T13:00:00-06:00',
    eventType: 'regular-season',
  },
  nflDivisional: {
    id: 'nfl-divisional',
    leagueId: 'nfl',
    homeTeamId: 'nfl-a',
    awayTeamId: 'nfl-b',
    startTime: '2026-09-13T12:00:00-06:00',
    eventType: 'regular-season',
    isDivisional: true,
  },
  nflStrongRecords: {
    id: 'nfl-strong-records',
    leagueId: 'nfl',
    homeTeamId: 'nfl-a',
    awayTeamId: 'nfl-b',
    homeTeam: team({ winPercentage: 0.667 }),
    awayTeam: team({ winPercentage: 0.8 }),
    startTime: '2026-09-14T18:00:00-06:00',
    eventType: 'regular-season',
  },
  nflWeakRecords: {
    id: 'nfl-weak-records',
    leagueId: 'nfl',
    homeTeamId: 'nfl-a',
    awayTeamId: 'nfl-b',
    homeTeam: team({ winPercentage: 0.666 }),
    awayTeam: team({ winPercentage: 0.8 }),
    startTime: '2026-09-15T18:00:00-06:00',
    eventType: 'regular-season',
  },
  nbaQualifying: {
    id: 'nba-qualifying',
    leagueId: 'nba',
    homeTeamId: 'nba-a',
    awayTeamId: 'nba-b',
    homeTeam: team({ gamesPlayed: 20, conferenceRank: 4, winPercentage: 0.75 }),
    awayTeam: team({ gamesPlayed: 20, conferenceRank: 7, winPercentage: 0.7 }),
    startTime: '2026-11-20T19:00:00-06:00',
    eventType: 'regular-season',
  },
  nbaRankedButBelowWinRate: {
    id: 'nba-below-win-rate',
    leagueId: 'nba',
    homeTeamId: 'nba-a',
    awayTeamId: 'nba-b',
    homeTeam: team({ gamesPlayed: 20, conferenceRank: 4, winPercentage: 0.69 }),
    awayTeam: team({ gamesPlayed: 20, conferenceRank: 7, winPercentage: 0.75 }),
    startTime: '2026-11-21T19:00:00-06:00',
    eventType: 'regular-season',
  },
  nbaTopEightTooEarly: {
    id: 'nba-too-early',
    leagueId: 'nba',
    homeTeamId: 'nba-a',
    awayTeamId: 'nba-b',
    homeTeam: team({ gamesPlayed: 9, conferenceRank: 4, winPercentage: 0.75 }),
    awayTeam: team({ gamesPlayed: 9, conferenceRank: 7, winPercentage: 0.75 }),
    startTime: '2026-10-30T19:00:00-06:00',
    eventType: 'regular-season',
  },
  ncaaRanked: {
    id: 'ncaa-ranked',
    leagueId: 'ncaa-football',
    homeTeamId: 'ncaa-a',
    awayTeamId: 'ncaa-b',
    homeTeam: team({ ranking: 24 }),
    awayTeam: team({ ranking: 25 }),
    startTime: '2026-10-03T12:00:00-06:00',
    eventType: 'regular-season',
  },
  ncaaUnranked: {
    id: 'ncaa-unranked',
    leagueId: 'ncaa-football',
    homeTeamId: 'ncaa-a',
    awayTeamId: 'ncaa-b',
    homeTeam: team({ ranking: 24 }),
    awayTeam: team({ ranking: null }),
    startTime: '2026-10-10T12:00:00-06:00',
    eventType: 'regular-season',
  },
  eplTopFive: {
    id: 'epl-top-five',
    leagueId: 'epl',
    homeTeamId: 'epl-a',
    awayTeamId: 'epl-b',
    homeTeam: team({ leagueRank: 4 }),
    awayTeam: team({ leagueRank: 5 }),
    startTime: '2026-11-01T10:00:00-06:00',
    eventType: 'regular-season',
  },
  eplTopSix: {
    id: 'epl-top-six',
    leagueId: 'epl',
    homeTeamId: 'epl-a',
    awayTeamId: 'epl-b',
    homeTeam: team({ leagueRank: 5 }),
    awayTeam: team({ leagueRank: 6 }),
    startTime: '2026-11-02T10:00:00-06:00',
    eventType: 'regular-season',
  },
  laligaTopThree: {
    id: 'laliga-top-three',
    leagueId: 'laliga',
    homeTeamId: 'laliga-a',
    awayTeamId: 'laliga-b',
    homeTeam: team({ leagueRank: 2 }),
    awayTeam: team({ leagueRank: 3 }),
    startTime: '2026-11-03T12:00:00-06:00',
    eventType: 'regular-season',
  },
  laligaFourth: {
    id: 'laliga-fourth',
    leagueId: 'laliga',
    homeTeamId: 'laliga-a',
    awayTeamId: 'laliga-b',
    homeTeam: team({ leagueRank: 3 }),
    awayTeam: team({ leagueRank: 4 }),
    startTime: '2026-11-04T12:00:00-06:00',
    eventType: 'regular-season',
  },
  mlbImplications: {
    id: 'mlb-implications',
    leagueId: 'mlb',
    homeTeamId: 'mlb-a',
    awayTeamId: 'mlb-b',
    startTime: '2026-08-15T18:00:00-06:00',
    eventType: 'regular-season',
    hasPlayoffImplications: true,
  },
  nhlImplications: {
    id: 'nhl-implications',
    leagueId: 'nhl',
    homeTeamId: 'nhl-a',
    awayTeamId: 'nhl-b',
    startTime: '2026-04-10T18:00:00-06:00',
    eventType: 'regular-season',
    hasSeedingImplications: true,
  },
  rivalryNonFavorite: {
    id: 'rivalry-non-favorite',
    leagueId: 'nfl',
    homeTeamId: 'nfl-a',
    awayTeamId: 'nfl-b',
    startTime: '2026-11-15T18:20:00-06:00',
    eventType: 'regular-season',
    isRivalry: true,
  },
  favoriteRivalry: {
    id: 'favorite-rivalry',
    leagueId: 'nhl',
    homeTeamId: 'oilers',
    awayTeamId: 'nhl-rival',
    startTime: '2026-11-16T19:00:00-06:00',
    eventType: 'regular-season',
    isRivalry: true,
  },
  marchMadnessEarly: {
    id: 'march-madness-early',
    leagueId: 'ncaa-basketball',
    homeTeamId: 'college-a',
    awayTeamId: 'college-b',
    startTime: '2027-03-20T12:00:00-06:00',
    eventType: 'tournament',
    competitionId: 'march-madness',
    round: 'round-of-32',
  },
  marchMadnessSweet16: {
    id: 'march-madness-sweet-16',
    leagueId: 'ncaa-basketball',
    homeTeamId: 'college-a',
    awayTeamId: 'college-b',
    startTime: '2027-03-25T18:00:00-06:00',
    eventType: 'tournament',
    competitionId: 'march-madness',
    round: 'sweet-16',
  },
  championship: {
    id: 'championship',
    leagueId: 'nfl',
    homeTeamId: 'nfl-a',
    awayTeamId: 'nfl-b',
    startTime: '2027-02-14T17:30:00-06:00',
    eventType: 'championship',
  },
};

export function runPriorityChecks() {
  assertTier(fixtures.uclRealMadrid, PRIORITY_TIERS.CHAMPIONS_LEAGUE);
  assertTier(fixtures.uclMajor, PRIORITY_TIERS.CHAMPIONS_LEAGUE);
  assertTier(fixtures.uclKnockout, PRIORITY_TIERS.CHAMPIONS_LEAGUE);
  assertTier(fixtures.uclOrdinary, PRIORITY_TIERS.NORMAL);
  assert(isMajorUclGameForPriority(fixtures.uclOrdinary) === false, 'Ordinary UCL game should not be major');

  assertTier(fixtures.nflDivisional, PRIORITY_TIERS.MAJOR_GAME);
  assertTier(fixtures.nflStrongRecords, PRIORITY_TIERS.MAJOR_GAME);
  assertTier(fixtures.nflWeakRecords, PRIORITY_TIERS.NORMAL);

  assertTier(fixtures.nbaQualifying, PRIORITY_TIERS.MAJOR_GAME);
  assertTier(fixtures.nbaRankedButBelowWinRate, PRIORITY_TIERS.NORMAL);
  assertTier(fixtures.nbaTopEightTooEarly, PRIORITY_TIERS.NORMAL);

  assertTier(fixtures.ncaaRanked, PRIORITY_TIERS.MAJOR_GAME);
  assertTier(fixtures.ncaaUnranked, PRIORITY_TIERS.NORMAL);

  assertTier(fixtures.eplTopFive, PRIORITY_TIERS.MAJOR_GAME);
  assertTier(fixtures.eplTopSix, PRIORITY_TIERS.NORMAL);
  assertTier(fixtures.laligaTopThree, PRIORITY_TIERS.MAJOR_GAME);
  assertTier(fixtures.laligaFourth, PRIORITY_TIERS.NORMAL);

  assertTier(fixtures.mlbImplications, PRIORITY_TIERS.MAJOR_GAME);
  assertTier(fixtures.nhlImplications, PRIORITY_TIERS.MAJOR_GAME);
  assertTier(fixtures.rivalryNonFavorite, PRIORITY_TIERS.NORMAL);

  assertTier(fixtures.favoriteRivalry, PRIORITY_TIERS.FAVORITE_TEAM);
  assertTier(fixtures.marchMadnessEarly, PRIORITY_TIERS.NORMAL);
  assertTier(fixtures.marchMadnessSweet16, PRIORITY_TIERS.MAJOR_GAME);
  assertTier(fixtures.championship, PRIORITY_TIERS.MAJOR_EVENT);

  const favoriteOrdinary = {
    ...fixtures.favoriteRivalry,
    id: 'favorite-ordinary',
    isRivalry: false,
    startTime: '2026-11-15T19:00:00-06:00',
  };

  const sortedFavorites = sortGamesByPriority([favoriteOrdinary, fixtures.favoriteRivalry]);
  assert(
    sortedFavorites[0].id === fixtures.favoriteRivalry.id,
    'Favorite-team rivalry should outrank an ordinary favorite-team game',
  );

  const expectedTop = [
    fixtures.uclRealMadrid,
    fixtures.uclMajor,
    fixtures.uclKnockout,
    fixtures.nflDivisional,
    fixtures.nflStrongRecords,
    fixtures.nbaQualifying,
    fixtures.ncaaRanked,
    fixtures.eplTopFive,
    fixtures.laligaTopThree,
    fixtures.mlbImplications,
    fixtures.nhlImplications,
    fixtures.rivalryNonFavorite,
    fixtures.marchMadnessEarly,
  ];

  const majorOnly = expectedTop.filter((game) => isMajorGameForPriority(game));
  assert(majorOnly.length === 10, `Expected 10 strict major fixtures, got ${majorOnly.length}`);

  return true;
}

runPriorityChecks();
