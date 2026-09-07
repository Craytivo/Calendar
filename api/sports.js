import { THESPORTSDB_LEAGUES, normalizeTheSportsDbEvents } from '../src/sports/adapters/thesportsdb.js';

const API_BASE = 'https://www.thesportsdb.com/api/v1/json/123';
const WINDOW_DAYS = 7;
const CACHE_SECONDS = 900;

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function seasonFor(leagueId, date) {
  const year = date.getFullYear();
  if (leagueId === 'epl' || leagueId === 'laliga' || leagueId === 'nba' || leagueId === 'nhl') {
    return `${year}-${year + 1}`;
  }
  return String(year);
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

  return [
    ...(nextResult.events ?? []),
    ...(previousResult.events ?? []),
  ];
}

async function fetchSoccerTable(league, today) {
  const season = seasonFor(league.id, today);
  try {
    const result = await getJson(`${API_BASE}/lookuptable.php?l=${league.providerId}&s=${encodeURIComponent(season)}`);
    return result.table ?? [];
  } catch {
    return [];
  }
}

function applySoccerStandings(games, tablesByLeague) {
  return games.map((game) => {
    const table = tablesByLeague[game.leagueId];
    if (!table?.length) return game;

    const standings = new Map();
    for (const row of table) {
      const name = String(row.name ?? row.strTeam ?? '').trim().toLowerCase();
      if (!name) continue;
      standings.set(name, Number(row.intRank ?? row.intPosition ?? row.intStanding ?? row.position));
    }

    const addRank = (team) => {
      if (!team) return team;
      const rank = standings.get(String(team.name ?? '').trim().toLowerCase());
      return Number.isFinite(rank) ? { ...team, leagueRank: rank } : team;
    };

    return { ...game, homeTeam: addRank(game.homeTeam), awayTeam: addRank(game.awayTeam) };
  });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const requestedDays = Number(req.query?.days ?? WINDOW_DAYS);
  const days = Number.isFinite(requestedDays)
    ? Math.min(Math.max(Math.floor(requestedDays), 1), WINDOW_DAYS)
    : WINDOW_DAYS;

  const today = new Date();
  const end = addDays(today, days);
  const startKey = dateKey(today);
  const endKey = dateKey(end);

  try {
    const results = await Promise.allSettled(
      THESPORTSDB_LEAGUES.map(async (league) => ({
        league,
        events: await fetchLeagueEvents(league),
      })),
    );

    const games = [];
    const sources = [];

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const { league, events } = result.value;
        const normalized = normalizeTheSportsDbEvents(events, league).filter((game) => {
          const key = String(game.startTime).slice(0, 10);
          return key >= startKey && key < endKey;
        });
        games.push(...normalized);
        sources.push({ id: league.id, name: league.name, status: 'ok', count: normalized.length });
      } else {
        sources.push({ id: 'unknown', status: 'error' });
      }
    }

    const soccerLeagues = THESPORTSDB_LEAGUES.filter((league) => ['epl', 'laliga', 'ucl'].includes(league.id));
    const tableResults = await Promise.all(
      soccerLeagues.map(async (league) => [league.id, await fetchSoccerTable(league, today)]),
    );
    const tablesByLeague = Object.fromEntries(tableResults);

    const withStandings = applySoccerStandings(games, tablesByLeague);
    const uniqueGames = Array.from(new Map(withStandings.map((game) => [game.id, game])).values())
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    res.setHeader('Cache-Control', `s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`);
    res.status(200).json({
      source: 'thesportsdb-free',
      windowDays: days,
      startDate: startKey,
      endDateExclusive: endKey,
      fetchedAt: new Date().toISOString(),
      games: uniqueGames,
      sources,
    });
  } catch (error) {
    res.status(502).json({ source: 'thesportsdb-free', error: 'Sports data source unavailable' });
  }
}
