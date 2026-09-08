import { fetchEspnLeagueWindow as fetchSchedule, fetchEspnTeamWindow as fetchTeamSchedule, favoriteTeamIds } from './espn-schedules.js';
import { fetchEspnEventOdds } from './odds.js';

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

function eventId(game) {
  const parts = String(game?.id || '').split(':');
  return parts.length ? parts[parts.length - 1] : undefined;
}

async function enrich(games) {
  const missing = games.filter((game) => !game.odds && CONFIG[game.leagueId] && game.status === 'scheduled');
  const output = new Map(games.map((game) => [game.id, game]));
  const concurrency = 6;

  for (let i = 0; i < missing.length; i += concurrency) {
    const batch = missing.slice(i, i + concurrency);
    const results = await Promise.all(batch.map((game) => fetchEspnEventOdds({
      ...CONFIG[game.leagueId],
      eventId: eventId(game),
      competitionId: game.competitionId,
      homeTeamId: game.homeTeamId,
      awayTeamId: game.awayTeamId,
    })));
    batch.forEach((game, index) => {
      if (results[index]) output.set(game.id, { ...game, odds: results[index] });
    });
  }

  return Array.from(output.values());
}

export async function fetchEspnLeagueWindow(leagueId, startDate, days = 7) {
  return enrich(await fetchSchedule(leagueId, startDate, days));
}

export async function fetchEspnTeamWindow(teamId, startDate, days = 7) {
  return enrich(await fetchTeamSchedule(teamId, startDate, days));
}

export { favoriteTeamIds };
