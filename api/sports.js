import { THESPORTSDB_LEAGUES } from '../src/sports/adapters/thesportsdb.js';
import { favoriteTeamIds, fetchEspnLeagueWindow, fetchEspnTeamWindow } from '../src/sports/adapters/espn-schedules.js';
import { enrichGamesWithEspnStandings } from '../src/sports/adapters/espn-standings.js';
import { applyDomesticSoccerRaceContext } from '../src/sports/adapters/soccer-context.js';

const API_BASE = 'https://www.thesportsdb.com/api/v1/json/123';
const WINDOW_DAYS = 7;
const SCHEDULE_CACHE_SECONDS = 60;
const LIVE_CACHE_SECONDS = 30;
const STANDINGS_CACHE_SECONDS = 600;
const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_COOLDOWN_MS = 30_000;
const memoryCache = new Map();
const inflight = new Map();
const circuitState = new Map();
const ESPN_SCHEDULE_LEAGUES = ['nfl', 'nba', 'ncaa-football', 'mlb', 'nhl', 'ufc', 'epl', 'epl-cup', 'laliga', 'ucl'];
const SOCCER_STANDING_LEAGUES = ['ucl', 'laliga', 'epl'];
const STANDINGS_LEAGUES = new Set(['nfl', 'nba', 'ncaa-football', 'mlb', 'nhl']);

function addDays(date, days) { return new Date(date.getTime() + days * 86400000); }
function dateKey(date) { return date.toISOString().slice(0, 10); }
function todayInTimeZone(timeZone) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
    return new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)));
  } catch {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
}
function seasonFor(leagueId, date) { const year = date.getUTCFullYear(); return ['epl', 'laliga', 'nba', 'nhl'].includes(leagueId) ? `${year}-${year + 1}` : String(year); }
function inWindow(game, startKey, endKey) { const key = String(game.startTime).slice(0, 10); return key >= startKey && key < endKey; }
function errorMessage(error) { return error instanceof Error ? error.message : String(error ?? 'Unknown error'); }
function sourceRecord(id, name, provider, status, count = 0, error = null, durationMs = null, cached = false, extra = {}) { return { id, name, provider, status, count, ...(error ? { error } : {}), ...(Number.isFinite(durationMs) ? { durationMs } : {}), ...(cached ? { cached: true } : {}), ...extra }; }
function sourceName(leagueId) { const names = { 'ncaa-football': 'NCAA Football', 'epl-cup': 'Carabao Cup', epl: 'Premier League', laliga: 'La Liga', ucl: 'UEFA Champions League' }; return names[leagueId] || leagueId.toUpperCase(); }
function circuitOpen(key) { const state = circuitState.get(key); return Boolean(state?.openedAt && Date.now() - state.openedAt < CIRCUIT_COOLDOWN_MS); }
function recordFailure(key) { const state = circuitState.get(key) ?? { failures: 0, openedAt: 0 }; state.failures += 1; if (state.failures >= CIRCUIT_FAILURE_THRESHOLD) state.openedAt = Date.now(); circuitState.set(key, state); }
function recordSuccess(key) { circuitState.delete(key); }

async function cached(key, ttlSeconds, loader) {
  const now = Date.now();
  const hit = memoryCache.get(key);
  if (hit && hit.expiresAt > now) return { value: hit.value, cached: true, stale: false, refreshing: false, durationMs: 0, ageMs: now - hit.cachedAt };

  if (circuitOpen(key)) {
    if (hit?.value) return { value: hit.value, cached: true, stale: true, refreshing: false, circuitOpen: true, durationMs: 0, ageMs: now - hit.cachedAt };
    throw new Error(`Provider temporarily paused for ${key}`);
  }

  const refresh = async () => {
    if (inflight.has(key)) return inflight.get(key);
    const started = Date.now();
    const promise = Promise.resolve().then(loader).then((value) => {
      memoryCache.set(key, { value, cachedAt: Date.now(), expiresAt: Date.now() + ttlSeconds * 1000 });
      recordSuccess(key);
      return { value, cached: false, stale: false, refreshing: false, durationMs: Date.now() - started, ageMs: 0 };
    }).catch((error) => {
      recordFailure(key);
      if (hit?.value) return { value: hit.value, cached: true, stale: true, refreshing: false, circuitOpen: circuitOpen(key), durationMs: Date.now() - started, ageMs: Date.now() - hit.cachedAt, error: errorMessage(error) };
      throw error;
    }).finally(() => inflight.delete(key));
    inflight.set(key, promise);
    return promise;
  };

  if (hit?.value) {
    void refresh().catch(() => {});
    return { value: hit.value, cached: true, stale: true, refreshing: true, durationMs: 0, ageMs: now - hit.cachedAt };
  }
  return refresh();
}

