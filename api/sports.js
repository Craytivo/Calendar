import { THESPORTSDB_LEAGUES, normalizeTheSportsDbEvents } from '../src/sports/adapters/thesportsdb.js';
import { fetchEspnCollegeFootballWindow } from '../src/sports/adapters/espn-public.js';

const API_BASE = 'https://www.thesportsdb.com/api/v1/json/123';
const WINDOW_DAYS = 7;
const CACHE_SECONDS = 900;

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
      if (name && Number.isFinite(rank)) standings.set(name, rank);
    }
    const addRank = (team) => {
      if (!team) return team;
      const rank = standings.get(String(team.name ?? '').trim().toLowerCase());
      return Number.isFinite(rank) ? { ...team, leagueRank: rank } : team;
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
    const results = await Promise.allSettled(THESPORTSDB_LEAGUES.map(async (league) => ({ league, events: await fetchLeagueEvents(league) })));
    const games = [];
    const sources = [];

    results.forEach((result, index) => {
      const league = THESPORTSDB_LEAGUES[index];
      if (result.status === 'fulfilled') {
        const normalized = normalizeTheSportsDbEvents(result.value.events, league).filter((game) => inWindow(game, startKey, endKey));
        games.push(...normalized);
        sources.push({ id: league.id, name: league.name, status: 'ok', count: normalized.length });
      } else {
        sources.push({ id: league.id, name: league.name, status: 'error', count: 0 });
      }
    });

    const cfbCount = games.filter((game) => game.leagueId === 'ncaa-football').length;
    if (cfbCount === 0) {
      try {
        const fallbackGames = await fetchEspnCollegeFootballWindow(today, days);
        games.push(...fallbackGames.filter((game) => inWindow(game, startKey, endKey)));
        const source = sources.find((item) => item.id === 'ncaa-football');
        if (source) {
          source.status = 'fallback';
          source.name = 'ESPN public scoreboard fallback';
          source.count = fallbackGames.length;
        }
      } catch {
        const source = sources.find((item) => item.id === 'ncaa-football');
        if (source) source.status = 'unavailable';
      }
    }

    const soccerLeagues = THESPORTSDB_LEAGUES.filter((league) => ['epl', 'laliga', 'ucl'].includes(league.id));
    const tableResults = await Promise.all(soccerLeagues.map(async (league) => [league.id, await fetchSoccerTable(league, today)]));
    const tablesByLeague = Object.fromEntries(tableResults);
    const withStandings = applySoccerStandings(games, tablesByLeague);
    const uniqueGames = Array.from(new Map(withStandings.map((game) => [game.id, game])).values())
      .filter((game) => inWindow(game, startKey, endKey))
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    res.setHeader('Cache-Control', `s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`);
    return res.status(200).json({ source: 'free-sports-aggregation', windowDays: days, startDate: startKey, endDateExclusive: endKey, fetchedAt: new Date().toISOString(), games: uniqueGames, sources });
  } catch {
    return res.status(502).json({ source: 'free-sports-aggregation', error: 'Sports data sources unavailable' });
  }
}
