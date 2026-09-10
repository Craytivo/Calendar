import { resolveCanonicalTeamId } from '../team-identity.js';

const ESPN_STANDINGS = {
  nfl: { sport: 'football', league: 'nfl', seasonType: '2' },
  nba: { sport: 'basketball', league: 'nba', seasonType: '2' },
  'ncaa-football': { sport: 'football', league: 'college-football', seasonType: '2' },
  mlb: { sport: 'baseball', league: 'mlb', seasonType: '2' },
  nhl: { sport: 'hockey', league: 'nhl', seasonType: '2' },
};
const ESPN_BASE = 'https://site.api.espn.com/apis/v2/sports';
const ESPN_FALLBACK_BASE = 'https://site.web.api.espn.com/apis/v2/sports';
const ESPN_HEADERS = { Accept: 'application/json', 'User-Agent': 'Craytivo Sports Calendar/1.0' };
const STANDINGS_CACHE_SECONDS = 600;
const standingsCache = new Map();
const standingsInflight = new Map();
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
function stat(entry, names) { for (const name of names) { const item = (entry.stats ?? []).find((candidate) => clean(candidate.name ?? candidate.shortDisplayName) === clean(name)); if (item) return item.value ?? item.displayValue; } return undefined; }
function normalizeEntry(entry, group) {
  const team = entry.team ?? {}, name = team.displayName ?? team.shortDisplayName ?? team.name ?? '', canonicalId = resolveCanonicalTeamId({ name, abbreviation: team.abbreviation });
  const wins = number(stat(entry, ['wins', 'win'])), losses = number(stat(entry, ['losses', 'loss'])), ties = number(stat(entry, ['ties', 'tie'])) ?? 0;
  const gamesPlayed = number(stat(entry, ['gamesPlayed', 'games'])) ?? (wins !== undefined && losses !== undefined ? wins + losses + ties : undefined);
  const winPercentage = number(stat(entry, ['winPercent', 'winPct', 'winningPercentage', 'winpercentage'])) ?? (wins !== undefined && gamesPlayed ? (wins + ties * 0.5) / gamesPlayed : undefined);
  const rank = number(stat(entry, ['rank', 'leagueRank', 'standing', 'position'])), conferenceRank = number(stat(entry, ['conferenceRank', 'confRank', 'conferencePosition', 'playoffSeed']));
  const playoffSeed = number(stat(entry, ['playoffSeed', 'seed'])), gamesBehind = number(stat(entry, ['gamesBehind', 'gb']));
  return { id: canonicalId ?? `espn:${team.id ?? clean(name)}`, providerId: team.id, name, abbreviation: team.abbreviation, wins, losses, ties, gamesPlayed, winPercentage, ranking: number(stat(entry, ['apRank', 'rank', 'pollRank', 'currentRank'])) ?? number(entry.rank), leagueRank: rank, conferenceRank: conferenceRank ?? playoffSeed, playoffSeed, gamesBehind, conference: group?.abbreviation ?? group?.name, division: NFL_DIVISIONS[clean(name)] ?? group?.name, playoffStatus: clean(entry.note ?? entry.status?.name ?? entry.status?.type) };
}
function getEntries(payload) { return (payload?.groups ?? []).flatMap((group) => (group.entries ?? []).map((entry) => normalizeEntry(entry, group))); }
function isLateSeason(game) { const date = new Date(game.startTime); if (Number.isNaN(date.getTime())) return false; return (game.leagueId === 'nfl' && date.getMonth() >= 11) || (game.leagueId === 'nba' && (date.getMonth() <= 3 || date.getMonth() >= 10)) || (game.leagueId === 'mlb' && date.getMonth() >= 8) || (game.leagueId === 'nhl' && date.getMonth() >= 3); }
function maturityFor(leagueId) { if (leagueId === 'nfl') return 8; if (leagueId === 'nba') return 50; if (leagueId === 'mlb') return 100; if (leagueId === 'nhl') return 50; return 0; }
function cutoffFor(leagueId) { if (leagueId === 'nfl') return 7; if (leagueId === 'nba') return 8; if (leagueId === 'nhl') return 8; if (leagueId === 'mlb') return 12; return undefined; }
function significantPlayoffRace(game) { if (!['nfl', 'nba', 'mlb', 'nhl'].includes(game.leagueId)) return false; const home = game.homeTeam, away = game.awayTeam, cutoff = cutoffFor(game.leagueId), maturity = maturityFor(game.leagueId); if (!home || !away || !cutoff || (home.gamesPlayed ?? 0) < maturity || (away.gamesPlayed ?? 0) < maturity) return false; const ranks = [home.conferenceRank ?? home.leagueRank, away.conferenceRank ?? away.leagueRank].filter((value) => Number.isFinite(value)); if (ranks.length !== 2) return false; return ranks.every((rank) => rank >= cutoff - 2 && rank <= cutoff + 2) || (isLateSeason(game) && ranks.some((rank) => rank <= cutoff + 1)); }
function enrichGame(game, standingsByName) { const lookup = (team) => { if (!team) return team; const canonicalId = resolveCanonicalTeamId(team), context = standingsByName.get(canonicalId) ?? standingsByName.get(clean(team.name)); return context ? { ...team, ...context, id: canonicalId ?? team.id } : { ...team, id: canonicalId ?? team.id }; }; const homeTeam = lookup(game.homeTeam), awayTeam = lookup(game.awayTeam); const isDivisional = Boolean(homeTeam?.division && awayTeam?.division && homeTeam.division === awayTeam.division); const enriched = { ...game, homeTeam, awayTeam, isDivisional: game.leagueId === 'nfl' ? isDivisional : game.isDivisional }; if (['nfl', 'nba', 'mlb', 'nhl'].includes(game.leagueId)) enriched.hasPlayoffImplications = Boolean(game.hasPlayoffImplications || significantPlayoffRace(enriched)); return enriched; }
function fallbackUrlFor(url) { return url.replace(ESPN_BASE, ESPN_FALLBACK_BASE); }
function shouldTryFallback(error) { return error?.status === 403 || error?.name === 'TypeError' || /Network connection lost|fetch failed/i.test(error?.message || ''); }
async function requestJson(url) { const started = Date.now(), response = await fetch(url, { headers: ESPN_HEADERS }), durationMs = Date.now() - started; if (!response.ok) { const error = new Error(`ESPN standings returned ${response.status}`); error.status = response.status; error.durationMs = durationMs; throw error; } return { data: await response.json(), durationMs }; }
async function fetchJson(url) { try { return { ...(await requestJson(url)), provider: 'ESPN primary' }; } catch (primaryError) { if (!shouldTryFallback(primaryError)) throw primaryError; await new Promise((resolve) => setTimeout(resolve, 150)); try { return { ...(await requestJson(fallbackUrlFor(url))), provider: 'ESPN fallback' }; } catch (fallbackError) { const error = new Error(`${primaryError.message}; fallback ${fallbackError.message}`); error.status = fallbackError.status || primaryError.status; error.durationMs = (primaryError.durationMs || 0) + (fallbackError.durationMs || 0); throw error; } } }
function standingsUrl(leagueId, year) { const config = ESPN_STANDINGS[leagueId], url = new URL(`${ESPN_BASE}/${config.sport}/${config.league}/standings`); url.searchParams.set('season', String(year)); url.searchParams.set('seasontype', config.seasonType); return url.toString(); }
async function getCachedStandings(leagueId, year) {
  const key = `standings:${leagueId}:${year}`, now = Date.now(), hit = standingsCache.get(key);
  if (hit && hit.expiresAt > now) return { entries: hit.entries, cached: true, stale: false, durationMs: 0, provider: hit.provider, ageMs: now - hit.cachedAt };
  const existing = standingsInflight.get(key); if (existing) return { ...(await existing), cached: true, stale: false, deduped: true };
  const previous = hit;
  const promise = (async () => { try { const started = Date.now(), fetched = await fetchJson(standingsUrl(leagueId, year)), entries = getEntries(fetched.data), durationMs = Date.now() - started || fetched.durationMs; standingsCache.set(key, { entries, provider: fetched.provider, cachedAt: Date.now(), expiresAt: Date.now() + STANDINGS_CACHE_SECONDS * 1000 }); return { entries, cached: false, stale: false, durationMs, provider: fetched.provider, ageMs: 0 }; } finally { standingsInflight.delete(key); } })();
  standingsInflight.set(key, promise);
  try { return await promise; } catch (error) { if (previous?.entries?.length) return { entries: previous.entries, cached: true, stale: true, durationMs: error.durationMs ?? 0, provider: previous.provider, ageMs: Date.now() - previous.cachedAt, error: error.message }; throw error; }
}
export async function fetchEspnStandings(leagueId, year = new Date().getFullYear()) { if (!ESPN_STANDINGS[leagueId]) return []; return (await getCachedStandings(leagueId, year)).entries; }
export async function enrichGamesWithEspnStandings(games, year = new Date().getFullYear()) {
  const leagueIds = [...new Set(games.map((game) => game.leagueId))].filter((leagueId) => ESPN_STANDINGS[leagueId]);
  const results = await Promise.allSettled(leagueIds.map(async (leagueId) => [leagueId, await getCachedStandings(leagueId, year)]));
  const byLeague = new Map(), diagnostics = [];
  for (const result of results) { if (result.status !== 'fulfilled') continue; const [leagueId, standings] = result.value, lookup = new Map(); for (const entry of standings.entries) { lookup.set(entry.id, entry); lookup.set(clean(entry.name), entry); } byLeague.set(leagueId, lookup); diagnostics.push({ leagueId, provider: standings.provider, cached: standings.cached, stale: standings.stale, deduped: standings.deduped ?? false, durationMs: standings.durationMs, ageMs: standings.ageMs ?? 0, count: standings.entries.length }); }
  const enriched = games.map((game) => enrichGame(game, byLeague.get(game.leagueId) ?? new Map()));
  enriched.games = enriched;
  enriched.diagnostics = diagnostics;
  return enriched;
}
export { ESPN_STANDINGS };
