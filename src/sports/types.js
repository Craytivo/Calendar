export const PRIORITY_TIERS = {
  CHAMPIONS_LEAGUE: 0,
  MUST_SEE: 1,
  FAVORITE_TEAM: 2,
  MAJOR_EVENT: 3,
  MAJOR_GAME: 4,
  NORMAL: 5,
};

/**
 * A normalized team record. Keeping team IDs stable lets us replace mock
 * data with a live sports API later without rewriting the UI.
 */
export const teams = [
  {
    id: 'sac-kings',
    name: 'Sacramento Kings',
    abbreviation: 'SAC',
    leagueId: 'nba',
    favorite: true,
    favoriteTier: 'favorite',
  },
  {
    id: 'oregon-ducks',
    name: 'Oregon',
    abbreviation: 'ORE',
    leagueId: 'ncaa-football',
    favorite: true,
    favoriteTier: 'must-see',
  },
  {
    id: 'real-madrid',
    name: 'Real Madrid',
    abbreviation: 'RMA',
    leagueId: 'laliga',
    favorite: true,
    favoriteTier: 'must-see',
  },
  {
    id: 'tottenham',
    name: 'Tottenham Hotspur',
    abbreviation: 'TOT',
    leagueId: 'epl',
    favorite: true,
    favoriteTier: 'must-see',
  },
  {
    id: 'blue-jays',
    name: 'Toronto Blue Jays',
    abbreviation: 'TOR',
    leagueId: 'mlb',
    favorite: true,
    favoriteTier: 'favorite',
  },
  {
    id: 'oilers',
    name: 'Edmonton Oilers',
    abbreviation: 'EDM',
    leagueId: 'nhl',
    favorite: true,
    favoriteTier: 'favorite',
  },
];
