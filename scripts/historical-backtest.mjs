import fs from 'node:fs/promises';
import path from 'node:path';
import { getRawGameScore, getGameScoreSignals } from '../src/sports/game-score.js';

const OUTPUT_DIR = path.resolve('artifacts/historical-backtest');
const START_YEAR = Number(process.env.BACKTEST_START_YEAR || 2021);
const END_YEAR = Number(process.env.BACKTEST_END_YEAR || 2025);
const REQUEST_DELAY_MS = Number(process.env.BACKTEST_REQUEST_DELAY_MS || 75);

const LEAGUES = {
  nfl: { sport: 'football', league: 'nfl' },
  'ncaa-football': { sport: 'football', league: 'college-football' },
  nba: { sport: 'basketball', league: 'nba' },
  nhl: { sport: 'hockey', league: 'nhl' },
  mlb: { sport: 'baseball', league: 'mlb' },
  epl: { sport: 'soccer', league: 'eng.1' },
  'epl-cup': { sport: 'soccer', league: 'eng.league_cup' },
  laliga: { sport: 'soccer', league: 'esp.1' },
  ucl: { sport: 'soccer', league: 'uefa.champions' },
  ufc: { sport: 'mma', league: 'ufc' },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clamp = (n, min = 0, max = 100) => Math.min(max, Math.max(min, n));
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : undefined; };

function dateRanges(startYear, endYear) {
  const ranges = [];
  for (let year = startYear; year <= endYear; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      const start = new Date(Date.UTC(year, month - 1, 1));
      const end = new Date(Date.UTC(year, month, 0));
      ranges.push({
        start: start.toISOString().slice(0, 10).replaceAll('-', ''),
        end: end.toISOString().slice(0, 10).replaceAll('-', ''),
      });
    }
  }
  return ranges;
}

function eventToGame(event, leagueId, status = 'final') {
  const competition = event?.competitions?.[0] ?? {};
  const competitors = competition?.competitors ?? [];
  const home = competitors.find((c) => c.homeAway === 'home') ?? competitors[0];
  const away = competitors.find((c) => c.homeAway === 'away') ?? competitors[1];
  if (!home || !away) return null;

  const eventState = competition?.status ?? event?.status ?? {};
  const state = eventState?.type ?? {};
  const detail = String(state?.detail ?? state?.shortDetail ?? '').toLowerCase();
  const period = num(eventState?.period ?? state?.period);
  const clock = eventState?.displayClock ?? state?.displayClock;
  const clockSeconds = num(eventState?.clockSeconds ?? state?.clockSeconds);
  const overtime = /overtime|extra time|aet|shootout/.test(detail) || period > 4 && ['nfl', 'nba', 'nhl'].includes(leagueId) || period > 9 && leagueId === 'mlb';
  const seasonType = event?.season?.type;
  const postseason = Number(seasonType) === 3 || /playoff|postseason|final|championship|knockout/i.test(`${event?.name ?? ''} ${detail}`);
  const odds = competition?.odds?.[0];

  return {
    id: String(event.id),
    leagueId,
    startTime: event.date,
    status,
    eventType: postseason ? 'postseason' : 'regular-season',
    period,
    clock,
    clockSeconds,
    clockMode: ['epl', 'epl-cup', 'laliga', 'ucl', 'ufc'].includes(leagueId) ? 'elapsed' : leagueId === 'mlb' ? 'inning' : 'remaining',
    isOvertime: overtime,
    isElimination: /elimination|win or go home|must win/i.test(`${event?.name ?? ''} ${detail}`),
    isMajorEvent: postseason,
    hasPlayoffImplications: postseason,
    homeTeamId: String(home?.team?.id ?? home?.id ?? ''),
    awayTeamId: String(away?.team?.id ?? away?.id ?? ''),
    homeTeam: { id: String(home?.team?.id ?? home?.id ?? ''), name: home?.team?.displayName ?? home?.team?.name ?? home?.team?.shortDisplayName ?? 'Home' },
    awayTeam: { id: String(away?.team?.id ?? away?.id ?? ''), name: away?.team?.displayName ?? away?.team?.name ?? away?.team?.shortDisplayName ?? 'Away' },
    homeScore: status === 'final' ? num(home?.score) : undefined,
    awayScore: status === 'final' ? num(away?.score) : undefined,
    odds: odds ? normalizeOdds(odds) : undefined,
  };
}

