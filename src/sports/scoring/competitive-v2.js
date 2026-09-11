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

export function scoreCompetitiveV2(game) {
  if (game.leagueId === 'mlb') return scoreMlb(game);

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
