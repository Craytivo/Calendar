import { THESPORTSDB_LEAGUES } from '../src/sports/adapters/thesportsdb.js';
import { favoriteTeamIds, fetchEspnLeagueWindow, fetchEspnTeamWindow } from '../src/sports/adapters/espn-schedules.js';
import { enrichGamesWithEspnStandings } from '../src/sports/adapters/espn-standings.js';
import { applyDomesticSoccerRaceContext } from '../src/sports/adapters/soccer-context.js';

const API_BASE = 'https://www.thesportsdb.com/api/v1/json/123';
const WINDOW_DAYS = 7;
const CACHE_SECONDS = 60;

const ESPN_SCHEDULE_LEAGUES = [
  'nfl', 'nba', 'ncaa-football', 'mlb', 'nhl', 'ufc',
  'epl', 'epl-cup', 'laliga', 'ucl',
];
const SOCCER_STANDING_LEAGUES = ['ucl', 'laliga', 'epl'];

function addDays(date, days) { return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days); }
function dateKey(date) { return date.toISOString().slice(0, 10); }
function seasonFor(leagueId, date) {
  const year = date.getFullYear();
  return ['epl', 'laliga', 'nba', 'nhl'].includes(leagueId) ? `${year}-${year + 1}` : String(year);
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`TheSportsDB returned ${response.status}`);
  return response.json();
}

async function fetchSoccerTable(league, today) {
  const season = seasonFor(league.id, today);
  const result = await getJson(`${API_BASE}/lookuptable.php?l=${league.providerId}&s=${encodeURIComponent(season)}`);
  return result.table ?? [];
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
      standings.set(name, {
        leagueRank: rank,
        ...(Number.isFinite(played) ? { gamesPlayed: played } : {}),
        ...(Number.isFinite(points) ? { points } : {}),
        ...(Number.isFinite(goalDifference) ? { goalDifference } : {}),
      });
    }
    const addRank = (team) => {
      if (!team) return team;
      const context = standings.get(String(team.name ?? '').trim().toLowerCase());
      return context ? { ...team, ...context } : team;
    };
    return { ...game, homeTeam: addRank(game.homeTeam), awayTeam: addRank(game.awayTeam) };
  });
}

function inWindow(game, startKey, endKey) {
  const key = String(game.startTime).slice(0, 10);
  return key >= startKey && key < endKey;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error ?? 'Unknown error');
}

function sourceRecord(id, name, provider, status, count = 0, error = null) {
  return { id, name, provider, status, count, ...(error ? { error } : {}) };
}

function sourceName(leagueId) {
  const names = {
    'ncaa-football': 'NCAA Football',
    'epl-cup': 'Carabao Cup',
    epl: 'Premier League',
    laliga: 'La Liga',
    ucl: 'UEFA Champions League',
  };
  return names[leagueId] || leagueId.toUpperCase();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const requestedDays = Number(req.query?.days ?? WINDOW_DAYS);
  const days = Number.isFinite(requestedDays) ? Math.min(Math.max(Math.floor(requestedDays), 1), WINDOW_DAYS) : WINDOW_DAYS;
  const today = new Date();
  const end = addDays(today, days);
  const startKey = dateKey(today);
  const endKey = dateKey(end);

  const games = [];
  const sources = [];
  const diagnostics = { standings: [], favorites: [] };

  const scheduleResults = await Promise.allSettled(
    ESPN_SCHEDULE_LEAGUES.map(async (leagueId) => [leagueId, await fetchEspnLeagueWindow(leagueId, today, days)]),
  );

  scheduleResults.forEach((result, index) => {
    const leagueId = ESPN_SCHEDULE_LEAGUES[index];
    if (result.status === 'fulfilled') {
      const [, leagueGames] = result.value;
      const normalized = leagueGames.filter((game) => inWindow(game, startKey, endKey));
      games.push(...normalized);
      sources.push(sourceRecord(leagueId, sourceName(leagueId), 'ESPN public scoreboard', 'ok', normalized.length));
    } else {
      sources.push(sourceRecord(leagueId, sourceName(leagueId), 'ESPN public scoreboard', 'error', 0, errorMessage(result.reason)));
    }
  });

  // Always query the six favorite teams directly as a second schedule path.
  // This catches cross-competition games (UCL/cups) that may not be returned
  // by a domestic league scoreboard, while deduplication below keeps one game.
  const favoriteResults = await Promise.allSettled(
    favoriteTeamIds().map(async (teamId) => [teamId, await fetchEspnTeamWindow(teamId, today, days)]),
  );

  favoriteResults.forEach((result, index) => {
    const teamId = favoriteTeamIds()[index];
    if (result.status === 'fulfilled') {
      const [, teamGames] = result.value;
      const normalized = teamGames.filter((game) => inWindow(game, startKey, endKey));
      games.push(...normalized);
      diagnostics.favorites.push(sourceRecord(teamId, teamId, 'ESPN favorite-team schedule', 'ok', normalized.length));
    } else {
      diagnostics.favorites.push(sourceRecord(teamId, teamId, 'ESPN favorite-team schedule', 'error', 0, errorMessage(result.reason)));
    }
  });

  const soccerLeagues = THESPORTSDB_LEAGUES.filter((league) => SOCCER_STANDING_LEAGUES.includes(league.id));
  const tableResults = await Promise.allSettled(
    soccerLeagues.map(async (league) => [league.id, await fetchSoccerTable(league, today)]),
  );
  const tablesByLeague = {};
  tableResults.forEach((result, index) => {
    const league = soccerLeagues[index];
    if (result.status === 'fulfilled') {
      const [leagueId, table] = result.value;
      tablesByLeague[leagueId] = table;
      diagnostics.standings.push(sourceRecord(leagueId, league.name, 'TheSportsDB standings', 'ok', table.length));
    } else {
      diagnostics.standings.push(sourceRecord(league.id, league.name, 'TheSportsDB standings', 'error', 0, errorMessage(result.reason)));
    }
  });

  let enrichedGames = games;
  try {
    const withSoccerStandings = applySoccerStandings(games, tablesByLeague);
    const withDomesticRaceContext = applyDomesticSoccerRaceContext(withSoccerStandings);
    enrichedGames = await enrichGamesWithEspnStandings(withDomesticRaceContext, today.getFullYear());
    diagnostics.standings.push(sourceRecord('espn-major-sports', 'Major sports standings', 'ESPN standings', 'ok'));
  } catch (error) {
    diagnostics.standings.push(sourceRecord('espn-major-sports', 'Major sports standings', 'ESPN standings', 'error', 0, errorMessage(error)));
  }

  const uniqueGames = Array.from(new Map(enrichedGames.map((game) => [game.id, game])).values())
    .filter((game) => inWindow(game, startKey, endKey))
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  res.setHeader('Cache-Control', `s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`);
  return res.status(200).json({
    source: 'free-sports-aggregation',
    windowDays: days,
    startDate: startKey,
    endDateExclusive: endKey,
    fetchedAt: new Date().toISOString(),
    games: uniqueGames,
    sources,
    diagnostics,
  });
}
