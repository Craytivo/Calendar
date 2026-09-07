import { normalizeGames } from './normalizer.js';

const ESPN_STANDINGS = {
  nfl: { sport: 'football', league: 'nfl', seasonType: '2' },
  nba: { sport: 'basketball', league: 'nba', seasonType: '2' },
  'ncaa-football': { sport: 'football', league: 'college-football', seasonType: '2' },
  mlb: { sport: 'baseball', league: 'mlb', seasonType: '2' },
  nhl: { sport: 'hockey', league: 'nhl', seasonType: '2' },
};

const FAVORITE_TEAM_NAMES = {
  'sacramento kings': 'sac-kings', oregon: 'oregon-ducks', 'oregon ducks': 'oregon-ducks',
  'real madrid': 'real-madrid', tottenham: 'tottenham', 'tottenham hotspur': 'tottenham',
  'toronto blue jays': 'blue-jays', 'edmonton oilers': 'oilers',
};

const NFL_DIVISIONS = {
  'buffalo bills': 'AFC East', 'miami dolphins': 'AFC East', 'new england patriots': 'AFC East', 'new york jets': 'AFC East',
  'baltimore ravens': 'AFC North', 'cincinnati bengals': 'AFC North', 'cleveland browns': 'AFC North', 'pittsburgh steelers': 'AFC North',
  'houston texans': 'AFC South', 'indianapolis colts': 'AFC South', 'jacksonville jaguars': 'AFC South', 'tennessee titans': 'AFC South',
  'denver broncos': 'AFC West', 'kansas city chiefs': 'AFC West', 'las vegas raiders': 'AFC West', 'los angeles chargers': 'AFC West',
  'dallas cowboys': 'NFC East', 'new york giants': 'NFC East', 'philadelphia eagles': 'NFC East', 'washington commanders': 'NFC East',
  'chicago bears': 'NFC North', 'detroit lions': 'NFC North', 'green bay packers': 'NFC North', 'minnesota vikings': 'NFC North',
  'atlanta falcons': 'NFC South', 'carolina panthers': 'NFC South', 'new orleans saints': 'NFC South', 'tampa bay buccaneers': 'NFC South',
  'arizona cardinals': 'NFC West', 'los angeles rams': 'NFC West', 'san francisco 49ers': 'NFC West', 'seattle seahawks': 'NFC West',
};

function clean(value) { return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' '); }
function number(value) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : undefined; }
function stat(entry, names) {
  const stats = entry.stats ?? [];
  for (const name of names) {
    const item = stats.find((candidate) => clean(candidate.name ?? candidate.shortDisplayName) === clean(name));
    if (item) return item.value ?? item.displayValue;
  }
  return undefined;
}

function normalizeEntry(entry, group) {
  const team = entry.team ?? {};
  const name = team.displayName ?? team.shortDisplayName ?? team.name ?? '';
  const wins = number(stat(entry, ['wins', 'win']));
  const losses = number(stat(entry, ['losses', 'loss']));
  const ties = number(stat(entry, ['ties', 'tie'])) ?? 0;
  const gamesPlayed = number(stat(entry, ['gamesPlayed', 'games'])) ?? (wins !== undefined && losses !== undefined ? wins + losses + ties : undefined);
  const winPercentage = number(stat(entry, ['winPercent', 'winPct', 'winningPercentage', 'winpercentage'])) ?? (wins !== undefined && gamesPlayed ? (wins + ties * 0.5) / gamesPlayed : undefined);
  const rank = number(stat(entry, ['rank', 'leagueRank', 'standing', 'position']));
  const conferenceRank = number(stat(entry, ['conferenceRank', 'confRank', 'conferencePosition', 'playoffSeed']));
  const playoffSeed = number(stat(entry, ['playoffSeed', 'seed']));
  const gamesBehind = number(stat(entry, ['gamesBehind', 'gb']));
  const playoffStatus = clean(entry.note ?? entry.status?.name ?? entry.status?.type);

  return {
    id: FAVORITE_TEAM_NAMES[clean(name)] ?? `espn:${team.id ?? clean(name)}`,
    providerId: team.id,
    name,
    abbreviation: team.abbreviation,
    wins,
    losses,
    ties,
    gamesPlayed,
    winPercentage,
    ranking: number(stat(entry, ['apRank', 'rank', 'pollRank', 'currentRank'])) ?? number(entry.rank),
    leagueRank: rank,
    conferenceRank: conferenceRank ?? playoffSeed,
    playoffSeed,
    gamesBehind,
    conference: group?.abbreviation ?? group?.name,
    division: clean(name) in NFL_DIVISIONS ? NFL_DIVISIONS[clean(name)] : group?.name,
    playoffStatus,
  };
}