function normalizeOdds(odds) {
  const spread = num(odds?.spread ?? odds?.details?.split(' ')[0]);
  const total = num(odds?.overUnder ?? odds?.total);
  const home = num(odds?.homeTeamOdds?.moneyLine ?? odds?.homeMoneyline ?? odds?.homeTeamOdds?.moneyline);
  const away = num(odds?.awayTeamOdds?.moneyLine ?? odds?.awayMoneyline ?? odds?.awayTeamOdds?.moneyline);
  const draw = num(odds?.drawOdds?.moneyLine ?? odds?.drawMoneyline);
  return {
    spread,
    total,
    homeMoneyline: home,
    awayMoneyline: away,
    ...(draw !== undefined ? { drawMoneyline: draw } : {}),
  };
}

async function fetchScoreboard(config, range) {
  const url = new URL(`https://site.api.espn.com/apis/site/v2/sports/${config.sport}/${config.league}/scoreboard`);
  url.searchParams.set('dates', `${range.start}-${range.end}`);
  url.searchParams.set('limit', '1000');
  const response = await fetch(url, { headers: { 'User-Agent': 'Craytivo-Calendar-Historical-Backtest/1.0' } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.json();
}

async function collectLeague(leagueId, config) {
  const byId = new Map();
  const errors = [];
  for (const range of dateRanges(START_YEAR, END_YEAR)) {
    try {
      const payload = await fetchScoreboard(config, range);
      for (const event of payload?.events ?? []) {
        const game = eventToGame(event, leagueId, 'final');
        if (game?.id && game.homeScore !== undefined && game.awayScore !== undefined) byId.set(game.id, game);
      }
    } catch (error) {
      errors.push({ range, error: error instanceof Error ? error.message : String(error) });
    }
    await sleep(REQUEST_DELAY_MS);
  }
  return { games: [...byId.values()], errors };
}

function percentile(sorted, value) {
  if (!sorted.length) return 0;
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] <= value) lo = mid + 1;
    else hi = mid;
  }
  return sorted.length <= 1 ? 1 : (lo - 1) / (sorted.length - 1);
}

