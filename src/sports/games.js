import { teams } from './types';

const teamIds = new Set(teams.map((team) => team.id));

/**
 * Normalized game record used by the calendar and priority engine.
 *
 * Team references use stable IDs so mock data can later be replaced by a
 * live sports API without changing the UI contract.
 */
export const games = [
  {
    id: 'ucl-test-1',
    leagueId: 'ucl',
    homeTeamId: 'real-madrid',
    awayTeamId: 'ucl-opponent-1',
    startTime: '2026-09-08T13:00:00-06:00',
    venue: 'Santiago Bernabeu',
    status: 'scheduled',
    eventType: 'regular-season',
  },
  {
    id: 'oregon-test-1',
    leagueId: 'ncaa-football',
    homeTeamId: 'oregon-ducks',
    awayTeamId: 'oregon-opponent',
    startTime: '2026-09-09T19:00:00-06:00',
    status: 'scheduled',
    eventType: 'regular-season',
  },
  {
    id: 'tottenham-test-1',
    leagueId: 'epl',
    homeTeamId: 'tottenham',
    awayTeamId: 'epl-opponent',
    startTime: '2026-09-10T12:30:00-06:00',
    status: 'scheduled',
    eventType: 'regular-season',
  },
  {
    id: 'ufc-test-1',
    leagueId: 'ufc',
    startTime: '2026-09-12T20:00:00-06:00',
    status: 'scheduled',
    eventType: 'main-card',
  },
  {
    id: 'kings-test-1',
    leagueId: 'nba',
    homeTeamId: 'sac-kings',
    awayTeamId: 'nba-opponent',
    startTime: '2026-10-20T19:00:00-06:00',
    status: 'scheduled',
    eventType: 'regular-season',
  },
  {
    id: 'blue-jays-test-1',
    leagueId: 'mlb',
    homeTeamId: 'blue-jays',
    awayTeamId: 'mlb-opponent',
    startTime: '2026-09-15T18:00:00-06:00',
    status: 'scheduled',
    eventType: 'regular-season',
  },
  {
    id: 'oilers-test-1',
    leagueId: 'nhl',
    homeTeamId: 'oilers',
    awayTeamId: 'nhl-opponent',
    startTime: '2026-10-15T19:00:00-06:00',
    status: 'scheduled',
    eventType: 'regular-season',
  },
  {
    id: 'super-bowl-test-1',
    leagueId: 'nfl',
    startTime: '2027-02-14T17:30:00-06:00',
    status: 'scheduled',
    eventType: 'championship',
    isMajorEvent: true,
  },
  {
    id: 'rivalry-test-1',
    leagueId: 'nfl',
    homeTeamId: 'nfl-home-rival',
    awayTeamId: 'nfl-away-rival',
    startTime: '2026-11-15T18:20:00-06:00',
    status: 'scheduled',
    eventType: 'regular-season',
    isRivalry: true,
  },
  {
    id: 'normal-test-1',
    leagueId: 'nba',
    homeTeamId: 'nba-home',
    awayTeamId: 'nba-away',
    startTime: '2026-10-22T19:00:00-06:00',
    status: 'scheduled',
    eventType: 'regular-season',
  },
];

export function validateGame(game) {
  if (!game.id || !game.leagueId || !game.startTime || !game.status || !game.eventType) {
    return false;
  }

  if (game.homeTeamId && game.homeTeamId === game.awayTeamId) {
    return false;
  }

  if (game.homeTeamId && !teamIds.has(game.homeTeamId) && !game.homeTeamId.includes('-opponent') && !game.homeTeamId.includes('-rival') && !game.homeTeamId.includes('-home')) {
    return false;
  }

  return true;
}

export const validGames = games.filter(validateGame);
