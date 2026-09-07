const UCL_KNOCKOUT_STAGES = new Set([
  'knockout-playoff',
  'round-of-16',
  'quarter-final',
  'semi-final',
]);

const DOMESTIC_RACE_CONFIG = {
  epl: { uclCutoff: 5, titleBand: 3 },
  laliga: { uclCutoff: 3, titleBand: 3 },
};

function text(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function normalizeUclStage(raw = {}, startTime) {
  const rawText = [raw.strEvent, raw.strEventAlternate, raw.strRound, raw.intRound]
    .map(text)
    .join(' ');

  if (rawText.includes('final')) return 'final';
  if (rawText.includes('semi-final') || rawText.includes('semi final') || rawText.includes('semi')) return 'semi-final';
  if (rawText.includes('quarter-final') || rawText.includes('quarter final') || rawText.includes('quarter')) return 'quarter-final';
  if (rawText.includes('round of 16') || rawText.includes('round-of-16')) return 'round-of-16';
  if (rawText.includes('knockout play-off') || rawText.includes('knockout playoff') || rawText.includes('play-off') || rawText.includes('playoff')) return 'knockout-playoff';

  const date = new Date(startTime ?? raw.strTimestamp ?? raw.dateEvent);
  const month = date.getUTCMonth() + 1;
  if (month >= 9 || month === 1) return 'league-phase';
  if (month >= 2 && month <= 5) return 'knockout';
  if (month >= 7 && month <= 8) return 'qualifying';
  return undefined;
}

export function isUclLeaguePhaseStage(stage) {
  return stage === 'league-phase';
}

export function isUclKnockoutStage(stage) {
  return UCL_KNOCKOUT_STAGES.has(stage) || stage === 'knockout';
}

export function isUclTwoLegStage(stage) {
  return isUclKnockoutStage(stage);
}

export function buildUclTieKey(game) {
  if (game.leagueId !== 'ucl' || !isUclTwoLegStage(game.uclStage)) return undefined;
  const teams = [game.homeTeamId, game.awayTeamId].filter(Boolean).sort();
  if (teams.length !== 2) return undefined;
  return `ucl:${game.uclStage}:${teams.join(':')}`;
}

export function applyUclTieContext(games) {
  const groups = new Map();
  for (const game of games) {
    const tieKey = buildUclTieKey(game);
    if (!tieKey) continue;
    if (!groups.has(tieKey)) groups.set(tieKey, []);
    groups.get(tieKey).push(game);
  }

  return games.map((game) => {
    const tieKey = buildUclTieKey(game);
    if (!tieKey) return game;
    const tieGames = [...groups.get(tieKey)].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
    const legIndex = tieGames.findIndex((candidate) => candidate.id === game.id);
    return {
      ...game,
      tieId: tieKey,
      isTwoLegTie: true,
      ...(tieGames.length >= 2 && legIndex >= 0
        ? { leg: legIndex + 1, isFirstLeg: legIndex === 0, isSecondLeg: legIndex === 1 }
        : {}),
    };
  });
}

function hasMeaningfulDomesticRace(game) {
  const config = DOMESTIC_RACE_CONFIG[game.leagueId];
  if (!config || !game.homeTeam || !game.awayTeam) return false;

  const teams = [game.homeTeam, game.awayTeam];
  const played = teams.map((team) => team.gamesPlayed).filter((value) => typeof value === 'number');
  if (played.length < 2 || Math.min(...played) < 10) return false;

  const ranks = teams.map((team) => team.leagueRank);
  if (ranks.some((rank) => typeof rank !== 'number')) return false;

  const [homeRank, awayRank] = ranks;
  const bothInQualificationRace = homeRank <= config.uclCutoff + 2 && awayRank <= config.uclCutoff + 2;
  const bothInTitleRace = homeRank <= config.titleBand && awayRank <= config.titleBand;

  return bothInQualificationRace || bothInTitleRace;
}

export function applyDomesticSoccerRaceContext(games) {
  return games.map((game) => {
    if (!['epl', 'laliga'].includes(game.leagueId)) return game;
    return hasMeaningfulDomesticRace(game)
      ? { ...game, hasTitleOrUclQualificationImplications: true }
      : game;
  });
}
