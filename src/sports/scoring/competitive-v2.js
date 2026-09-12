function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function normalizeRank(rank, maxRank) {
  if (!Number.isFinite(rank) || rank < 1) return null;
  return clamp(1 - (rank - 1) / Math.max(1, maxRank - 1));
}

function normalizeRunDifferential(runDifferential) {
  if (!Number.isFinite(runDifferential)) return null;
  return clamp(0.5 + 0.5 * Math.tanh(runDifferential / 80));
}

function relevantSplit(team, isHome) {
  const wins = isHome ? team?.homeWins : team?.awayWins;
  const losses = isHome ? team?.homeLosses : team?.awayLosses;
  const percentage = isHome ? team?.homeWinPercentage : team?.awayWinPercentage;
  if (Number.isFinite(percentage)) return clamp(percentage);
  if (Number.isFinite(wins) && Number.isFinite(losses) && wins + losses > 0) return wins / (wins + losses);
  return null;
}

function mlbStrength(team, isHome) {
  const signals = [];
  if (Number.isFinite(team?.winPercentage)) signals.push([team.winPercentage, 0.40]);
  const rank = normalizeRank(team?.leagueRank, 30);
  if (rank !== null) signals.push([rank, 0.20]);
  const runDifferential = normalizeRunDifferential(team?.runDifferential);
  if (runDifferential !== null) signals.push([runDifferential, 0.25]);
  const split = relevantSplit(team, isHome);
  if (split !== null) signals.push([split, 0.15]);
  if (!signals.length) return null;
  const weight = signals.reduce((sum, [, signalWeight]) => sum + signalWeight, 0);
  return signals.reduce((sum, [value, signalWeight]) => sum + value * signalWeight, 0) / weight;
}

function confidence(team) {
  if (!team) return 0;
  let fields = 0;
  if (Number.isFinite(team.winPercentage)) fields += 1;
  if (Number.isFinite(team.leagueRank)) fields += 1;
  if (Number.isFinite(team.runDifferential)) fields += 1;
  if (Number.isFinite(team.homeWinPercentage) || Number.isFinite(team.awayWinPercentage)) fields += 1;
  return fields / 4;
}

function scoreMlb(game) {
  const home = mlbStrength(game.homeTeam, true);
  const away = mlbStrength(game.awayTeam, false);

  if (home === null && away === null) {
    return { score: 8, max: 25, confidence: 0.2, reasons: ['Limited MLB team-strength data'] };
  }

  const values = [home, away].filter((value) => value !== null);
  const quality = values.reduce((sum, value) => sum + value, 0) / values.length;
  const balance = values.length === 2 ? 1 - Math.abs(home - away) : 0.5;
  const score = Math.round(25 * (0.65 * balance + 0.35 * quality));
  const confidenceValue = (confidence(game.homeTeam) + confidence(game.awayTeam)) / (home !== null && away !== null ? 2 : 1);
  const reasons = [];

  if (balance >= 0.92) reasons.push('Very evenly matched');
  else if (balance >= 0.82) reasons.push('Competitive matchup');
  if (quality >= 0.72) reasons.push('High-quality MLB teams');
  if (Number.isFinite(game.homeTeam?.runDifferential) && Number.isFinite(game.awayTeam?.runDifferential)) reasons.push('Run differential included');
  if (Number.isFinite(game.homeTeam?.homeWinPercentage) || Number.isFinite(game.awayTeam?.awayWinPercentage)) reasons.push('Home/away split included');

  return {
    score: Math.max(0, Math.min(25, score)),
    max: 25,
    confidence: Math.min(0.95, 0.35 + 0.65 * confidenceValue),
    reasons,
  };
}

function ncaafRank(team) {
  return normalizeRank(team?.ranking ?? team?.rank ?? team?.apRanking ?? team?.pollRanking, 25);
}

function ncaafWinPct(team) {
  return Number.isFinite(team?.winPercentage) ? clamp(team.winPercentage) : null;
}

