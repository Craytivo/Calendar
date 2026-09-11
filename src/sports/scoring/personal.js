export function scorePersonal(game, favoriteTeamIds = new Set(), mustSeeTeamIds = new Set()) {
  const homeFavorite = favoriteTeamIds.has(game.homeTeamId);
  const awayFavorite = favoriteTeamIds.has(game.awayTeamId);
  const hasMustSee = mustSeeTeamIds.has(game.homeTeamId) || mustSeeTeamIds.has(game.awayTeamId);

  let score = 0;
  const reasons = [];

  if (hasMustSee) {
    score = 15;
    reasons.push('Must-see team');
  } else if (homeFavorite || awayFavorite) {
    score = 11;
    reasons.push('Favorite team');
  }

  return {
    score,
    max: 15,
    confidence: 1,
    reasons,
  };
}
