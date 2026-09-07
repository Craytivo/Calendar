import { normalizeGames } from './normalizer.js';

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports';

const LEAGUE_CONFIG = {
  nfl: { sport: 'football', league: 'nfl' },
  nba: { sport: 'basketball', league: 'nba' },
  'ncaa-football': { sport: 'football', league: 'college-football' },
  mlb: { sport: 'baseball', league: 'mlb' },
  nhl: { sport: 'hockey', league: 'nhl' },
  ufc: { sport: 'mma', league: 'ufc' },
  epl: { sport: 'soccer', league: 'eng.1' },
  'epl-cup': { sport: 'soccer', league: 'eng.league_cup' },
  laliga: { sport: 'soccer', league: 'esp.1' },
  ucl: { sport: 'soccer', league: 'uefa.champions' },
};

const FAVORITE_TEAM_IDS = {
  'Sacramento Kings': 'sac-kings',
  'Oregon Ducks': 'oregon-ducks',
  Oregon: 'oregon-ducks',
  'Real Madrid': 'real-madrid',
  Tottenham: 'tottenham',
  'Tottenham Hotspur': 'tottenham',
  'Toronto Blue Jays': 'blue-jays',
  'Edmonton Oilers': 'oilers',
};

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function cleanName(name = '') {
  return String(name).replace(/\s+/g, ' ').trim();
}

function favoriteIdFor(name = '') {
  const normalized = cleanName(name);
  return FAVORITE_TEAM_IDS[normalized] || undefined;
}

function teamFromCompetitor(competitor, leagueId) {
  const rawName = cleanName(competitor?.team?.displayName || competitor?.team?.name || competitor?.athlete?.displayName || competitor?.displayName);
  const favoriteId = favoriteIdFor(rawName);
  const team = competitor?.team || competitor?.athlete || competitor || {};
  const id = favoriteId || String(team.id || competitor?.id || rawName).trim();
  const abbreviation = cleanName(team.abbreviation || competitor?.abbreviation || rawName).toUpperCase();
  const logoUrl = team.logo || team.logos?.[0]?.href;
  const primaryColor = team.color || team.colors?.primary;
  return {
    id,
    name: rawName,
    abbreviation,
    leagueId,
    ...(favoriteId ? { favorite: true } : {}),
    ...(logoUrl ? { logoUrl } : {}),
    ...(primaryColor ? { primaryColor } : {}),
  };
}

function eventTypeFor(event) {
  const competition = event?.competitions?.[0];
  const seasonType = String(event?.season?.slug || event?.season?.type?.slug || '').toLowerCase();
  const typeText = [event?.type?.text, event?.type?.name, event?.status?.type?.name, seasonType].join(' ').toLowerCase();
  if (typeText.includes('championship') || typeText.includes('final')) return 'championship';
  if (typeText.includes('playoff') || typeText.includes('postseason') || typeText.includes('knockout')) return 'playoff';
  if (competition?.type?.abbreviation === 'STD') return 'regular-season';
  return 'regular-season';
}

function statusFor(event) {
  const status = event?.status?.type;
  if (status?.completed) return 'final';
  if (status?.state === 'in') return 'live';
  if (status?.name === 'STATUS_POSTPONED') return 'postponed';
  if (status?.name === 'STATUS_CANCELED') return 'cancelled';
  return 'scheduled';
}

function mapEvent(event, leagueId) {
  const competition = event?.competitions?.[0];
  const competitors = competition?.competitors || [];
  const home = competitors.find((item) => item.homeAway === 'home') || competitors[1];
  const away = competitors.find((item) => item.homeAway === 'away') || competitors[0];
  if (!home || !away || !event?.date) return null;

  const homeTeam = teamFromCompetitor(home, leagueId);
  const awayTeam = teamFromCompetitor(away, leagueId);
  const scores = new Map(competitors.map((item) => [item.id, item.score]));
  const isCup = leagueId === 'epl-cup';
  const normalizedLeagueId = isCup ? 'epl' : leagueId;

  return {
    id: `espn:${leagueId}:${event.id}`,
    leagueId: normalizedLeagueId,
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
    startTime: event.date,
    venue: competition?.venue?.fullName || competition?.venue?.address?.city,
    status: statusFor(event),
    eventType: eventTypeFor(event),
    round: event?.week?.text || event?.season?.slug,
    competitionId: competition?.id || event?.id,
    competitionPhase: event?.season?.type?.slug,
    isMajorEvent: Boolean(event?.league?.isTournament || event?.isPostseason || isCup),
    isElimination: Boolean(event?.isElimination),
    ...(isCup ? { competitionName: 'Carabao Cup' } : {}),
    homeTeam: { ...homeTeam, ...(scores.get(home.id) != null ? { score: Number(scores.get(home.id)) } : {}) },
    awayTeam: { ...awayTeam, ...(scores.get(away.id) != null ? { score: Number(scores.get(away.id)) } : {}) },
  };
}

export async function fetchEspnLeagueWindow(leagueId, startDate, days = 7) {
  const config = LEAGUE_CONFIG[leagueId];
  if (!config) throw new Error(`Unsupported ESPN league: ${leagueId}`);

  const endDate = addDays(startDate, days - 1);
  const url = `${ESPN_BASE}/${config.sport}/${config.league}/scoreboard?dates=${dateKey(startDate)}-${dateKey(endDate)}`;
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`ESPN ${leagueId} returned ${response.status}`);
  const payload = await response.json();
  const events = Array.isArray(payload?.events) ? payload.events : [];
  return normalizeGames(events.map((event) => mapEvent(event, leagueId)).filter(Boolean));
}
