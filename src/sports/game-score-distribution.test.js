import assert from 'node:assert/strict';
import { getGameScore, getGameScoreComponents } from './game-score.js';

const mlbGame = (overrides = {}) => ({
  status: 'scheduled',
  leagueId: 'mlb',
  homeTeamId: 'home',
  awayTeamId: 'away',
  homeTeam: {
    name: 'Home',
    winPercentage: 0.500,
    leagueRank: 15,
    runDifferential: 0,
    homeWins: 40,
    homeLosses: 40,
    lastTenWins: 5,
    lastTenLosses: 5,
  },
  awayTeam: {
    name: 'Away',
    winPercentage: 0.500,
    leagueRank: 15,
    runDifferential: 0,
    awayWins: 40,
    awayLosses: 40,
    lastTenWins: 5,
    lastTenLosses: 5,
  },
  ...overrides,
});

const qualityGame = mlbGame({
  homeTeam: { name: 'Elite Home', winPercentage: 0.680, leagueRank: 2, runDifferential: 85, homeWins: 50, homeLosses: 30, lastTenWins: 7, lastTenLosses: 3 },
  awayTeam: { name: 'Elite Away', winPercentage: 0.650, leagueRank: 4, runDifferential: 71, awayWins: 48, awayLosses: 32, lastTenWins: 7, lastTenLosses: 3 },
});

const favoriteMediocre = mlbGame({
  homeTeamId: 'packers',
  awayTeamId: 'away',
  homeTeam: { ...mlbGame().homeTeam, name: 'Favorite', winPercentage: 0.500, leagueRank: 15, runDifferential: -5 },
});

const scores = [
  mlbGame(),
  mlbGame({ homeTeam: { ...mlbGame().homeTeam, winPercentage: 0.540, leagueRank: 12, runDifferential: 8 }, awayTeam: { ...mlbGame().awayTeam, winPercentage: 0.510, leagueRank: 17, runDifferential: -2 } }),
  mlbGame({ homeTeam: { ...mlbGame().homeTeam, winPercentage: 0.570, leagueRank: 10, runDifferential: 25 }, awayTeam: { ...mlbGame().awayTeam, winPercentage: 0.560, leagueRank: 11, runDifferential: 18 } }),
  mlbGame({ homeTeam: { ...mlbGame().homeTeam, winPercentage: 0.600, leagueRank: 7, runDifferential: 35 }, awayTeam: { ...mlbGame().awayTeam, winPercentage: 0.590, leagueRank: 8, runDifferential: 31 } }),
  qualityGame,
  mlbGame({ homeTeam: { ...mlbGame().homeTeam, winPercentage: 0.700, leagueRank: 1, runDifferential: 100 }, awayTeam: { ...mlbGame().awayTeam, winPercentage: 0.450, leagueRank: 25, runDifferential: -50 } }),
];

const uniqueScores = new Set(scores.map(getGameScore));
assert.ok(uniqueScores.size >= 5, `MLB pregame scores collapsed to only ${uniqueScores.size} distinct values`);

const clustered = scores.filter((score) => score === 40 || score === 50);
assert.ok(clustered.length / scores.length < 0.5, 'pregame scores must not collapse around 40/50');

assert.ok(getGameScore(qualityGame) > getGameScore(favoriteMediocre), 'favorite status must not overpower substantially better neutral matchups');

const favoriteElite = { ...qualityGame, homeTeamId: 'packers' };
assert.ok(getGameScore(favoriteElite) > getGameScore(qualityGame), 'favorite relevance should remain a modest advantage');
assert.ok(getGameScoreComponents(qualityGame).competitiveQuality > getGameScoreComponents(mlbGame()).competitiveQuality, 'better MLB teams must produce higher competitive quality');

const strongerRunDiff = mlbGame({
  homeTeam: { ...mlbGame().homeTeam, runDifferential: 50 },
  awayTeam: { ...mlbGame().awayTeam, runDifferential: 45 },
});
const weakerRunDiff = mlbGame({
  homeTeam: { ...mlbGame().homeTeam, runDifferential: -40 },
  awayTeam: { ...mlbGame().awayTeam, runDifferential: -30 },
});
assert.ok(getGameScore(strongerRunDiff) > getGameScore(weakerRunDiff), 'better MLB run differential must increase score');

console.log('game-score distribution regression tests passed');
