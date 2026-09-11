import assert from 'node:assert/strict';
import { scoreGameV2 } from './index-v2.js';

function mlbGame(home, away) {
  return {
    id: `${home.name}-${away.name}`,
    leagueId: 'mlb',
    status: 'scheduled',
    eventType: 'regular-season',
    homeTeam: home,
    awayTeam: away,
  };
}

const averageHome = { name: 'Average Home', winPercentage: 0.500, leagueRank: 15, runDifferential: 0, homeWins: 40, homeLosses: 40, homeWinPercentage: 0.500, lastTenWins: 5, lastTenLosses: 5, lastTenWinPercentage: 0.500 };
const averageAway = { name: 'Average Away', winPercentage: 0.500, leagueRank: 15, runDifferential: 0, awayWins: 40, awayLosses: 40, awayWinPercentage: 0.500, lastTenWins: 5, lastTenLosses: 5, lastTenWinPercentage: 0.500 };

const baseline = mlbGame(averageHome, averageAway);
const elite = mlbGame(
  { name: 'Elite Home', winPercentage: 0.680, leagueRank: 2, runDifferential: 85, homeWins: 50, homeLosses: 30, homeWinPercentage: 0.625, lastTenWins: 7, lastTenLosses: 3, lastTenWinPercentage: 0.700 },
  { name: 'Elite Away', winPercentage: 0.650, leagueRank: 4, runDifferential: 71, awayWins: 48, awayLosses: 32, awayWinPercentage: 0.600, lastTenWins: 7, lastTenLosses: 3, lastTenWinPercentage: 0.700 },
);
const weak = mlbGame(
  { name: 'Weak Home', winPercentage: 0.400, leagueRank: 28, runDifferential: -70, homeWins: 32, homeLosses: 48, homeWinPercentage: 0.400, lastTenWins: 3, lastTenLosses: 7, lastTenWinPercentage: 0.300 },
  { name: 'Weak Away', winPercentage: 0.420, leagueRank: 25, runDifferential: -55, awayWins: 31, awayLosses: 49, awayWinPercentage: 0.388, lastTenWins: 4, lastTenLosses: 6, lastTenWinPercentage: 0.400 },
);
const eliteVsWeak = mlbGame(elite.homeTeam, weak.awayTeam);

const baselineScore = scoreGameV2(baseline);
const eliteScore = scoreGameV2(elite);
const weakScore = scoreGameV2(weak);
const eliteVsWeakScore = scoreGameV2(eliteVsWeak);

assert.ok(eliteScore.total > baselineScore.total, 'better MLB quality must increase the V2 score');
assert.ok(baselineScore.total > weakScore.total, 'weaker MLB teams must not outscore average teams');
assert.ok(eliteScore.total > eliteVsWeakScore.total, 'a high-quality balanced MLB matchup should beat a one-sided matchup');
assert.ok(eliteScore.breakdown.competitive.reasons.includes('Run differential included'), 'V2 competitive scoring should expose run differential usage');
assert.ok(eliteScore.breakdown.competitive.reasons.includes('Home/away split included'), 'V2 competitive scoring should expose home/away usage');
assert.ok(eliteScore.breakdown.form.reasons.includes('Last-ten records included'), 'V2 form scoring should expose last-ten usage');
assert.ok(eliteScore.breakdown.teamQuality.reasons.includes('Run differential supports quality'), 'V2 team quality should expose run differential usage');

const runDifferentialImprovement = scoreGameV2(mlbGame(
  { ...averageHome, runDifferential: 60 },
  { ...averageAway, runDifferential: 55 },
));
assert.ok(runDifferentialImprovement.total > baselineScore.total, 'improving MLB run differential must raise the V2 score');

const formImprovement = scoreGameV2(mlbGame(
  { ...averageHome, lastTenWins: 8, lastTenLosses: 2, lastTenWinPercentage: 0.800 },
  { ...averageAway, lastTenWins: 7, lastTenLosses: 3, lastTenWinPercentage: 0.700 },
));
assert.ok(formImprovement.total > baselineScore.total, 'improving MLB last-ten form must raise the V2 score');

console.log('V2 MLB scoring regression tests passed');
