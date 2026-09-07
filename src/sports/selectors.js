import { teams } from './types.js';
import {
  getPriorityTier,
  isMajorGameForPriority,
  isMajorUclGameForPriority,
  sortGamesByPriority,
} from './priority.js';

const MY_GAMES_WINDOW_DAYS = 7;
const MY_GAMES_SECTION_LIMIT = 5;

const favoriteTeamIds = new Set(
  teams.filter((team) => team.favorite).map((team) => team.id),
);

const mustSeeTeamIds = new Set(
  teams
    .filter((team) => team.favoriteTier === 'must-see')
    .map((team) => team.id),
);

function gameHasTeam(game, teamIds) {
  return teamIds.has(game.homeTeamId) || teamIds.has(game.awayTeamId);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function getLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isWithinRange(game, start, endExclusive) {
  const time = new Date(game.startTime).getTime();
  return time >= start.getTime() && time < endExclusive.getTime();
}

function isFavoriteGame(game) {
  return gameHasTeam(game, favoriteTeamIds);
}

function isMustSeeGame(game) {
  return gameHasTeam(game, mustSeeTeamIds);
}

function isMajorEvent(game) {
  return (
    game.isMajorEvent === true ||
    game.eventType === 'championship' ||
    game.eventType === 'final'
  );
}

function isLive(game) {
  return game.status === 'live';
}

function isDisplayableMyGame(game) {
  return (
    isFavoriteGame(game) ||
    isMustSeeGame(game) ||
    isMajorEvent(game) ||
    isMajorGameForPriority(game) ||
    isMajorUclGameForPriority(game) ||
    (game.leagueId === 'nfl' && game.eventType !== 'preseason') ||
    (game.leagueId === 'ufc' && game.eventType === 'main-card')
  );
}

function compareForDisplay(a, b) {
  const liveDifference = Number(isLive(b)) - Number(isLive(a));
  if (liveDifference !== 0) {
    return liveDifference;
  }

  const priorityOrder = sortGamesByPriority([a, b]);
  const firstId = priorityOrder[0]?.id;

  if (firstId === a.id && firstId !== b.id) {
    return -1;
  }

  if (firstId === b.id && firstId !== a.id) {
    return 1;
  }

  return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
}

/** Returns all games for a specific calendar date in local time. */
export function getGamesForDate(games, date) {
  const start = startOfDay(date);
  const end = addDays(start, 1);

  return games
    .filter((game) => isWithinRange(game, start, end))
    .sort(compareForDisplay);
}

/**
 * Returns the seven-date My Games scope: today through the next six calendar dates.
 * Category scope is determined by isDisplayableMyGame; UI sections decide how many
 * of those scoped games to surface.
 */
export function getMyGamesWindow(games, now = new Date()) {
  const start = startOfDay(now);
  const endExclusive = addDays(start, MY_GAMES_WINDOW_DAYS);

  return games
    .filter((game) => isWithinRange(game, start, endExclusive))
    .filter(isDisplayableMyGame)
    .sort(compareForDisplay);
}

/**
 * Returns the complete seven-day scoped set. No artificial daily cap is applied here.
 * This keeps the source-of-truth scope intact so the Today and Next 7 Days sections
 * can independently take their top five.
 */
export function getMyGames(games, now = new Date()) {
  return getMyGamesWindow(games, now);
}

/** Returns today's top five games, or fewer when today's scoped category has fewer than five. */
export function getTodayMyGames(games, now = new Date()) {
  const todayKey = getLocalDateKey(now);
  return getMyGames(games, now)
    .filter((game) => getLocalDateKey(new Date(game.startTime)) === todayKey)
    .sort(compareForDisplay)
    .slice(0, MY_GAMES_SECTION_LIMIT);
}

/**
 * Returns the next six dates in the seven-day window (tomorrow through today + 6),
 * limited to the five highest-priority games across that period.
 */
export function getUpcomingMyGames(games, now = new Date()) {
  const start = addDays(startOfDay(now), 1);
  const endExclusive = addDays(startOfDay(now), MY_GAMES_WINDOW_DAYS);

  return getMyGamesWindow(games, now)
    .filter((game) => isWithinRange(game, start, endExclusive))
    .sort(compareForDisplay)
    .slice(0, MY_GAMES_SECTION_LIMIT);
}

/** Returns today's and upcoming section games as a compact presentation model. */
export function getMyGamesSections(games, now = new Date()) {
  return {
    today: getTodayMyGames(games, now),
    upcoming: getUpcomingMyGames(games, now),
  };
}

export function groupMyGamesByDate(games, now = new Date()) {
  const grouped = new Map();

  for (const game of getMyGames(games, now)) {
    const key = getLocalDateKey(new Date(game.startTime));
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(game);
  }

  return grouped;
}

export function getPriorityForGame(game) {
  return getPriorityTier(game);
}

export { MY_GAMES_WINDOW_DAYS, MY_GAMES_SECTION_LIMIT };
