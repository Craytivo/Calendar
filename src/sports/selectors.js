import { teams } from './types.js';
import {
  getPriorityTier,
  isMajorGameForPriority,
  isMajorUclGameForPriority,
  sortGamesByPriority,
} from './priority.js';

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

function isDisplayableMyGame(game) {
  return (
    isFavoriteGame(game) ||
    isMustSeeGame(game) ||
    isMajorEvent(game) ||
    isMajorGameForPriority(game) ||
    isMajorUclGameForPriority(game) ||
    (game.leagueId === 'ufc' && game.eventType === 'main-card')
  );
}

function isLive(game) {
  return game.status === 'live';
}

function isNonFavoriteMajor(game) {
  return !isFavoriteGame(game) && (
    isMajorEvent(game) ||
    isMajorGameForPriority(game)
  );
}

function isNonFavoriteMajorUcl(game) {
  return !isFavoriteGame(game) && isMajorUclGameForPriority(game);
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

/**
 * Returns all games for a specific calendar date in local time.
 * Completed games remain included so the day can retain its final results.
 */
export function getGamesForDate(games, date) {
  const start = startOfDay(date);
  const end = addDays(start, 1);

  return games
    .filter((game) => isWithinRange(game, start, end))
    .sort(compareForDisplay);
}

/**
 * Returns games in today's calendar date plus the following seven dates.
 * This is eight calendar dates total, including today.
 */
export function getMyGamesWindow(games, now = new Date()) {
  const start = startOfDay(now);
  const endExclusive = addDays(start, 8);

  return games
    .filter((game) => isWithinRange(game, start, endExclusive))
    .filter(isDisplayableMyGame)
    .sort(compareForDisplay);
}

/**
 * Builds the actual My Games set.
 *
 * Every favorite-team game is retained. Non-favorite major events/games are
 * capped at three PER CALENDAR DAY, not three across the whole eight-day window.
 */
export function getMyGames(games, now = new Date()) {
  const windowGames = getMyGamesWindow(games, now);
  const byDate = new Map();

  for (const game of windowGames) {
    const key = getLocalDateKey(new Date(game.startTime));
    if (!byDate.has(key)) {
      byDate.set(key, []);
    }
    byDate.get(key).push(game);
  }

  const selected = [];

  for (const dayGames of byDate.values()) {
    const favorites = dayGames.filter(isFavoriteGame);
    const nonFavoriteCandidates = dayGames.filter(
      (game) => isNonFavoriteMajor(game) || isNonFavoriteMajorUcl(game),
    );
    const selectedNonFavorites = sortGamesByPriority(nonFavoriteCandidates).slice(0, 3);

    selected.push(...favorites, ...selectedNonFavorites);
  }

  const selectedIds = new Set(selected.map((game) => game.id));

  return windowGames
    .filter((game) => selectedIds.has(game.id))
    .sort(compareForDisplay);
}

/**
 * Returns today's portion of My Games. Live games still rise to the top.
 */
export function getTodayMyGames(games, now = new Date()) {
  const todayKey = getLocalDateKey(now);

  return getMyGames(games, now).filter(
    (game) => getLocalDateKey(new Date(game.startTime)) === todayKey,
  );
}

/**
 * Returns My Games across the complete today-plus-seven-days window.
 */
export function getUpcomingMyGames(games, now = new Date()) {
  return getMyGames(games, now);
}

/**
 * Groups My Games by local calendar date for a future UI to render sections.
 */
export function groupMyGamesByDate(games, now = new Date()) {
  const grouped = new Map();

  for (const game of getMyGames(games, now)) {
    const key = getLocalDateKey(new Date(game.startTime));

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }

    grouped.get(key).push(game);
  }

  return grouped;
}

export function getPriorityForGame(game) {
  return getPriorityTier(game);
}
