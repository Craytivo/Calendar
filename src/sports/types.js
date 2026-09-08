export const PRIORITY_TIERS = {
  CHAMPIONS_LEAGUE: 0,
  MUST_SEE: 1,
  FAVORITE_TEAM: 2,
  MAJOR_EVENT: 3,
  NFL_REGULAR: 4,
  MAJOR_GAME: 5,
  NORMAL: 6,
};

export const teams = [
  { id: 'sac-kings', name: 'Sacramento Kings', abbreviation: 'SAC', leagueId: 'nba', favorite: true, favoriteTier: 'favorite' },
  { id: 'oregon-ducks', name: 'Oregon', abbreviation: 'ORE', leagueId: 'ncaa-football', favorite: true, favoriteTier: 'must-see' },
  { id: 'kansas-state-wildcats', name: 'Kansas State', abbreviation: 'KSU', leagueId: 'ncaa-football', favorite: true, favoriteTier: 'favorite' },
  { id: 'real-madrid', name: 'Real Madrid', abbreviation: 'RMA', leagueId: 'laliga', favorite: true, favoriteTier: 'must-see' },
  { id: 'tottenham', name: 'Tottenham Hotspur', abbreviation: 'TOT', leagueId: 'epl', favorite: true, favoriteTier: 'must-see' },
  { id: 'blue-jays', name: 'Toronto Blue Jays', abbreviation: 'TOR', leagueId: 'mlb', favorite: true, favoriteTier: 'favorite' },
  { id: 'dodgers', name: 'Los Angeles Dodgers', abbreviation: 'LAD', leagueId: 'mlb', favorite: true, favoriteTier: 'favorite' },
  { id: 'oilers', name: 'Edmonton Oilers', abbreviation: 'EDM', leagueId: 'nhl', favorite: true, favoriteTier: 'favorite' },
  { id: 'vikings', name: 'Minnesota Vikings', abbreviation: 'MIN', leagueId: 'nfl', favorite: true, favoriteTier: 'favorite' },
];
