import assert from 'node:assert/strict';
import { getGameScore, getGameScoreComponents, getGameScoreLevel } from './game-score.js';

const game = (overrides = {}) => ({
  status: 'scheduled',
  leagueId: 'nfl',
  homeTeamId: 'packers',
  awayTeamId: 'vikings',
  homeTeam: { name: 'Green Bay Packers' },
  awayTeam: { name: 'Minnesota Vikings' },
  ...overrides,
});

const ordinaryFavorite = game({ status: 'scheduled' });

const nonFavoriteMidgame = game({
  leagueId: 'nba', status: 'live', homeTeamId: 'nba-home', awayTeamId: 'nba-away',
  homeTeam: { name: 'Home' }, awayTeam: { name: 'Away' }, homeScore: 48, awayScore: 47,
  clockSeconds: 420, period: 2, clockMode: 'remaining',
});

const nonFavoriteSoccer = game({
  leagueId: 'ucl', status: 'live', homeTeamId: 'club-brugge', awayTeamId: 'aston-villa',
  homeTeam: { name: 'Club Brugge' }, awayTeam: { name: 'Aston Villa' }, homeScore: 3, awayScore: 3,
  clockSeconds: 88 * 60, period: 2, clockMode: 'elapsed',
});

const nbaLate = game({
  leagueId: 'nba', status: 'live', homeTeamId: 'nba-home', awayTeamId: 'nba-away',
  homeTeam: { name: 'Home' }, awayTeam: { name: 'Away' }, homeScore: 101, awayScore: 100,
  clockSeconds: 75, period: 4, clockMode: 'remaining',
});

const nhlLate = game({
  leagueId: 'nhl', status: 'live', homeTeamId: 'nhl-home', awayTeamId: 'nhl-away',
  homeTeam: { name: 'Home' }, awayTeam: { name: 'Away' }, homeScore: 3, awayScore: 2,
  clockSeconds: 75, period: 3, clockMode: 'remaining',
});

const mlbExtraInning = game({
  leagueId: 'mlb', status: 'final', homeTeamId: 'giants', awayTeamId: 'cardinals',
  homeTeam: { name: 'San Francisco Giants' }, awayTeam: { name: 'St. Louis Cardinals' },
  homeScore: 5, awayScore: 4, period: 11, isOvertime: true, clockMode: 'inning',
});

const finalGame = game({
  leagueId: 'ucl', status: 'final', homeTeamId: 'aston-villa', awayTeamId: 'club-brugge',
  homeTeam: { name: 'Aston Villa' }, awayTeam: { name: 'Club Brugge' }, homeScore: 3, awayScore: 2,
});

assert.ok(getGameScore(nonFavoriteMidgame) < 45, 'ordinary non-favorite close game away from the finish should stay below the meaningful-game range');
assert.ok(getGameScore(nonFavoriteSoccer) > getGameScore(ordinaryFavorite), 'late tied UCL thriller should beat an ordinary favorite');
assert.ok(getGameScore(nonFavoriteSoccer) >= 70, '3-3 UCL game in the 88th should be HOT or better');
assert.equal(getGameScoreLevel(getGameScore(nonFavoriteSoccer)), 'HOT', '3-3 in the 88th should be HOT without favorite or playoff relevance');
assert.ok(getGameScore(nbaLate) >= 60, 'one-point NBA game in final minute should be GOOD or better');
assert.ok(getGameScore(nhlLate) >= 60, 'one-goal NHL game in final minute should be GOOD or better');
assert.ok(getGameScore(mlbExtraInning) >= 60, 'one-run extra-inning MLB final should be GOOD or better');
assert.ok(getGameScore(ordinaryFavorite) > 0, 'favorite relevance should contribute to scheduled games');

const finalWithPeak = getGameScore(finalGame, { peakScore: 124 });
assert.equal(finalWithPeak, 100, 'persisted peak score must respect the 100-point cap');
assert.equal(getGameScore(finalGame, { peakScore: 100 }), 100, 'a persisted peak of 100 should remain 100');

const components = getGameScoreComponents(nonFavoriteSoccer);
assert.ok(components.liveDrama > components.baseInterest, 'live drama should dominate base interest in a thriller');

console.log('game-score calibration tests passed');
