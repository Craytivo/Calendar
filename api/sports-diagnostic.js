import { fetchEspnLeagueWindow } from '../src/sports/adapters/espn-schedules.js';
import { buildDiagnosticSummary, buildGameDiagnostic } from '../src/sports/api-diagnostic.js';

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

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const timeZone = String(req.query?.timezone || 'UTC');
  const daysRaw = Number(req.query?.days ?? 1);
  const days = Number.isFinite(daysRaw) ? Math.min(Math.max(Math.floor(daysRaw), 1), 3) : 1;
  const requested = String(req.query?.leagues || LEAGUES).split(',').map((id) => id.trim()).filter((id) => LEAGUES.includes(id));
  const leagues = Array.from(new Set(requested));
  const today = todayInTimeZone(timeZone);
  const started = Date.now();
  const results = await Promise.allSettled(leagues.map(async (leagueId) => ({ leagueId, games: await fetchEspnLeagueWindow(leagueId, today, days) })));
  const games = [];
  const sources = results.map((result, index) => {
    const leagueId = leagues[index];
    if (result.status === 'fulfilled') {
      games.push(...result.value.games);
      return { leagueId, status: 'ok', count: result.value.games.length };
    }
    return { leagueId, status: 'error', count: 0, error: result.reason instanceof Error ? result.reason.message : String(result.reason) };
  });
  const uniqueGames = Array.from(new Map(games.map((game) => [game.id, game])).values()).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  const diagnostics = uniqueGames.map(buildGameDiagnostic);
  const failed = sources.filter((source) => source.status === 'error');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    source: 'ESPN public scoreboard',
    diagnostic: true,
    timezone: timeZone,
    days,
    fetchedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    sources,
    summary: buildDiagnosticSummary(uniqueGames),
    games: diagnostics,
    health: { status: failed.length === sources.length && sources.length ? 'degraded' : 'ok', failedSources: failed.map((source) => source.leagueId) },
  });
}
