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

function isDisplayableMyGame(game) {
  return (
    isFavoriteGame(game) ||
    isMustSeeGame(game) ||
    isMajorGameForPriority(game) ||
    isMajorUclGameForPriority(game) ||
    (game.leagueId === 'ufc' && game.eventType === 'main-card')
  );
}

function isLive(game) {
  return game.status === 'live';
}

function isNonFavoriteMajor(game) {
  return !isFavoriteGame(game) && isMajorGameForPriority(game);
}

function isNonFavoriteMajorUcl(game) {
  return !isFavoriteGame(game) && isMajorUclGameForPriority(game);
}

function compareForDisplay(a, b) {
  const liveDifference = Number(isLive(b)) - Number(isLive(a));
  if (liveDifference !== 0) {
    return liveDifference;
  }

  return sortGamesByPriority([a, b])[0] === a ? -1 : 1;
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
 * Returns the complete My Games window: today plus the next seven days.
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
 * Keeps every favorite game, then allows at most three non-favorite major
 * games/UCL games into the My Games window. The three slots are selected by
 * the existing priority engine, then by start time.
 */
export function getMyGames(games, now = new Date()) {
  const windowGames = getMyGamesWindow(games, now);
  const favoriteGames = windowGames.filter(isFavoriteGame);
  const mustSeeGames = windowGames.filter(isMustSeeGame);
  const nonFavoriteCandidates = windowGames.filter(
    (game) => isNonFavoriteMajor(game) || isNonFavoriteMajorUcl(game),
  );

  const selectedNonFavorites = sortGamesByPriority(nonFavoriteCandidates).slice(0, 3);
  const selectedIds = new Set(
    [...favoriteGames, ...mustSeeGames, ...selectedNonFavorites].map((game) => game.id),
  );

  return windowGames
    .filter((game) => selectedIds.has(game.id))
    .sort(compareForDisplay);
}

export function getTodayMyGames(games, now = new Date()) {
  const today = startOfDay(now);
  return getMyGames(games, now).filter((game) => {
    const start = startOfDay(new Date(game.startTime));
    return start.getTime() === today.getTime();
  });
}

export function getUpcomingMyGames(games, now = new Date()) {
  const today = startOfDay(now);
  const endExclusive = addDays(today, 8);

  return getMyGames(games, now).filter((game) => {
    const gameTime = new Date(game.startTime).getTime();
    return gameTime >= today.getTime() && gameTime < endExclusive.getTime();
  });
}

export function groupMyGamesByDate(games, now = new Date()) {
  const grouped = new Map();

  for (const game of getMyGames(games, now)) {
    const date = startOfDay(new Date(game.startTime));
    const key = date.toISOString().slice(0, 10);

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
