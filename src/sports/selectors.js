import { teams } from './types.js';
import { getPriorityScore, getPriorityTier, isMajorGameForPriority, isMajorUclGameForPriority } from './priority.js';
import { getWatchScore } from './watchability.js';
import { getLiveSignalRank } from './game-intelligence.js';

const MY_GAMES_WINDOW_DAYS = 7;
const MY_GAMES_SECTION_LIMIT = 5;
const NCAA_TOP_25_RANKING = 25;
const favoriteTeamIds = new Set(teams.filter((team) => team.favorite).map((team) => team.id));
const mustSeeTeamIds = new Set(teams.filter((team) => team.favoriteTier === 'must-see').map((team) => team.id));
function gameHasTeam(game, teamIds) { return teamIds.has(game.homeTeamId) || teamIds.has(game.awayTeamId); }
function startOfDay(date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
function addDays(date, days) { return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days); }
function getLocalDateKey(date) { const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; }
function isWithinRange(game, start, endExclusive) { const time = new Date(game.startTime).getTime(); return time >= start.getTime() && time < endExclusive.getTime(); }
function isFavoriteGame(game) { return gameHasTeam(game, favoriteTeamIds); }
function isMustSeeGame(game) { return gameHasTeam(game, mustSeeTeamIds); }
function isNcaaTop25Game(game) { if (game.leagueId !== 'ncaa-football') return false; const isRankedTop25 = (team) => { const ranking = Number(team?.ranking); return Number.isFinite(ranking) && ranking >= 1 && ranking <= NCAA_TOP_25_RANKING; }; return isRankedTop25(game.homeTeam) || isRankedTop25(game.awayTeam); }
function isMajorEvent(game) { return game.isMajorEvent === true || game.eventType === 'championship' || game.eventType === 'final'; }
function isDisplayableMyGame(game) { return isFavoriteGame(game) || isMustSeeGame(game) || isMajorEvent(game) || isMajorGameForPriority(game) || isMajorUclGameForPriority(game) || isNcaaTop25Game(game) || (game.leagueId === 'ufc' && game.eventType === 'main-card'); }
function isLive(game) { return game.status === 'live'; }
function compareForDisplay(a, b) {
  const liveDifference = Number(isLive(b)) - Number(isLive(a)); if (liveDifference !== 0) return liveDifference;
  if (isLive(a) && isLive(b)) { const signalDifference = getLiveSignalRank(a) - getLiveSignalRank(b); if (signalDifference !== 0) return signalDifference; }
  const priorityDifference = getPriorityTier(a) - getPriorityTier(b); if (priorityDifference !== 0) return priorityDifference;
  const watchDifference = getWatchScore(b) - getWatchScore(a); if (watchDifference !== 0) return watchDifference;
  const scoreDifference = getPriorityScore(b) - getPriorityScore(a); if (scoreDifference !== 0) return scoreDifference;
  return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
}
export function getGamesForDate(games, date) { const start = startOfDay(date); const end = addDays(start, 1); return games.filter((game) => isWithinRange(game, start, end)).sort(compareForDisplay); }
export function getMyGamesWindow(games, now = new Date()) { const start = startOfDay(now); const endExclusive = addDays(start, MY_GAMES_WINDOW_DAYS); return games.filter((game) => isWithinRange(game, start, endExclusive)).filter(isDisplayableMyGame).sort(compareForDisplay); }
export function getMyGames(games, now = new Date()) { return getMyGamesWindow(games, now); }
export function getTodayMyGames(games, now = new Date()) { const todayKey = getLocalDateKey(now); return getMyGames(games, now).filter((game) => getLocalDateKey(new Date(game.startTime)) === todayKey); }
export function getUpcomingMyGames(games, now = new Date()) { const todayKey = getLocalDateKey(now); return getMyGames(games, now).filter((game) => getLocalDateKey(new Date(game.startTime)) !== todayKey); }
export function getMyGamesSections(games, now = new Date()) { const allGames = getMyGames(games, now); const todayKey = getLocalDateKey(now); const today = allGames.filter((game) => getLocalDateKey(new Date(game.startTime)) === todayKey).slice(0, MY_GAMES_SECTION_LIMIT); const upcoming = allGames.filter((game) => getLocalDateKey(new Date(game.startTime)) !== todayKey).slice(0, MY_GAMES_SECTION_LIMIT); return { today, upcoming }; }
export function groupMyGamesByDate(games, now = new Date()) { const grouped = new Map(); for (const game of getMyGames(games, now)) { const key = getLocalDateKey(new Date(game.startTime)); if (!grouped.has(key)) grouped.set(key, []); grouped.get(key).push(game); } return grouped; }
export function getPriorityForGame(game) { return getPriorityTier(game); }
export { MY_GAMES_WINDOW_DAYS };