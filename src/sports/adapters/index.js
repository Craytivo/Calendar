import { normalizeGames } from './normalizer.js';

/**
 * Provider adapters should implement fetchGames and return provider-native data.
 * This boundary keeps provider-specific schemas out of the priority engine/UI.
 */
export function createSportsAdapter({ provider, fetchGames }) {
  if (!provider || typeof fetchGames !== 'function') {
    throw new Error('createSportsAdapter requires a provider name and fetchGames function');
  }

  return {
    provider,
    async getGames(options = {}) {
      const rawGames = await fetchGames(options);
      return normalizeGames(rawGames);
    },
  };
}

export { normalizeGame, normalizeGames, normalizeStatus, normalizeTeam, normalizeTeamContext, isNormalizedGame } from './normalizer.js';
export { THESPORTSDB_LEAGUES, normalizeTheSportsDbEvents, getTheSportsDbLeague } from './thesportsdb.js';
