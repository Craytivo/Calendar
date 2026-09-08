const NFL_AVG_TOTAL = 45.0;

function finite(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function firstFinite(...values) {
  for (const value of values) {
    const parsed = finite(value);
    if (parsed !== undefined) return parsed;
  }
  return undefined;
}

function getMarket(game) {
  const market = game?.odds ?? game?.bettingOdds ?? game?.market ?? {};
  const spread = firstFinite(
    market.spread,
    market.pointSpread,
    market.homeSpread,
    game?.spread,
    game?.pointSpread,
    game?.homeSpread,
  );
  const total = firstFinite(
    market.total,
    market.overUnder,
    market.overUnderTotal,
    game?.total,
    game?.overUnder,
    game?.overUnderTotal,
  );
  return { spread, total };
}

// NFL market context is intentionally bounded. Betting lines are useful as a
// pregame signal, but they should not overwhelm game importance, favorites, or
// live-game drama. The closing market is also a forecast of expected outcome,
// not a direct measure of entertainment.
export function getNFLMarketContext(game) {
  if (game?.leagueId !== 'nfl') {
    return { available: false, spread: undefined, total: undefined, competitivenessScore: 0, scoringEnvironmentScore: 0, marketExcitementScore: 0 };
  }

  const { spread, total } = getMarket(game);
  if (spread === undefined && total === undefined) {
    return { available: false, spread, total, competitivenessScore: 0, scoringEnvironmentScore: 0, marketExcitementScore: 0 };
  }

  // Smaller absolute spreads imply a tighter expected game. Use a smooth
  // decay rather than a hard cutoff so a 3.5-point game is only modestly
  // less competitive than a 2.5-point game.
  const competitivenessScore = spread === undefined
    ? 0
    : Math.round(100 * Math.exp(-Math.abs(spread) / 7));

  // Normalize the expected scoring environment around the current NFL mean.
  // A 45-point total is neutral; totals substantially above/below it move the
  // signal toward higher/lower expected scoring without dominating the score.
  const scoringEnvironmentScore = total === undefined
    ? 0
    : Math.max(0, Math.min(100, Math.round(50 + (total - NFL_AVG_TOTAL) * 4)));

  const marketSignals = [
    spread === undefined ? undefined : competitivenessScore,
    total === undefined ? undefined : scoringEnvironmentScore,
  ].filter((value) => value !== undefined);

  const marketExcitementScore = marketSignals.length === 1
    ? marketSignals[0]
    : Math.round((competitivenessScore * 0.6) + (scoringEnvironmentScore * 0.4));

  return {
    available: true,
    spread,
    total,
    competitivenessScore,
    scoringEnvironmentScore,
    marketExcitementScore,
  };
}

export function getNFLMarketScore(game) {
  const context = getNFLMarketContext(game);
  if (!context.available) return 0;

  // Keep the market contribution deliberately modest. This is a contextual
  // prior, not the Game Score itself.
  return Math.round(context.marketExcitementScore * 0.16);
}
