import { PRIORITY_TIERS, teams } from './types';

const mustSeeTeamIds = new Set(
  teams
    .filter((team) => team.favoriteTier === 'must-see')
    .map((team) => team.id),
);

const favoriteTeamIds = new Set(
  teams
    .filter((team) => team.favorite)
    .map((team) => team.id),
);

function gameHasTeam(game, teamIds) {
  return teamIds.has(game.homeTeamId) || teamIds.has(game.awayTeamId);
}

/**
 * Returns the user's priority tier for a game.
 * Lower tiers are more important.
 *
 * Rules are deliberately ordered from strongest to weakest so a game can
 * never lose a higher-priority classification because of a lower rule.
 */
export function getPriorityTier(game) {
  if (game.leagueId === 'ucl') {
    return PRIORITY_TIERS.CHAMPIONS_LEAGUE;
  }

  if (
    game.leagueId === 'ufc' &&
    game.eventType === 'main-card'
  ) {
    return PRIORITY_TIERS.MUST_SEE;
  }

  if (gameHasTeam(game, mustSeeTeamIds)) {
    return PRIORITY_TIERS.MUST_SEE;
  }

  if (gameHasTeam(game, favoriteTeamIds)) {
    return PRIORITY_TIERS.FAVORITE_TEAM;
  }

  if (game.eventType === 'championship' || game.isMajorEvent) {
    return PRIORITY_TIERS.MAJOR_EVENT;
  }

  if (game.isRivalry || game.hasPlayoffImplications) {
    return PRIORITY_TIERS.MAJOR_GAME;
  }

  return PRIORITY_TIERS.NORMAL;
}

export function getPriorityLabel(tier) {
  const labels = {
    [PRIORITY_TIERS.CHAMPIONS_LEAGUE]: 'Champions League',
    [PRIORITY_TIERS.MUST_SEE]: 'Must See',
    [PRIORITY_TIERS.FAVORITE_TEAM]: 'Favorite Team',
    [PRIORITY_TIERS.MAJOR_EVENT]: 'Major Event',
    [PRIORITY_TIERS.MAJOR_GAME]: 'Major Game',
    [PRIORITY_TIERS.NORMAL]: 'Normal',
  };

  return labels[tier] ?? 'Normal';
}

export function sortGamesByPriority(games) {
  return [...games].sort((a, b) => {
    const tierDifference = getPriorityTier(a) - getPriorityTier(b);

    if (tierDifference !== 0) {
      return tierDifference;
    }

    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });
}
