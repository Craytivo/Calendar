import { scoreGameV2 } from './scoring/index-v2.js';
import { getGameScoreComponents, getGameScoreSnapshot } from './game-score.js';

function percent(value) {
  return Number.isFinite(value) ? Math.round(value * 1000) / 10 : null;
}

function v2Contribution(component, max) {
  if (!component || !Number.isFinite(component.score) || !Number.isFinite(component.max) || component.max <= 0) return 0;
  return Math.round((component.score / component.max) * max * 10) / 10;
}

function teamApiData(team, split) {
  if (!team) return null;
  return {
    id: team.id,
    name: team.name,
    winPercentage: percent(team.winPercentage),
    leagueRank: Number.isFinite(team.leagueRank) ? team.leagueRank : null,
    runDifferential: Number.isFinite(team.runDifferential) ? team.runDifferential : null,
    splitWinPercentage: percent(team[split]),
    lastTenWinPercentage: percent(team.lastTenWinPercentage),
    wins: Number.isFinite(team.wins) ? team.wins : null,
    losses: Number.isFinite(team.losses) ? team.losses : null,
    lastTenWins: Number.isFinite(team.lastTenWins) ? team.lastTenWins : null,
    lastTenLosses: Number.isFinite(team.lastTenLosses) ? team.lastTenLosses : null,
  };
}

export function buildV2GameDiagnostic(game) {
  const score = scoreGameV2(game);
  const { competitive, teamQuality, stakes, narrative, form, personal } = score.breakdown;

  return {
    id: game.id,
    leagueId: game.leagueId,
    matchup: `${game.awayTeam?.name || game.awayTeamId || 'Away'} at ${game.homeTeam?.name || game.homeTeamId || 'Home'}`,
    apiData: {
      away: teamApiData(game.awayTeam, 'awayWinPercentage'),
      home: teamApiData(game.homeTeam, 'homeWinPercentage'),
    },
    v2: {
      competitive: v2Contribution(competitive, 30),
      teamQuality: v2Contribution(teamQuality, 20),
      stakes: v2Contribution(stakes, 20),
      narrative: v2Contribution(narrative, 15),
      form: v2Contribution(form, 10),
      personal: Math.round(Math.min(5, Math.max(0, personal?.score ?? 0) * (5 / 15)) * 10) / 10,
      total: score.total,
    },
    confidence: score.confidence,
    tier: score.tier,
    reasons: [
      ...(competitive.reasons || []),
      ...(teamQuality.reasons || []),
      ...(stakes.reasons || []),
      ...(narrative.reasons || []),
      ...(form.reasons || []),
      ...(personal.reasons || []),
    ],
    breakdown: score.breakdown,
  };
}

export function buildGameDiagnostic(game) {
  const snapshot = getGameScoreSnapshot(game);
  const v2 = buildV2GameDiagnostic(game);
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
    v2,
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
