const VALID_STATUSES = new Set(['scheduled', 'live', 'final', 'postponed', 'cancelled']);
const VALID_EVENT_TYPES = new Set(['regular-season','postseason','playoff','championship','final','elimination','knockout','tournament','main-card']);
const VALID_CLOCK_MODES = new Set(['elapsed', 'remaining', 'inning']);

function firstDefined(...values) { return values.find((value) => value !== undefined && value !== null && value !== ''); }
function toNumber(value) { if (typeof value === 'number' && Number.isFinite(value)) return value; if (typeof value === 'string' && value.trim() !== '') { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : undefined; } return undefined; }
function toBoolean(value) { if (value === true || value === false) return value; if (typeof value === 'string') { if (value.toLowerCase() === 'true') return true; if (value.toLowerCase() === 'false') return false; } return undefined; }

export function normalizeStatus(value) { const status = String(value ?? '').toLowerCase(); if (['live','in_progress','in-progress'].includes(status)) return 'live'; if (['final','completed','complete'].includes(status)) return 'final'; if (['postponed','delayed'].includes(status)) return 'postponed'; if (['cancelled','canceled'].includes(status)) return 'cancelled'; return 'scheduled'; }
export function normalizeEventType(value, fallback = 'regular-season') { const type = String(value ?? fallback).toLowerCase(); return VALID_EVENT_TYPES.has(type) ? type : fallback; }
export function getClockMode(leagueId) {
  const id = String(leagueId ?? '').toLowerCase();
  if (['soccer', 'epl', 'laliga', 'ucl', 'epl-cup', 'ufc'].includes(id)) return 'elapsed';
  if (['nfl', 'nba', 'ncaa-football', 'nhl'].includes(id)) return 'remaining';
  if (id === 'mlb') return 'inning';
  return undefined;
}

export function normalizeTeam(raw = {}) { return { id: String(firstDefined(raw.id, raw.teamId, raw.uid, raw.slug, raw.name) ?? '').trim(), name: String(firstDefined(raw.name, raw.displayName, raw.shortName, raw.abbreviation) ?? '').trim(), abbreviation: String(firstDefined(raw.abbreviation, raw.abbr, raw.shortName, raw.name) ?? '').trim(), leagueId: String(firstDefined(raw.leagueId, raw.league, raw.sport) ?? '').trim(), favorite: raw.favorite === true, favoriteTier: raw.favoriteTier, ...(firstDefined(raw.logoUrl, raw.logo, raw.logoURL, raw.badge) ? { logoUrl: String(firstDefined(raw.logoUrl, raw.logo, raw.logoURL, raw.badge)).trim() } : {}), ...(firstDefined(raw.primaryColor, raw.color, raw.teamColor) ? { primaryColor: String(firstDefined(raw.primaryColor, raw.color, raw.teamColor)).trim() } : {}) }; }
export function normalizeTeamContext(raw = {}) { const team = raw.team ?? raw; const context = normalizeTeam(team); const winPercentage = toNumber(firstDefined(raw.winPercentage,raw.winningPercentage,raw.winPct,team.winPercentage,team.winningPercentage,team.winPct)); const gamesPlayed = toNumber(firstDefined(raw.gamesPlayed,raw.games,team.gamesPlayed,team.games)); const conferenceRank = toNumber(firstDefined(raw.conferenceRank,raw.conferencePosition,team.conferenceRank,team.conferencePosition)); const leagueRank = toNumber(firstDefined(raw.leagueRank,raw.standing,raw.position,team.leagueRank,team.standing,team.position)); const ranking = toNumber(firstDefined(raw.ranking,raw.apRanking,raw.rank,team.ranking,team.apRanking,team.rank)); const wins = toNumber(firstDefined(raw.wins,team.wins)); const losses = toNumber(firstDefined(raw.losses,team.losses)); const ties = toNumber(firstDefined(raw.ties,team.ties)); const points = toNumber(firstDefined(raw.points,raw.leaguePoints,team.points,team.leaguePoints)); const goalDifference = toNumber(firstDefined(raw.goalDifference,raw.goalDiff,team.goalDifference,team.goalDiff)); const score = toNumber(firstDefined(raw.score,raw.pointsScored,team.score)); return { ...context, ...(winPercentage !== undefined ? {winPercentage}:{}), ...(gamesPlayed !== undefined ? {gamesPlayed}:{}), ...(conferenceRank !== undefined ? {conferenceRank}:{}), ...(leagueRank !== undefined ? {leagueRank}:{}), ...(ranking !== undefined ? {ranking}:{}), ...(wins !== undefined ? {wins}:{}), ...(losses !== undefined ? {losses}:{}), ...(ties !== undefined ? {ties}:{}), ...(points !== undefined ? {points}:{}), ...(goalDifference !== undefined ? {goalDifference}:{}), ...(score !== undefined ? {score}:{} ) }; }

