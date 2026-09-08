import { getGameScoreComponents, getGameScoreSnapshot } from './game-score.js';

export function buildGameDiagnostic(game) {
  const snapshot = getGameScoreSnapshot(game);
  return {
    id: game.id,
    leagueId: game.leagueId,
    matchup: `${game.awayTeam?.name || game.awayTeamId || 'Away'} at ${game.homeTeam?.name || game.homeTeamId || 'Home'}`,
    status: game.status,
    eventType: game.eventType,
    startTime: game.startTime,
    period: game.period,
    clock: game.clock,
    clockSeconds: game.clockSeconds,
    clockMode: game.clockMode,
    isOvertime: Boolean(game.isOvertime),
    score: { away: game.awayScore, home: game.homeScore },
    flags: {
      majorEvent: Boolean(game.isMajorEvent),
      elimination: Boolean(game.isElimination),
      rivalry: Boolean(game.isRivalry),
      playoffImplications: Boolean(game.hasPlayoffImplications),
      seedingImplications: Boolean(game.hasSeedingImplications),
      qualificationImplications: Boolean(game.hasQualificationImplications),
    },
    gameScore: snapshot.score,
    gameScoreLevel: snapshot.level,
    reasons: snapshot.reasons,
    components: getGameScoreComponents(game),
  };
}

export function buildDiagnosticSummary(games) {
  const byLeague = {};
  for (const game of games) {
    const league = byLeague[game.leagueId] ?? { count: 0, live: 0, final: 0, scheduled: 0, clockModes: {}, highestScore: null };
    league.count += 1;
    league[game.status] = (league[game.status] ?? 0) + 1;
    if (game.clockMode) league.clockModes[game.clockMode] = (league.clockModes[game.clockMode] ?? 0) + 1;
    const diagnostic = buildGameDiagnostic(game);
    if (!league.highestScore || diagnostic.gameScore > league.highestScore.gameScore) league.highestScore = diagnostic;
    byLeague[game.leagueId] = league;
  }
  return byLeague;
}
