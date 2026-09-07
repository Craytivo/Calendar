import { PRIORITY_TIERS, teams } from './types.js';

const mustSeeTeamIds = new Set(teams.filter((team) => team.favoriteTier === 'must-see').map((team) => team.id));
const favoriteTeamIds = new Set(teams.filter((team) => team.favorite).map((team) => team.id));
const realMadridTeamIds = new Set(['real-madrid']);

const LEAGUE_PRIORITY = { nfl: 0, nba: 1, 'ncaa-football': 2, ucl: 3, laliga: 4, epl: 5, mlb: 6, nhl: 7, ufc: 8 };

function gameHasTeam(game, teamIds) { return teamIds.has(game.homeTeamId) || teamIds.has(game.awayTeamId); }
function bothTeamsMeet(game, predicate) { return Boolean(game.homeTeam && game.awayTeam && predicate(game.homeTeam) && predicate(game.awayTeam)); }
function isPlayoffOrPostseason(game) { return game.eventType === 'playoff' || game.eventType === 'postseason'; }
function isChampionship(game) { return game.eventType === 'championship' || game.eventType === 'final'; }
function isEliminationGame(game) { return game.isElimination === true; }
function hasMeaningfulImplications(game) { return game.hasPlayoffImplications === true || game.hasSeedingImplications === true || game.hasQualificationImplications === true; }
function isKnockoutGame(game) { return game.competitionPhase === 'knockout' || game.eventType === 'knockout'; }
function isMarchMadnessSweetSixteenOrLater(game) { return game.competitionId === 'march-madness' && ['sweet-16', 'elite-8', 'final-four', 'championship'].includes(game.round); }
function isUniversalMajorGame(game) { return isPlayoffOrPostseason(game) || isChampionship(game) || isEliminationGame(game) || hasMeaningfulImplications(game) || isMarchMadnessSweetSixteenOrLater(game); }

function isNflMajorGame(game) {
  if (game.leagueId !== 'nfl') return false;
  const divisional = game.isDivisional === true;
  const strongRecords = bothTeamsMeet(game, (team) => typeof team.winPercentage === 'number' && team.winPercentage >= 0.667);
  return divisional || strongRecords || hasMeaningfulImplications(game);
}

function isNflRegularGame(game) {
  return game.leagueId === 'nfl' && !isNflMajorGame(game) && !isUniversalMajorGame(game);
}

function isNbaMajorGame(game) {
  if (game.leagueId !== 'nba') return false;
  const enoughGamesPlayed = bothTeamsMeet(game, (team) => typeof team.gamesPlayed === 'number' && team.gamesPlayed >= 10);
  const topEight = bothTeamsMeet(game, (team) => typeof team.conferenceRank === 'number' && team.conferenceRank <= 8);
  const winningRecords = bothTeamsMeet(game, (team) => typeof team.winPercentage === 'number' && team.winPercentage >= 0.7);
  return (enoughGamesPlayed && topEight && winningRecords) || hasMeaningfulImplications(game);
}
function isNcaaFootballMajorGame(game) { if (game.leagueId !== 'ncaa-football') return false; return bothTeamsMeet(game, (team) => typeof team.ranking === 'number' && team.ranking >= 1 && team.ranking <= 25) || hasMeaningfulImplications(game); }
function isEplMajorGame(game) { if (game.leagueId !== 'epl') return false; return bothTeamsMeet(game, (team) => typeof team.leagueRank === 'number' && team.leagueRank <= 5) || game.hasTitleOrUclQualificationImplications === true; }
function isLaLigaMajorGame(game) { if (game.leagueId !== 'laliga') return false; return bothTeamsMeet(game, (team) => typeof team.leagueRank === 'number' && team.leagueRank <= 3) || game.hasTitleOrUclQualificationImplications === true; }
function isMlbPlayoffGame(game) { return game.leagueId === 'mlb' && isPlayoffOrPostseason(game); }
function isLeagueSpecificMajorGame(game) { return isNflMajorGame(game) || isNbaMajorGame(game) || isNcaaFootballMajorGame(game) || isEplMajorGame(game) || isLaLigaMajorGame(game); }
function isMajorGame(game) { return isUniversalMajorGame(game) || isLeagueSpecificMajorGame(game) || isMlbPlayoffGame(game); }
function isMajorUclGame(game) { if (game.leagueId !== 'ucl') return false; return gameHasTeam(game, realMadridTeamIds) || isKnockoutGame(game) || isChampionship(game) || isEliminationGame(game) || game.isMajorEvent === true || hasMeaningfulImplications(game); }

export function getPriorityTier(game) {
  if (isMajorUclGame(game)) return PRIORITY_TIERS.CHAMPIONS_LEAGUE;
  if (game.leagueId === 'ufc' && game.eventType === 'main-card') return PRIORITY_TIERS.MUST_SEE;
  if (gameHasTeam(game, mustSeeTeamIds)) return PRIORITY_TIERS.MUST_SEE;
  if (gameHasTeam(game, favoriteTeamIds)) return PRIORITY_TIERS.FAVORITE_TEAM;
  if (game.eventType === 'championship' || game.eventType === 'final' || game.isMajorEvent === true) return PRIORITY_TIERS.MAJOR_EVENT;
  if (isNflRegularGame(game)) return PRIORITY_TIERS.NORMAL;
  if (isMajorGame(game)) return PRIORITY_TIERS.MAJOR_GAME;
  return PRIORITY_TIERS.NORMAL;
}

export function isMajorGameForPriority(game) { return isMajorGame(game); }
export function isMajorUclGameForPriority(game) { return isMajorUclGame(game); }

export function getPriorityLabel(tier) {
  const labels = {
    [PRIORITY_TIERS.CHAMPIONS_LEAGUE]: 'Champions League',
    [PRIORITY_TIERS.MUST_SEE]: 'Must See',
    [PRIORITY_TIERS.FAVORITE_TEAM]: 'Favorite Team',
    [PRIORITY_TIERS.MAJOR_EVENT]: 'Major Event',
    [PRIORITY_TIERS.NFL_REGULAR]: 'NFL',
    [PRIORITY_TIERS.MAJOR_GAME]: 'Major Game',
    [PRIORITY_TIERS.NORMAL]: 'Normal',
  };
  return labels[tier] ?? 'Normal';
}

function getSecondaryPriority(game) {
  if (gameHasTeam(game, favoriteTeamIds) && game.isRivalry === true) return 0;
  if (isMajorGame(game) || isMajorUclGame(game)) return 1;
  return 2;
}

export function getLeaguePriority(leagueId) { return LEAGUE_PRIORITY[leagueId] ?? Number.MAX_SAFE_INTEGER; }

export function sortGamesByPriority(games) {
  return [...games].sort((a, b) => {
    const tierDifference = getPriorityTier(a) - getPriorityTier(b);
    if (tierDifference !== 0) return tierDifference;
    const secondaryDifference = getSecondaryPriority(a) - getSecondaryPriority(b);
    if (secondaryDifference !== 0) return secondaryDifference;
    const leagueDifference = getLeaguePriority(a.leagueId) - getLeaguePriority(b.leagueId);
    if (leagueDifference !== 0) return leagueDifference;
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });
}
