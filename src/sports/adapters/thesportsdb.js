import { normalizeGames } from './normalizer.js';

export const THESPORTSDB_LEAGUES = [
  { id: 'nfl', providerId: '4391', name: 'NFL' },
  { id: 'nba', providerId: '4387', name: 'NBA' },
  { id: 'ncaa-football', providerId: '4479', name: 'NCAA Football' },
  { id: 'ucl', providerId: '4480', name: 'UEFA Champions League' },
  { id: 'laliga', providerId: '4335', name: 'Spanish La Liga' },
  { id: 'epl', providerId: '4328', name: 'English Premier League' },
  { id: 'mlb', providerId: '4424', name: 'MLB' },
  { id: 'nhl', providerId: '4380', name: 'NHL' },
  { id: 'ufc', providerId: '4443', name: 'UFC' },
];

const FAVORITE_TEAM_ALIASES = {
  'sacramento kings': 'sac-kings',
  'oregon': 'oregon-ducks',
  'oregon ducks': 'oregon-ducks',
  'real madrid': 'real-madrid',
  'tottenham hotspur': 'tottenham',
  'tottenham': 'tottenham',
  'toronto blue jays': 'blue-jays',
  'toronto': 'blue-jays',
  'edmonton oilers': 'oilers',
  'edmonton': 'oilers',
};

function teamId(name, providerId, leagueId) {
  const alias = FAVORITE_TEAM_ALIASES[String(name ?? '').trim().toLowerCase()];
  return alias ?? `tsdb:${leagueId}:${providerId}`;
}

function inferEventType(raw, leagueId) {
  if (leagueId === 'ufc') return 'main-card';

  const text = `${raw.strEvent ?? ''} ${raw.strEventAlternate ?? ''} ${raw.strStatus ?? ''} ${raw.strPostponed ?? ''}`.toLowerCase();
  const round = String(raw.intRound ?? raw.strRound ?? '').toLowerCase();

  if (text.includes('championship') || text.includes('final')) return 'championship';
  if (text.includes('playoff') || round.includes('playoff')) return 'playoff';
  if (text.includes('knockout') || round.includes('quarter') || round.includes('semi')) return 'knockout';
  return 'regular-season';
}

function inferCompetitionPhase(raw, leagueId) {
  if (leagueId !== 'ucl') return undefined;
  const text = `${raw.strEvent ?? ''} ${raw.strEventAlternate ?? ''} ${raw.intRound ?? ''} ${raw.strRound ?? ''}`.toLowerCase();
  if (text.includes('final') || text.includes('semi') || text.includes('quarter') || text.includes('round of')) return 'knockout';
  return undefined;
}

function toProviderGame(raw, league) {
  const homeName = raw.strHomeTeam ?? '';
  const awayName = raw.strAwayTeam ?? '';
  const eventType = inferEventType(raw, league.id);

  return {
    id: `tsdb:${raw.idEvent}`,
    leagueId: league.id,
    homeTeamId: teamId(homeName, raw.idHomeTeam, league.id),
    awayTeamId: teamId(awayName, raw.idAwayTeam, league.id),
    startTime: raw.strTimestamp ?? `${raw.dateEvent ?? ''}T${raw.strTime ?? '00:00:00'}`,
    venue: raw.strVenue,
    status: raw.strStatus === 'FT' || raw.strStatus === 'AET' || raw.strStatus === 'PEN' ? 'final' : 'scheduled',
    eventType,
    round: raw.intRound ?? raw.strRound,
    competitionId: league.id,
    competitionPhase: inferCompetitionPhase(raw, league.id),
    isElimination: league.id === 'ucl' && inferCompetitionPhase(raw, league.id) === 'knockout',
    isMajorEvent: eventType === 'championship' || eventType === 'final',
    homeTeam: { id: teamId(homeName, raw.idHomeTeam, league.id), name: homeName, leagueId: league.id },
    awayTeam: { id: teamId(awayName, raw.idAwayTeam, league.id), name: awayName, leagueId: league.id },
  };
}

export function normalizeTheSportsDbEvents(events, league) {
  const filtered = league.id === 'ufc'
    ? events.filter((event) => /^ufc\b/i.test(String(event.strEvent ?? '').trim()))
    : events;

  return normalizeGames(filtered.map((event) => toProviderGame(event, league)));
}

export function getTheSportsDbLeague(id) {
  return THESPORTSDB_LEAGUES.find((league) => league.id === id);
}