async function getJson(url) {
  const started = Date.now();
  const response = await fetch(url);
  const durationMs = Date.now() - started;
  if (!response.ok) { const error = new Error(`TheSportsDB returned ${response.status}`); error.durationMs = durationMs; throw error; }
  return { data: await response.json(), durationMs };
}
async function fetchSoccerTable(league, today) {
  const season = seasonFor(league.id, today);
  const result = await getJson(`${API_BASE}/lookuptable.php?l=${league.providerId}&s=${encodeURIComponent(season)}`);
  return result.data.table ?? [];
}
function applySoccerStandings(games, tablesByLeague) {
  return games.map((game) => {
    const table = tablesByLeague[game.leagueId];
    if (!table?.length) return game;
    const standings = new Map();
    for (const row of table) {
      const name = String(row.name ?? row.strTeam ?? '').trim().toLowerCase();
      const rank = Number(row.intRank ?? row.intPosition ?? row.intStanding ?? row.position);
      if (!name || !Number.isFinite(rank)) continue;
      const played = Number(row.intPlayed ?? row.intGamesPlayed ?? row.played);
      const points = Number(row.intPoints ?? row.points);
      const goalDifference = Number(row.intGoalDifference ?? row.intGoalDiff ?? row.goalDifference);
      standings.set(name, { leagueRank: rank, ...(Number.isFinite(played) ? { gamesPlayed: played } : {}), ...(Number.isFinite(points) ? { points } : {}), ...(Number.isFinite(goalDifference) ? { goalDifference } : {}) });
    }
    const addRank = (team) => { if (!team) return team; const context = standings.get(String(team.name ?? '').trim().toLowerCase()); return context ? { ...team, ...context } : team; };
    return { ...game, homeTeam: addRank(game.homeTeam), awayTeam: addRank(game.awayTeam) };
  });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const requestedDays = Number(req.query?.days ?? WINDOW_DAYS);
  const days = Number.isFinite(requestedDays) ? Math.min(Math.max(Math.floor(requestedDays), 1), WINDOW_DAYS) : WINDOW_DAYS;
  const timeZone = String(req.query?.timezone || 'UTC');
  const today = todayInTimeZone(timeZone);
  const end = addDays(today, days);
  const startKey = dateKey(today), endKey = dateKey(end), requestStarted = Date.now();
  const games = [], sources = [];
  const diagnostics = { timezone: timeZone, standings: [], favorites: [], timings: { totalMs: 0, scheduleMs: 0, standingsMs: 0, favoriteFallbackMs: 0 }, cache: { inflightDeduped: 0, staleRefreshes: 0, circuitOpen: 0 } };

  const scheduleStarted = Date.now();
  const scheduleResults = await Promise.allSettled(ESPN_SCHEDULE_LEAGUES.map(async (leagueId) => [leagueId, await cached(`schedule:${leagueId}:${startKey}:${days}`, SCHEDULE_CACHE_SECONDS, () => fetchEspnLeagueWindow(leagueId, today, days))]));
  diagnostics.timings.scheduleMs = Date.now() - scheduleStarted;
  const coveredFavoriteIds = new Set();
  scheduleResults.forEach((result, index) => {
    const leagueId = ESPN_SCHEDULE_LEAGUES[index];
    if (result.status === 'fulfilled') {
      const [, cacheResult] = result.value;
      const normalized = cacheResult.value.filter((game) => inWindow(game, startKey, endKey));
      games.push(...normalized);
      for (const game of normalized) {
        if (game.homeTeam?.favorite) coveredFavoriteIds.add(game.homeTeamId);
        if (game.awayTeam?.favorite) coveredFavoriteIds.add(game.awayTeamId);
      }
      sources.push(sourceRecord(leagueId, sourceName(leagueId), 'ESPN public scoreboard', 'ok', normalized.length, cacheResult.error ?? null, cacheResult.durationMs, cacheResult.cached, { stale: cacheResult.stale, refreshing: cacheResult.refreshing, circuitOpen: cacheResult.circuitOpen }));
      if (cacheResult.refreshing) diagnostics.cache.staleRefreshes += 1;
      if (cacheResult.circuitOpen) diagnostics.cache.circuitOpen += 1;
    } else sources.push(sourceRecord(leagueId, sourceName(leagueId), 'ESPN public scoreboard', 'error', 0, errorMessage(result.reason)));
  });

  const missingFavorites = favoriteTeamIds().filter((teamId) => !coveredFavoriteIds.has(teamId));
  const favoriteStarted = Date.now();
  const favoriteResults = await Promise.allSettled(missingFavorites.map(async (teamId) => [teamId, await cached(`favorite:${teamId}:${startKey}:${days}`, SCHEDULE_CACHE_SECONDS, () => fetchEspnTeamWindow(teamId, today, days))]));
  diagnostics.timings.favoriteFallbackMs = Date.now() - favoriteStarted;
  favoriteResults.forEach((result, index) => {
    const teamId = missingFavorites[index];
    if (result.status === 'fulfilled') {
      const [, cacheResult] = result.value;
      const normalized = cacheResult.value.filter((game) => inWindow(game, startKey, endKey));
      games.push(...normalized);
      diagnostics.favorites.push(sourceRecord(teamId, teamId, 'ESPN favorite-team fallback', 'ok', normalized.length, cacheResult.error ?? null, cacheResult.durationMs, cacheResult.cached, { stale: cacheResult.stale, refreshing: cacheResult.refreshing, circuitOpen: cacheResult.circuitOpen }));
      if (cacheResult.refreshing) diagnostics.cache.staleRefreshes += 1;
      if (cacheResult.circuitOpen) diagnostics.cache.circuitOpen += 1;
    } else diagnostics.favorites.push(sourceRecord(teamId, teamId, 'ESPN favorite-team fallback', 'error', 0, errorMessage(result.reason)));
  });

  const standingsStarted = Date.now();
  const activeSoccerIds = new Set(games.map((game) => game.leagueId));
  const soccerLeagues = THESPORTSDB_LEAGUES.filter((league) => SOCCER_STANDING_LEAGUES.includes(league.id) && activeSoccerIds.has(league.id));
  const tableResults = await Promise.allSettled(soccerLeagues.map(async (league) => [league.id, await cached(`soccer-standings:${league.id}:${seasonFor(league.id, today)}`, STANDINGS_CACHE_SECONDS, () => fetchSoccerTable(league, today))]));
  const tablesByLeague = {};
  tableResults.forEach((result, index) => {
    const league = soccerLeagues[index];
    if (result.status === 'fulfilled') {
      const [leagueId, cacheResult] = result.value;
      tablesByLeague[leagueId] = cacheResult.value;
      diagnostics.standings.push(sourceRecord(leagueId, league.name, 'TheSportsDB standings', 'ok', cacheResult.value.length, cacheResult.error ?? null, cacheResult.durationMs, cacheResult.cached, { stale: cacheResult.stale, refreshing: cacheResult.refreshing, circuitOpen: cacheResult.circuitOpen }));
      if (cacheResult.refreshing) diagnostics.cache.staleRefreshes += 1;
      if (cacheResult.circuitOpen) diagnostics.cache.circuitOpen += 1;
    } else diagnostics.standings.push(sourceRecord(league.id, league.name, 'TheSportsDB standings', 'error', 0, errorMessage(result.reason)));
  });

  let enrichedGames = applyDomesticSoccerRaceContext(applySoccerStandings(games, tablesByLeague));
  if (enrichedGames.some((game) => STANDINGS_LEAGUES.has(game.leagueId))) {
    try {
      const result = await enrichGamesWithEspnStandings(enrichedGames, today.getUTCFullYear());
      enrichedGames = result;
      diagnostics.standings.push(...(result.diagnostics ?? []).map((item) => sourceRecord(`espn-${item.leagueId}`, `${item.leagueId.toUpperCase()} standings`, item.provider, 'ok', item.count, null, item.durationMs, item.cached, { stale: item.stale, deduped: item.deduped, ageMs: item.ageMs })));
    } catch (error) {
      diagnostics.standings.push(sourceRecord('espn-major-sports', 'Major sports standings', 'ESPN standings', 'error', 0, errorMessage(error)));
    }
  }
  diagnostics.timings.standingsMs = Date.now() - standingsStarted;

  const uniqueGames = Array.from(new Map(enrichedGames.map((game) => [game.id, game])).values()).filter((game) => inWindow(game, startKey, endKey)).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  const nflSource = sources.find((source) => source.id === 'nfl');
  const scheduleErrors = sources.filter((source) => source.status === 'error');
  const hasLiveGames = uniqueGames.some((game) => game.status === 'live');
  diagnostics.timings.totalMs = Date.now() - requestStarted;
  const health = { status: scheduleErrors.length === ESPN_SCHEDULE_LEAGUES.length ? 'degraded' : 'ok', nfl: nflSource ? { status: nflSource.status, count: nflSource.count, ...(nflSource.error ? { error: nflSource.error } : {}) } : { status: 'missing', count: 0 }, failedSources: scheduleErrors.map((source) => source.id) };
  const cacheSeconds = hasLiveGames ? LIVE_CACHE_SECONDS : SCHEDULE_CACHE_SECONDS;
  res.setHeader('Cache-Control', `s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds}`);
  return res.status(200).json({ source: 'free-sports-aggregation', windowDays: days, startDate: startKey, endDateExclusive: endKey, fetchedAt: new Date().toISOString(), games: uniqueGames, sources, diagnostics, health });
}
