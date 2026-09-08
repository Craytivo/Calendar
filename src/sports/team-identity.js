import { teams } from './types.js';

const aliases = {
  'sacramento kings': 'sac-kings',
  oregon: 'oregon-ducks',
  'oregon ducks': 'oregon-ducks',
  'university of oregon': 'oregon-ducks',
  'kansas state': 'kansas-state-wildcats',
  'kansas state wildcats': 'kansas-state-wildcats',
  ksu: 'kansas-state-wildcats',
  'washington state': 'washington-state-cougars',
  'washington state cougars': 'washington-state-cougars',
  wsu: 'washington-state-cougars',
  'real madrid': 'real-madrid',
  'real madrid cf': 'real-madrid',
  tottenham: 'tottenham',
  'tottenham hotspur': 'tottenham',
  'tottenham hotspur fc': 'tottenham',
  'toronto blue jays': 'blue-jays',
  'edmonton oilers': 'oilers',
  'los angeles dodgers': 'dodgers',
  'los angeles dodgers baseball club': 'dodgers',
  'minnesota vikings': 'vikings',
};

const FAVORITES_STORAGE_KEY = 'calendar:favorite-teams:v1';

const canonicalByName = new Map(
  teams.flatMap((team) => [
    [team.name.trim().toLowerCase(), team.id],
    [team.abbreviation.trim().toLowerCase(), team.id],
  ]),
);

for (const [name, id] of Object.entries(aliases)) canonicalByName.set(name, id);

export function cleanTeamName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function resolveCanonicalTeamId(team) {
  if (!team) return undefined;
  if (teams.some((candidate) => candidate.id === team.id)) return team.id;
  return canonicalByName.get(cleanTeamName(team.name)) || canonicalByName.get(cleanTeamName(team.abbreviation));
}

export function getCanonicalTeamIdByName(name) {
  return canonicalByName.get(cleanTeamName(name));
}

const defaultFavoriteTeamIds = new Set(teams.filter((team) => team.favorite).map((team) => team.id));

function readStoredFavoriteTeamIds() {
  if (typeof window === 'undefined') return null;
  try {
    const stored = JSON.parse(window.localStorage.getItem(FAVORITES_STORAGE_KEY) || 'null');
    if (!Array.isArray(stored)) return null;
    const validIds = new Set(teams.map((team) => team.id));
    const ids = stored.filter((id) => validIds.has(id));
    return new Set(ids);
  } catch {
    return null;
  }
}

function persistFavoriteTeamIds(ids) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Non-critical persistence.
  }
}

export const favoriteTeamIds = readStoredFavoriteTeamIds() ?? new Set(defaultFavoriteTeamIds);

export function getFavoriteTeamIds() {
  return new Set(favoriteTeamIds);
}

export function setFavoriteTeamIds(teamIds) {
  const validIds = new Set(teams.map((team) => team.id));
  favoriteTeamIds.clear();
  for (const id of teamIds ?? []) {
    if (validIds.has(id)) favoriteTeamIds.add(id);
  }
  persistFavoriteTeamIds(favoriteTeamIds);
  return getFavoriteTeamIds();
}

export function toggleFavoriteTeam(teamId) {
  if (!teams.some((team) => team.id === teamId)) return getFavoriteTeamIds();
  if (favoriteTeamIds.has(teamId)) favoriteTeamIds.delete(teamId);
  else favoriteTeamIds.add(teamId);
  persistFavoriteTeamIds(favoriteTeamIds);
  return getFavoriteTeamIds();
}

export function resetFavoriteTeamIds() {
  favoriteTeamIds.clear();
  for (const id of defaultFavoriteTeamIds) favoriteTeamIds.add(id);
  persistFavoriteTeamIds(favoriteTeamIds);
  return getFavoriteTeamIds();
}
