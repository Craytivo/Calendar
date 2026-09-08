import { fetchEspnLeagueWindow } from '../src/sports/adapters/espn-schedules-with-odds.js';

const LEAGUES = ['nfl', 'nba', 'ncaa-football', 'mlb', 'nhl', 'epl', 'laliga', 'ucl'];

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

function coverage(games) {
  const result = {};
  for (const game of games) {
    const row = result[game.leagueId] ?? { games: 0, gamesWithOdds: 0, coveragePercent: 0, providers: {}, markets: { spread: 0, total: 0, moneyline: 0 } };
    row.games += 1;
    if (game.odds) {
      row.gamesWithOdds += 1;
      const provider = game.odds.provider?.name || 'Unknown';
      row.providers[provider] = (row.providers[provider] || 0) + 1;
      if (game.odds.spread !== undefined) row.markets.spread += 1;
      if (game.odds.total !== undefined) row.markets.total += 1;
      if (game.odds.moneyline) row.markets.moneyline += 1;
    }
    row.coveragePercent = Math.round((row.gamesWithOdds / row.games) * 1000) / 10;
    result[game.leagueId] = row;
  }
  return result;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const timezone = String(req.query?.timezone || 'UTC');
  const daysRaw = Number(req.query?.days ?? 1);
  const days = Number.isFinite(daysRaw) ? Math.min(Math.max(Math.floor(daysRaw), 1), 3) : 1;
  const requested = String(req.query?.leagues || LEAGUES).split(',').map((id) => id.trim()).filter((id) => LEAGUES.includes(id));
  const leagues = Array.from(new Set(requested));
  const today = todayInTimeZone(timezone);
  const started = Date.now();
  const results = await Promise.allSettled(leagues.map(async (leagueId) => [leagueId, await fetchEspnLeagueWindow(leagueId, today, days)]));
  const games = [];
  const sources = results.map((result, index) => {
    const leagueId = leagues[index];
    if (result.status === 'fulfilled') {
      games.push(...result.value[1]);
      return { leagueId, status: 'ok', count: result.value[1].length };
    }
    return { leagueId, status: 'error', count: 0, error: result.reason instanceof Error ? result.reason.message : String(result.reason) };
  });
  const uniqueGames = Array.from(new Map(games.map((game) => [game.id, game])).values());
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ source: 'ESPN public scoreboard + Core odds', diagnostic: true, timezone, days, fetchedAt: new Date().toISOString(), durationMs: Date.now() - started, sources, coverage: coverage(uniqueGames), games: uniqueGames.map((game) => ({ id: game.id, leagueId: game.leagueId, matchup: `${game.awayTeam?.name || game.awayTeamId || 'Away'} at ${game.homeTeam?.name || game.homeTeamId || 'Home'}`, status: game.status, odds: game.odds || null })) });
}
