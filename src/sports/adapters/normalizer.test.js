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
    home: {
      teamId: 'nba-home',
      displayName: 'Home Team',
      abbr: 'HOM',
      winPct: '0.75',
      games: '20',
      conferencePosition: '4',
    },
    away: {
      teamId: 'nba-away',
      displayName: 'Away Team',
      abbr: 'AWY',
      winPct: 0.7,
      games: 20,
      conferencePosition: 7,
    },
    isDivisional: false,
  });

  assert(normalized.id === 'game-1', 'eventId should map to id');
  assert(normalized.leagueId === 'nba', 'league should map to leagueId');
  assert(normalized.homeTeamId === 'nba-home', 'home team ID should normalize');
  assert(normalized.awayTeamId === 'nba-away', 'away team ID should normalize');
  assert(normalized.homeTeam.winPercentage === 0.75, 'home win percentage should be numeric');
  assert(normalized.awayTeam.conferenceRank === 7, 'away conference rank should be numeric');
  assert(normalized.startTime === '2026-11-20T21:00:00.000Z', 'date should normalize to ISO');
  assert(isNormalizedGame(normalized), 'normalized game should pass validation');

  const batch = normalizeGames([
    normalized,
    { eventId: 'missing-date', league: 'nfl' },
  ]);

  assert(batch.length === 1, 'invalid games should be removed from normalized batches');

  return true;
}

runNormalizerChecks();
