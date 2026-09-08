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

export const favoriteTeamIds = new Set(teams.filter((team) => team.favorite).map((team) => team.id));
