import { getPriorityReasons, getPriorityScore, getPriorityTier, getLeaguePriority, isMajorGameForPriority, isMajorUclGameForPriority } from './priority.js';
import { getWatchScore } from './watchability.js';

function localKey(value) { const date = new Date(value); return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function rank(game) { return getPriorityTier(game) * -1000 + getPriorityScore(game) * 10 + getWatchScore(game) - getLeaguePriority(game.leagueId) * .01; }
export function getGamesForDay(games, date) { const key = localKey(date); return games.filter((game) => localKey(game.startTime) === key); }
export function getDaySummary(games, date) {
  const dayGames = getGamesForDay(games, date);
  const meaningful = dayGames.filter((game) => getPriorityTier(game) <= 5 || isMajorGameForPriority(game) || isMajorUclGameForPriority(game)).sort((a,b) => rank(b)-rank(a));
  const favorites = dayGames.filter((game) => getPriorityTier(game) <= 2);
  const live = dayGames.filter((game) => game.status === 'live');
  const top = meaningful[0] ?? dayGames.sort((a,b) => rank(b)-rank(a))[0] ?? null;
  const reasons = top ? getPriorityReasons(top) : [];
  return { total: dayGames.length, meaningful: meaningful.length, favorites: favorites.length, live: live.length, topGame: top, reasons, games: meaningful.slice(0,5) };
}
export function getWeeklyRadar(games, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Array.from({length:7}, (_,i) => new Date(start.getFullYear(), start.getMonth(), start.getDate()+i));
  const ranked = games.filter((game) => new Date(game.startTime).getTime() >= start.getTime()).sort((a,b) => rank(b)-rank(a) || new Date(a.startTime)-new Date(b.startTime));
  const mustWatch = ranked.filter((game) => getPriorityTier(game) <= 2 || isMajorUclGameForPriority(game)).slice(0,5);
  const major = ranked.filter((game) => getPriorityTier(game) >= 3 && (isMajorGameForPriority(game) || isMajorUclGameForPriority(game))).slice(0,5);
  return { gameOfWeek: ranked[0] ?? null, mustWatch, major, days: days.map((date) => ({ date, summary: getDaySummary(games,date) })) };
}