function getEntries(payload) {
  return (payload?.groups ?? []).flatMap((group) => (group.entries ?? []).map((entry) => normalizeEntry(entry, group)));
}

function isLateSeason(game) {
  const date = new Date(game.startTime);
  if (Number.isNaN(date.getTime())) return false;
  return (game.leagueId === 'nfl' && date.getMonth() >= 11) ||
    (game.leagueId === 'nba' && (date.getMonth() <= 3 || date.getMonth() >= 10)) ||
    (game.leagueId === 'mlb' && date.getMonth() >= 8) ||
    (game.leagueId === 'nhl' && date.getMonth() >= 3);
}

function maturityFor(leagueId) {
  if (leagueId === 'nfl') return 8;
  if (leagueId === 'nba') return 50;
  if (leagueId === 'mlb') return 100;
  if (leagueId === 'nhl') return 50;
  return 0;
}

function cutoffFor(leagueId) {
  if (leagueId === 'nfl') return 7;
  if (leagueId === 'nba') return 8;
  if (leagueId === 'nhl') return 8;
  if (leagueId === 'mlb') return 12;
  return undefined;
}

function significantPlayoffRace(game) {
  if (!['nfl', 'nba', 'mlb', 'nhl'].includes(game.leagueId)) return false;
  const home = game.homeTeam;
  const away = game.awayTeam;
  const cutoff = cutoffFor(game.leagueId);
  const maturity = maturityFor(game.leagueId);
  if (!home || !away || !cutoff || (home.gamesPlayed ?? 0) < maturity || (away.gamesPlayed ?? 0) < maturity) return false;

  const ranks = [home.conferenceRank ?? home.leagueRank, away.conferenceRank ?? away.leagueRank].filter((value) => Number.isFinite(value));
  if (ranks.length !== 2) return false;

  const bothNearCutoff = ranks.every((rank) => rank >= cutoff - 2 && rank <= cutoff + 2);
  return bothNearCutoff || (isLateSeason(game) && ranks.some((rank) => rank <= cutoff + 1));
}

function enrichGame(game, standingsByName) {
  const lookup = (team) => {
    if (!team) return team;
    const context = standingsByName.get(clean(team.name));
    return context ? { ...team, ...context, id: team.id } : team;
  };
  const homeTeam = lookup(game.homeTeam);
  const awayTeam = lookup(game.awayTeam);
  const isDivisional = Boolean(homeTeam?.division && awayTeam?.division && homeTeam.division === awayTeam.division);
  const enriched = { ...game, homeTeam, awayTeam, isDivisional: game.leagueId === 'nfl' ? isDivisional : game.isDivisional };

  if (['nfl', 'nba', 'mlb', 'nhl'].includes(game.leagueId)) {
    enriched.hasPlayoffImplications = Boolean(
      game.hasPlayoffImplications ||
      homeTeam?.playoffStatus?.includes('clinched') ||
      awayTeam?.playoffStatus?.includes('clinched') ||
      significantPlayoffRace(enriched),
    );
  }
  return enriched;
}

export async function fetchEspnStandings(leagueId, year = new Date().getFullYear()) {
  const config = ESPN_STANDINGS[leagueId];
  if (!config) return [];
  const url = new URL(`https://site.api.espn.com/apis/v2/sports/${config.sport}/${config.league}/standings`);
  url.searchParams.set('season', String(year));
  url.searchParams.set('seasontype', config.seasonType);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`ESPN standings returned ${response.status}`);
  return getEntries(await response.json());
}

export async function enrichGamesWithEspnStandings(games, year = new Date().getFullYear()) {
  const leagueIds = [...new Set(games.map((game) => game.leagueId))].filter((leagueId) => ESPN_STANDINGS[leagueId]);
  const results = await Promise.allSettled(leagueIds.map(async (leagueId) => [leagueId, await fetchEspnStandings(leagueId, year)]));
  const byLeague = new Map();
  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    const [leagueId, entries] = result.value;
    byLeague.set(leagueId, new Map(entries.map((entry) => [clean(entry.name), entry])));
  }
  return normalizeGames(games.map((game) => enrichGame(game, byLeague.get(game.leagueId) ?? new Map())));
}

export { ESPN_STANDINGS };
