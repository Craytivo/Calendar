export function scoreNarrative(game, favoriteTeamIds = new Set()) {
  let score = 0;
  const reasons = [];

  if (game.isRivalry === true) {
    score += 7;
    reasons.push('Rivalry');
  }
  if (game.isDivisional === true) {
    score += 3;
    reasons.push('Divisional matchup');
  }
  if (game.isMajorEvent === true) {
    score += 2;
    reasons.push('Major event');
  }

  const isFavorite = favoriteTeamIds.has(game.homeTeamId) || favoriteTeamIds.has(game.awayTeamId);
  if (isFavorite && game.isRivalry === true) {
    score += 3;
    reasons.push('Favorite-team rivalry');
  }

  return {
    score: Math.min(score, 10),
    max: 10,
    confidence: 0.85,
    reasons: [...new Set(reasons)],
  };
}
