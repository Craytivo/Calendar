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

// Real 2026 examples used for calibration:
// - UCL: Club Brugge 2-3 Aston Villa, Sep 8, 2026.
// - MLB: Twins 4-5 Tigers, Sep 7, 2026; Diamondbacks 5-4 Royals, Sep 7, 2026.
// - NFL: Packers-Vikings is a real Week 1 matchup; no NFL game is scheduled Sep 8.
// NBA/NHL have no games on Sep 8 because both seasons are out of session; use live-state
// shapes below to verify their sport-specific late-game behavior before the seasons begin.

const uclThriller = game({
  leagueId: 'ucl',
  status: 'final',
  homeTeamId: 'aston-villa',
  awayTeamId: 'club-brugge',
  homeTeam: { name: 'Aston Villa' },
  awayTeam: { name: 'Club Brugge' },
  homeScore: 3,
  awayScore: 2,
});

const ordinaryFavorite = game({
  leagueId: 'nfl',
  status: 'scheduled',
});

const nonFavoriteSoccer = game({
  leagueId: 'ucl',
  status: 'live',
  homeTeamId: 'club-brugge',
  awayTeamId: 'aston-villa',
  homeTeam: { name: 'Club Brugge' },
  awayTeam: { name: 'Aston Villa' },
  homeScore: 3,
  awayScore: 3,
  clockSeconds: 88 * 60,
  period: 2,
});

const nbaLate = game({
  leagueId: 'nba',
  status: 'live',
  homeTeamId: 'nba-home',
  awayTeamId: 'nba-away',
  homeTeam: { name: 'Home' },
  awayTeam: { name: 'Away' },
  homeScore: 101,
  awayScore: 100,
  clockSeconds: 75,
  period: 4,
});

const nhlLate = game({
  leagueId: 'nhl',
  status: 'live',
  homeTeamId: 'nhl-home',
  awayTeamId: 'nhl-away',
  homeTeam: { name: 'Home' },
  awayTeam: { name: 'Away' },
  homeScore: 3,
  awayScore: 2,
  clockSeconds: 75,
  period: 3,
});

const mlbExtraInning = game({
  leagueId: 'mlb',
  status: 'final',
  homeTeamId: 'giants',
  awayTeamId: 'cardinals',
  homeTeam: { name: 'San Francisco Giants' },
  awayTeam: { name: 'St. Louis Cardinals' },
  homeScore: 5,
  awayScore: 4,
  period: 11,
  isOvertime: true,
});

assert.ok(getGameScore(nonFavoriteSoccer) > getGameScore(ordinaryFavorite), 'late tied UCL thriller should beat an ordinary favorite');
assert.ok(getGameScore(uclThriller) >= 70, '3-2 UCL final should retain strong final-game value');
assert.equal(getGameScoreLevel(getGameScore(nonFavoriteSoccer)), 'EPIC', '3-3 in the 88th should be EPIC');
assert.ok(getGameScore(nbaLate) >= 70, 'one-point NBA game in final minute should be GOOD or better');
assert.ok(getGameScore(nhlLate) >= 70, 'one-goal NHL game in final minute should be GOOD or better');
assert.ok(getGameScore(mlbExtraInning) >= 70, 'one-run extra-inning MLB final should be GOOD or better');
assert.ok(getGameScore(ordinaryFavorite) > 0, 'favorite relevance should contribute to scheduled games');

const finalWithPeak = getGameScore(uclThriller, { peakScore: 124 });
assert.equal(finalWithPeak, 124, 'persisted peak score should survive final state');

const components = getGameScoreComponents(nonFavoriteSoccer);
assert.ok(components.liveDrama > components.baseInterest, 'live drama should dominate base interest in a thriller');

console.log('game-score calibration tests passed');
