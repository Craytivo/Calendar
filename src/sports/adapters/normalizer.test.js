import {
  isNormalizedGame,
  normalizeGame,
  normalizeGames,
  normalizeStatus,
} from './normalizer.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function runNormalizerChecks() {
  assert(normalizeStatus('in_progress') === 'live', 'in_progress should normalize to live');
  assert(normalizeStatus('completed') === 'final', 'completed should normalize to final');
  assert(normalizeStatus('delayed') === 'postponed', 'delayed should normalize to postponed');

  const normalized = normalizeGame({
    eventId: 'game-1',
    league: 'nba',
    date: '2026-11-20T21:00:00Z',
    state: 'scheduled',
    homeScore: '108',
    awayScore: 102,
    home: {
      teamId: 'nba-home',
      displayName: 'Home Team',
      abbr: 'HOM',
      winPct: '0.75',
      games: '20',
      conferencePosition: '4',
      score: '108',
    },
    away: {
      teamId: 'nba-away',
      displayName: 'Away Team',
      abbr: 'AWY',
      winPct: 0.7,
      games: 20,
      conferencePosition: 7,
      score: 102,
    },
    isDivisional: false,
  });

  assert(normalized.id === 'game-1', 'eventId should map to id');
  assert(normalized.leagueId === 'nba', 'league should map to leagueId');
  assert(normalized.homeTeamId === 'nba-home', 'home team ID should normalize');
  assert(normalized.awayTeamId === 'nba-away', 'away team ID should normalize');
  assert(normalized.homeTeam.winPercentage === 0.75, 'home win percentage should be numeric');
  assert(normalized.awayTeam.conferenceRank === 7, 'away conference rank should be numeric');
  assert(normalized.homeScore === 108, 'home score should be preserved as a number');
  assert(normalized.awayScore === 102, 'away score should be preserved as a number');
  assert(normalized.homeTeam.score === 108, 'home team score should be preserved');
  assert(normalized.awayTeam.score === 102, 'away team score should be preserved');
  assert(normalized.startTime === '2026-11-20T21:00:00.000Z', 'date should normalize to ISO');
  assert(isNormalizedGame(normalized), 'normalized game should pass validation');

  const teamScoreOnly = normalizeGame({
    eventId: 'game-2',
    league: 'nfl',
    date: '2026-11-21T21:00:00Z',
    status: 'final',
    home: { teamId: 'home', name: 'Home', score: '24' },
    away: { teamId: 'away', name: 'Away', score: '17' },
  });

  assert(teamScoreOnly.homeScore === 24, 'home score should fall back to team score');
  assert(teamScoreOnly.awayScore === 17, 'away score should fall back to team score');

  const batch = normalizeGames([
    normalized,
    { eventId: 'missing-date', league: 'nfl' },
  ]);

  assert(batch.length === 1, 'invalid games should be removed from normalized batches');

  return true;
}

runNormalizerChecks();