function ncaafStrength(team) {
  const signals = [];
  const rank = ncaafRank(team);
  if (rank !== null) signals.push([rank, 0.55]);
  const winPct = ncaafWinPct(team);
  if (winPct !== null) signals.push([winPct, rank === null ? 0.85 : 0.35]);
  if (!signals.length) return null;
  const weight = signals.reduce((sum, [, signalWeight]) => sum + signalWeight, 0);
  return signals.reduce((sum, [value, signalWeight]) => sum + value * signalWeight, 0) / weight;
}

function ncaafSpreadCompetitiveness(game) {
  const spread = Number(game?.odds?.spread ?? game?.bettingOdds?.spread ?? game?.market?.spread);
  if (!Number.isFinite(spread)) return null;
  const absoluteSpread = Math.abs(spread);
  return clamp(1 - absoluteSpread / 28);
}

function scoreNcaaf(game) {
  const home = ncaafStrength(game.homeTeam);
  const away = ncaafStrength(game.awayTeam);
  const strengths = [home, away].filter((value) => value !== null);

  if (strengths.length === 0) {
    return { score: 6, max: 25, confidence: 0.2, reasons: ['Limited NCAA team-strength data'] };
  }

  const quality = strengths.reduce((sum, value) => sum + value, 0) / strengths.length;
  const balance = strengths.length === 2 ? 1 - Math.abs(home - away) : 0.45;
  const spread = ncaafSpreadCompetitiveness(game);
  const rankedHome = ncaafRank(game.homeTeam);
  const rankedAway = ncaafRank(game.awayTeam);
  const rankedCount = [rankedHome, rankedAway].filter((value) => value !== null).length;

  let competitive = 0.45 * balance + 0.30 * quality;
  if (spread !== null) competitive = competitive * 0.70 + spread * 0.30;
  if (rankedCount === 2 && balance >= 0.80) competitive += 0.10;
  competitive = clamp(competitive);

  const score = Math.round(25 * competitive);
  const dataFields = [home, away, spread].filter((value) => value !== null).length;
  const confidenceValue = Math.min(0.95, 0.25 + dataFields * 0.20);
  const reasons = [];

  if (rankedCount === 2) reasons.push('Ranked-vs-ranked');
  else if (rankedCount === 1) reasons.push('Ranked team involved');
  if (balance >= 0.90) reasons.push('Very evenly matched');
  else if (balance >= 0.78) reasons.push('Competitive matchup');
  if (quality >= 0.80) reasons.push('High-quality teams');
  if (spread !== null && spread >= 0.75) reasons.push('Close projected game');

  return {
    score: Math.max(0, Math.min(25, score)),
    max: 25,
    confidence: confidenceValue,
    reasons: reasons.slice(0, 3),
  };
}

export function scoreCompetitiveV2(game) {
  if (game.leagueId === 'mlb') return scoreMlb(game);
  if (game.leagueId === 'ncaa-football') return scoreNcaaf(game);

  const strength = (team) => Number.isFinite(team?.winPercentage) ? team.winPercentage : null;
  const home = strength(game.homeTeam);
  const away = strength(game.awayTeam);

  if (home === null || away === null) {
    return { score: 8, max: 25, confidence: 0.35, reasons: ['Limited team-strength data'] };
  }

  const balance = 1 - Math.abs(home - away);
  const quality = (home + away) / 2;
  const score = Math.round(25 * (0.45 * balance + 0.55 * quality));
  const reasons = [];

  if (balance >= 0.9) reasons.push('Very evenly matched');
  else if (balance >= 0.75) reasons.push('Competitive matchup');
  if (quality >= 0.8) reasons.push('Elite-quality matchup');
  else if (quality >= 0.65) reasons.push('High-quality teams');

  return { score: Math.max(0, Math.min(25, score)), max: 25, confidence: 0.9, reasons };
}
