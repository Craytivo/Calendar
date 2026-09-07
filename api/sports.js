import { THESPORTSDB_LEAGUES, normalizeTheSportsDbEvents } from '../src/sports/adapters/thesportsdb.js';
import { fetchEspnLeagueWindow } from '../src/sports/adapters/espn-schedules.js';
import { enrichGamesWithEspnStandings } from '../src/sports/adapters/espn-standings.js';
import { applyDomesticSoccerRaceContext } from '../src/sports/adapters/soccer-context.js';

const API_BASE = 'https://www.thesportsdb.com/api/v1/json/123';
const WINDOW_DAYS = 7;
const CACHE_SECONDS = 900;

// ESPN is the schedule source for North American leagues and UFC because its
// scoreboard endpoint can return an exact date range in one request. TheSportsDB
// remains the soccer source where its competition context is more useful.
const ESPN_SCHEDULE_LEAGUES = ['nfl', 'nba', 'ncaa-football', 'mlb', 'nhl', 'ufc'];
const SOCCER_LEAGUES = ['ucl', 'laliga', 'epl'];

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
async function fetchLeagueEvents(league) {
  const [nextResult, previousResult] = await Promise.all([
    getJson(`${API_BASE}/eventsnextleague.php?id=${league.providerId}`),
    getJson(`${API_BASE}/eventspastleague.php?id=${league.providerId}`),
  ]);
  return [...(nextResult.events ?? []), ...(previousResult.events ?? [])];
}
async function fetchSoccerTable(league, today) {
  try {
    const season = seasonFor(league.id, today);
    const result = await getJson(`${API_BASE}/lookuptable.php?l=${league.providerId}&s=${encodeURIComponent(season)}`);
    return result.table ?? [];
  } catch { return []; }
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

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const requestedDays = Number(req.query?.days ?? WINDOW_DAYS);
  const days = Number.isFinite(requestedDays) ? Math.min(Math.max(Math.floor(requestedDays), 1), WINDOW_DAYS) : WINDOW_DAYS;
  const today = new Date();
  const end = addDays(today, days);
  const startKey = dateKey(today);
  const endKey = dateKey(end);

  try {
    const games = [];
    const sources = [];

    const espnResults = await Promise.allSettled(
      ESPN_SCHEDULE_LEAGUES.map(async (leagueId) => [leagueId, await fetchEspnLeagueWindow(leagueId, today, days)]),
    );

    for (const result of espnResults) {
      if (result.status === 'fulfilled') {
        const [leagueId, leagueGames] = result.value;
        const normalized = leagueGames.filter((game) => inWindow(game, startKey, endKey));
        games.push(...normalized);
        sources.push({ id: leagueId, name: leagueId === 'ncaa-football' ? 'NCAA Football' : leagueId.toUpperCase(), status: 'ok', count: normalized.length, provider: 'ESPN public scoreboard' });
      } else {
        const leagueId = ESPN_SCHEDULE_LEAGUES[sources.length] ?? 'unknown';
        sources.push({ id: leagueId, name: leagueId.toUpperCase(), status: 'error', count: 0, provider: 'ESPN public scoreboard' });
      }
    }

    const soccerResults = await Promise.allSettled(
      THESPORTSDB_LEAGUES
        .filter((league) => SOCCER_LEAGUES.includes(league.id))
        .map(async (league) => ({ league, events: await fetchLeagueEvents(league) })),
    );

    soccerResults.forEach((result, index) => {
      const league = THESPORTSDB_LEAGUES.filter((item) => SOCCER_LEAGUES.includes(item.id))[index];
      if (result.status === 'fulfilled') {
        const normalized = normalizeTheSportsDbEvents(result.value.events, league).filter((game) => inWindow(game, startKey, endKey));
        games.push(...normalized);
        sources.push({ id: league.id, name: league.name, status: 'ok', count: normalized.length, provider: 'TheSportsDB' });
      } else {
        sources.push({ id: league.id, name: league.name, status: 'error', count: 0, provider: 'TheSportsDB' });
      }
    });

    const soccerLeagues = THESPORTSDB_LEAGUES.filter((league) => SOCCER_LEAGUES.includes(league.id));
    const tableResults = await Promise.all(soccerLeagues.map(async (league) => [league.id, await fetchSoccerTable(league, today)]));
    const tablesByLeague = Object.fromEntries(tableResults);
    const withSoccerStandings = applySoccerStandings(games, tablesByLeague);
    const withDomesticRaceContext = applyDomesticSoccerRaceContext(withSoccerStandings);
    const enrichedGames = await enrichGamesWithEspnStandings(withDomesticRaceContext, today.getFullYear());
    const uniqueGames = Array.from(new Map(enrichedGames.map((game) => [game.id, game])).values())
      .filter((game) => inWindow(game, startKey, endKey))
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    res.setHeader('Cache-Control', `s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`);
    return res.status(200).json({ source: 'free-sports-aggregation', windowDays: days, startDate: startKey, endDateExclusive: endKey, fetchedAt: new Date().toISOString(), games: uniqueGames, sources });
  } catch {
    return res.status(502).json({ source: 'free-sports-aggregation', error: 'Sports data sources unavailable' });
  }
}
