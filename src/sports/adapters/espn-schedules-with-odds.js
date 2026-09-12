import { fetchEspnLeagueWindow as fetchSchedule, fetchEspnTeamWindow as fetchTeamSchedule, favoriteTeamIds } from './espn-schedules.js';
import { fetchEspnEventOdds } from './odds.js';
import { enrichNcaaLeagueGames } from './ncaa-standings-enrichment.js';

const CONFIG = {
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

const ODDS_TIMEOUT_MS = 2500;
const MAX_ODDS_ENRICHMENTS = 12;

function eventId(game) {
  const parts = String(game?.id || '').split(':');
  return parts.length ? parts[parts.length - 1] : undefined;
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(undefined), timeoutMs)),
  ]);
}

async function enrich(games) {
  // Odds are an optional Game Score input. They must never block the core
  // schedule response, especially when a provider is slow or unavailable.
  const missing = games
    .filter((game) => !game.odds && CONFIG[game.leagueId] && game.status === 'scheduled')
    .slice(0, MAX_ODDS_ENRICHMENTS);
  const output = new Map(games.map((game) => [game.id, game]));
  const concurrency = 6;

  for (let i = 0; i < missing.length; i += concurrency) {
    const batch = missing.slice(i, i + concurrency);
    const results = await Promise.all(batch.map((game) => {
      const id = eventId(game);
      return withTimeout(fetchEspnEventOdds({
        ...CONFIG[game.leagueId],
        eventId: id,
        competitionId: game.competitionId || id,
        homeTeamId: game.homeTeamId,
        awayTeamId: game.awayTeamId,
      }), ODDS_TIMEOUT_MS);
    }));
    batch.forEach((game, index) => {
      if (results[index]) output.set(game.id, { ...game, odds: results[index] });
    });
  }

  return Array.from(output.values());
}

async function enrichSchedule(games) {
  return enrichNcaaLeagueGames(games);
}

export async function fetchEspnLeagueWindow(leagueId, startDate, days = 7) {
  const games = await fetchSchedule(leagueId, startDate, days);
  return enrich(await enrichSchedule(games));
}

export async function fetchEspnTeamWindow(teamId, startDate, days = 7) {
  const games = await fetchTeamSchedule(teamId, startDate, days);
  return enrich(await enrichSchedule(games));
}

export { favoriteTeamIds };