function quantile(sorted, q) {
  if (!sorted.length) return 0;
  const index = (sorted.length - 1) * q;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function pearson(a, b) {
  const pairs = a.map((v, i) => [Number(v), Number(b[i])]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (pairs.length < 3) return 0;
  const ax = pairs.reduce((s, p) => s + p[0], 0) / pairs.length;
  const by = pairs.reduce((s, p) => s + p[1], 0) / pairs.length;
  let xy = 0; let xx = 0; let yy = 0;
  for (const [x, y] of pairs) { const dx = x - ax; const dy = y - by; xy += dx * dy; xx += dx * dx; yy += dy * dy; }
  return xx && yy ? xy / Math.sqrt(xx * yy) : 0;
}

function rank(values) {
  const indexed = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const ranks = Array(values.length);
  for (let i = 0; i < indexed.length;) {
    let j = i + 1;
    while (j < indexed.length && indexed[j].value === indexed[i].value) j += 1;
    const r = (i + j - 1) / 2 + 1;
    for (let k = i; k < j; k += 1) ranks[indexed[k].index] = r;
    i = j;
  }
  return ranks;
}

function spearman(a, b) { return pearson(rank(a), rank(b)); }

function objectiveExcitement(game, leagueValues) {
  const diff = Math.abs(Number(game.homeScore) - Number(game.awayScore));
  const total = Number(game.homeScore) + Number(game.awayScore);
  const typicalDiff = Math.max(1, quantile(leagueValues.diffs, 0.75));
  const typicalTotal = Math.max(1, quantile(leagueValues.totals, 0.75));
  const closeness = clamp(1 - diff / (typicalDiff * 1.8));
  const scoring = clamp(total / (typicalTotal * 1.5));
  const overtime = game.isOvertime ? 1 : 0;
  const postseason = game.eventType !== 'regular-season' ? 1 : 0;
  return Math.round(100 * (0.55 * closeness + 0.20 * scoring + 0.15 * overtime + 0.10 * postseason));
}

function buildCalibration(rawScores) {
  const sorted = [...rawScores].sort((a, b) => a - b);
  const percentiles = [0.01, 0.05, 0.10, 0.20, 0.25, 0.50, 0.75, 0.90, 0.95, 0.99];
  return {
    sampleSize: sorted.length,
    rawQuantiles: Object.fromEntries(percentiles.map((q) => [`p${String(q * 100).padStart(2, '0')}`, Math.round(quantile(sorted, q) * 100) / 100])),
    ecdfAnchors: Array.from({ length: 101 }, (_, raw) => ({ raw, calibrated: Math.round(percentile(sorted, raw) * 100) })),
  };
}

function thresholdRates(scores) {
  const n = scores.length || 1;
  return Object.fromEntries([60, 70, 80, 90, 95].map((threshold) => [threshold, Math.round((scores.filter((s) => s >= threshold).length / n) * 10000) / 100]));
}

function analyzeLeague(games, leagueId) {
  const values = {
    diffs: games.map((g) => Math.abs(g.homeScore - g.awayScore)).sort((a, b) => a - b),
    totals: games.map((g) => g.homeScore + g.awayScore).sort((a, b) => a - b),
  };
  const rows = games.map((finalGame) => {
    const pregame = { ...finalGame, status: 'scheduled', homeScore: undefined, awayScore: undefined, period: undefined, clockSeconds: undefined, isOvertime: false };
    const finalRaw = getRawGameScore(finalGame);
    const pregameRaw = getRawGameScore(pregame);
    const signals = getGameScoreSignals(finalGame);
    const target = objectiveExcitement(finalGame, values);
    return { id: finalGame.id, pregameRaw, finalRaw, target, signals, diff: Math.abs(finalGame.homeScore - finalGame.awayScore), total: finalGame.homeScore + finalGame.awayScore, overtime: finalGame.isOvertime ? 1 : 0 };
  });

  const pregameScores = rows.map((r) => r.pregameRaw);
  const finalScores = rows.map((r) => r.finalRaw);
  const target = rows.map((r) => r.target);
  const signalNames = ['favorite', 'priority', 'closeScore', 'lateGame', 'overtime', 'elimination', 'implications', 'baseInterest', 'marketExcitement'];
  const correlations = {};
  for (const signal of signalNames) {
    const valuesForSignal = rows.map((r) => Number(r.signals[signal] ?? 0));
    correlations[signal] = {
      targetPearson: Number(pearson(valuesForSignal, target).toFixed(4)),
      targetSpearman: Number(spearman(valuesForSignal, target).toFixed(4)),
      scorePearson: Number(pearson(valuesForSignal, pregameScores).toFixed(4)),
    };
  }

  const redundancy = [];
  for (let i = 0; i < signalNames.length; i += 1) for (let j = i + 1; j < signalNames.length; j += 1) {
    const a = rows.map((r) => Number(r.signals[signalNames[i]] ?? 0));
    const b = rows.map((r) => Number(r.signals[signalNames[j]] ?? 0));
    const correlation = pearson(a, b);
    if (Math.abs(correlation) >= 0.65) redundancy.push({ a: signalNames[i], b: signalNames[j], correlation: Number(correlation.toFixed(4)) });
  }
  redundancy.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

  return {
    leagueId,
    sampleSize: rows.length,
    raw: {
      pregame: { mean: mean(pregameScores), median: quantile([...pregameScores].sort((a,b)=>a-b), 0.5), thresholds: thresholdRates(pregameScores) },
      final: { mean: mean(finalScores), median: quantile([...finalScores].sort((a,b)=>a-b), 0.5), thresholds: thresholdRates(finalScores) },
      inflation: { meanDelta: mean(finalScores) - mean(pregameScores), medianDelta: quantile([...finalScores].sort((a,b)=>a-b),0.5) - quantile([...pregameScores].sort((a,b)=>a-b),0.5) },
    },
    target: { mean: mean(target), pregameSpearman: Number(spearman(pregameScores, target).toFixed(4)), finalSpearman: Number(spearman(finalScores, target).toFixed(4)) },
    calibration: { pregame: buildCalibration(pregameScores), final: buildCalibration(finalScores) },
    signalPredictiveness: correlations,
    redundantSignals: redundancy,
  };
}

function mean(values) { return values.length ? Number((values.reduce((s, v) => s + v, 0) / values.length).toFixed(3)) : 0; }

function markdown(report) {
  const lines = ['# Historical Game Score Backtest', '', `Window: ${START_YEAR}-${END_YEAR}`, '', '| League | Games | Pregame mean | Final mean | Mean inflation | Pregame ≥60 | ≥70 | ≥80 | ≥90 | ≥95 | Pregame→target ρ |', '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|'];
  for (const result of Object.values(report.leagues)) {
    const t = result.raw.pregame.thresholds;
    lines.push(`| ${result.leagueId} | ${result.sampleSize} | ${result.raw.pregame.mean} | ${result.raw.final.mean} | ${result.raw.inflation.meanDelta.toFixed(2)} | ${t[60]}% | ${t[70]}% | ${t[80]}% | ${t[90]}% | ${t[95]}% | ${result.target.pregameSpearman.toFixed(3)} |`);
  }
  lines.push('', '## Interpretation rules', '', '- **Inflation** = final raw score minus pregame raw score. Positive values mean live/final drama is materially lifting scores.', '- **Redundancy** flags signal pairs with absolute Pearson correlation ≥ 0.65.', '- **Predictive value** uses Spearman correlation between the pregame raw score and an outcome-only historical excitement target. This is a ranking diagnostic, not a causal claim.', '- **Calibration curves** are empirical ECDF mappings from raw score → percentile score. They are generated separately for pregame and final states.', '- The production calibration layer should not be replaced automatically. Review sample size, stability, and out-of-sample performance first.');
  return `${lines.join('\n')}\n`;
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const report = { version: 'historical-backtest-v1', startYear: START_YEAR, endYear: END_YEAR, generatedAt: new Date().toISOString(), source: 'ESPN Site API scoreboard', leagues: {}, errors: [] };

  for (const [leagueId, config] of Object.entries(LEAGUES)) {
    process.stdout.write(`\n[${leagueId}] collecting ${START_YEAR}-${END_YEAR}...`);
    const result = await collectLeague(leagueId, config);
    process.stdout.write(` ${result.games.length} games\n`);
    if (result.errors.length) report.errors.push(...result.errors.map((error) => ({ leagueId, ...error })));
    if (result.games.length) report.leagues[leagueId] = analyzeLeague(result.games, leagueId);
    else report.leagues[leagueId] = { leagueId, sampleSize: 0, errors: result.errors };
    await fs.writeFile(path.join(OUTPUT_DIR, `${leagueId}.games.json`), JSON.stringify(result.games));
  }

  await fs.writeFile(path.join(OUTPUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(OUTPUT_DIR, 'report.md'), markdown(report));
  console.log(`\nWrote ${path.join(OUTPUT_DIR, 'report.md')}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
