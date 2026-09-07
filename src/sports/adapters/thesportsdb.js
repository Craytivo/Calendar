import { normalizeGames } from './normalizer.js';
import { applyUclTieContext, inferUclLeg, isUclKnockoutStage, normalizeUclStage } from './soccer-context.js';

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
  'sacramento kings': 'sac-kings', 'oregon': 'oregon-ducks', 'oregon ducks': 'oregon-ducks',
  'real madrid': 'real-madrid', 'tottenham hotspur': 'tottenham', 'tottenham': 'tottenham',
  'toronto blue jays': 'blue-jays', 'toronto': 'blue-jays', 'edmonton oilers': 'oilers', 'edmonton': 'oilers',
};

function teamId(name, providerId, leagueId) {
  const alias = FAVORITE_TEAM_ALIASES[String(name ?? '').trim().toLowerCase()];
  return alias ?? `tsdb:${leagueId}:${providerId}`;
}

function inferEventType(raw, leagueId, uclStage) {
  if (leagueId === 'ufc') return 'main-card';
  const text = `${raw.strEvent ?? ''} ${raw.strEventAlternate ?? ''} ${raw.strStatus ?? ''} ${raw.strPostponed ?? ''}`.toLowerCase();
  const round = String(raw.intRound ?? raw.strRound ?? '').toLowerCase();
  if (text.includes('championship') || text.includes('final') || uclStage === 'final') return 'championship';
  if (text.includes('playoff') || round.includes('playoff')) return 'playoff';
  if (uclStage && isUclKnockoutStage(uclStage)) return 'knockout';
  if (text.includes('knockout') || round.includes('quarter') || round.includes('semi')) return 'knockout';
  return 'regular-season';
}

function cleanUrl(value) {
  const url = String(value ?? '').trim();
  return /^https?:\/\//i.test(url) ? url : undefined;
}

function providerTeam(rawName, providerId, leagueId, raw = {}) {
  return {
    id: teamId(rawName, providerId, leagueId),
    name: rawName,
    leagueId,
    ...(cleanUrl(raw.strTeamBadge || raw.strTeamLogo || raw.strBadge) ? { logoUrl: cleanUrl(raw.strTeamBadge || raw.strTeamLogo || raw.strBadge) } : {}),
    ...(raw.strColour1 ? { primaryColor: String(raw.strColour1).trim() } : {}),
  };
}

function toProviderGame(raw, league) {
  const homeName = raw.strHomeTeam ?? '';
  const awayName = raw.strAwayTeam ?? '';
  const startTime = raw.strTimestamp ?? `${raw.dateEvent ?? ''}T${raw.strTime ?? '00:00:00'}`;
  const uclStage = league.id === 'ucl' ? normalizeUclStage(raw, startTime) : undefined;
  const eventType = inferEventType(raw, league.id, uclStage);
  const knockout = league.id === 'ucl' && isUclKnockoutStage(uclStage);
  const leg = league.id === 'ucl' && knockout ? inferUclLeg(raw) : undefined;
  const homeTeam = providerTeam(homeName, raw.idHomeTeam, league.id, { strTeamBadge: raw.strHomeTeamBadge, strTeamLogo: raw.strHomeTeamLogo, strBadge: raw.strHomeTeamBadge, strColour1: raw.strHomeTeamColor });
  const awayTeam = providerTeam(awayName, raw.idAwayTeam, league.id, { strTeamBadge: raw.strAwayTeamBadge, strTeamLogo: raw.strAwayTeamLogo, strBadge: raw.strAwayTeamBadge, strColour1: raw.strAwayTeamColor });

  return {
    id: `tsdb:${raw.idEvent}`, leagueId: league.id,
    homeTeamId: homeTeam.id, awayTeamId: awayTeam.id, startTime, venue: raw.strVenue,
    status: raw.strStatus === 'FT' || raw.strStatus === 'AET' || raw.strStatus === 'PEN' ? 'final' : 'scheduled',
    eventType, round: raw.intRound ?? raw.strRound, competitionId: league.id,
    competitionPhase: uclStage === 'league-phase' ? 'league-phase' : uclStage === 'qualifying' ? 'qualifying' : knockout ? 'knockout' : undefined,
    uclStage, isTwoLegTie: knockout,
    ...(leg !== undefined ? { leg, isFirstLeg: leg === 1, isSecondLeg: leg === 2 } : {}),
    isElimination: knockout, isMajorEvent: eventType === 'championship' || eventType === 'final', homeTeam, awayTeam,
  };
}

export function normalizeTheSportsDbEvents(events, league) {
  const filtered = league.id === 'ufc' ? events.filter((event) => /^ufc\b/i.test(String(event.strEvent ?? '').trim())) : events;
  const normalized = normalizeGames(filtered.map((event) => toProviderGame(event, league)));
  return league.id === 'ucl' ? applyUclTieContext(normalized) : normalized;
}

export function getTheSportsDbLeague(id) { return THESPORTSDB_LEAGUES.find((league) => league.id === id); }