export function normalizeGame(raw = {}) {
  const startTime = firstDefined(raw.startTime,raw.startDate,raw.date,raw.start);
  const status = normalizeStatus(firstDefined(raw.status,raw.gameStatus,raw.state));
  const eventType = normalizeEventType(firstDefined(raw.eventType,raw.type,raw.phase));
  const homeRaw = firstDefined(raw.homeTeam,raw.home,raw.homeCompetitor);
  const awayRaw = firstDefined(raw.awayTeam,raw.away,raw.awayCompetitor);
  const homeTeam = homeRaw ? normalizeTeamContext(homeRaw) : undefined;
  const awayTeam = awayRaw ? normalizeTeamContext(awayRaw) : undefined;
  const homeScore = toNumber(firstDefined(raw.homeScore,raw.homeTeam?.score,raw.home?.score,homeTeam?.score));
  const awayScore = toNumber(firstDefined(raw.awayScore,raw.awayTeam?.score,raw.away?.score,awayTeam?.score));
  const leagueId = String(firstDefined(raw.leagueId,raw.league,raw.competitionId,raw.sport) ?? '').trim();
  const clockMode = firstDefined(raw.clockMode, getClockMode(leagueId));
  const game = {
    id:String(firstDefined(raw.id,raw.gameId,raw.eventId,raw.uid) ?? '').trim(), leagueId,
    homeTeamId:firstDefined(raw.homeTeamId,raw.homeId,homeTeam?.id), awayTeamId:firstDefined(raw.awayTeamId,raw.awayId,awayTeam?.id),
    startTime:startTime ? new Date(startTime).toISOString() : '', venue:firstDefined(raw.venue,raw.venueName,raw.location), status,eventType,
    round:firstDefined(raw.round,raw.roundName), competitionId:firstDefined(raw.competitionId,raw.competition,raw.leagueId), competitionPhase:firstDefined(raw.competitionPhase,raw.phase),
    period:toNumber(firstDefined(raw.period,raw.periodNumber,raw.inning,raw.quarter)), clock:firstDefined(raw.clock,raw.displayClock,raw.gameClock), clockSeconds:toNumber(firstDefined(raw.clockSeconds,raw.remainingSeconds)),
    ...(VALID_CLOCK_MODES.has(clockMode) ? { clockMode } : {}),
    isOvertime:toBoolean(firstDefined(raw.isOvertime,raw.overtime)), network:firstDefined(raw.network,raw.broadcast,raw.broadcastName), uclStage:raw.uclStage, tieId:raw.tieId,
    isTwoLegTie:toBoolean(raw.isTwoLegTie), leg:toNumber(raw.leg), isFirstLeg:toBoolean(raw.isFirstLeg), isSecondLeg:toBoolean(raw.isSecondLeg), isDivisional:toBoolean(raw.isDivisional),
    isElimination:toBoolean(raw.isElimination), isMajorEvent:toBoolean(raw.isMajorEvent), isRivalry:toBoolean(raw.isRivalry), hasPlayoffImplications:toBoolean(raw.hasPlayoffImplications),
    hasSeedingImplications:toBoolean(raw.hasSeedingImplications), hasQualificationImplications:toBoolean(raw.hasQualificationImplications), hasTitleOrUclQualificationImplications:toBoolean(raw.hasTitleOrUclQualificationImplications),
    homeScore,awayScore,homeTeam,awayTeam,
    ...(raw.soccerStats ? { soccerStats: raw.soccerStats } : {})
  };
  return Object.fromEntries(Object.entries(game).filter(([,value]) => value !== undefined && value !== ''));
}
export function normalizeGames(rawGames = []) { return rawGames.map(normalizeGame).filter((game) => game.id && game.leagueId && game.startTime); }
export function isNormalizedGame(game) { return Boolean(game && game.id && game.leagueId && game.startTime && VALID_STATUSES.has(game.status) && VALID_EVENT_TYPES.has(game.eventType)); }
