import {
  getGamesForDate,
  getMyGames,
  getMyGamesWindow,
  getTodayMyGames,
  groupMyGamesByDate,
} from './selectors.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function localDate(year, month, day, hour = 12) {
  return new Date(year, month - 1, day, hour, 0, 0, 0);
}

function game(id, date, overrides = {}) {
  return {
    id,
    leagueId: 'nfl',
    startTime: date.toISOString(),
    status: 'scheduled',
    eventType: 'regular-season',
    ...overrides,
  };
}

const now = localDate(2026, 9, 7, 12);

const fixtureGames = [
  game('today-favorite', localDate(2026, 9, 7, 18), {
    leagueId: 'nhl',
    homeTeamId: 'oilers',
    awayTeamId: 'nhl-opponent',
  }),
  game('today-normal', localDate(2026, 9, 7, 19)),
  game('today-live-major', localDate(2026, 9, 7, 20), {
    status: 'live',
    isDivisional: true,
  }),
  game('tomorrow-major', localDate(2026, 9, 8, 18), {
    isDivisional: true,
  }),
  game('day-seven-favorite', localDate(2026, 9, 14, 18), {
    leagueId: 'mlb',
    homeTeamId: 'blue-jays',
    awayTeamId: 'mlb-opponent',
  }),
  game('day-eight-outside-window', localDate(2026, 9, 15, 18), {
    isDivisional: true,
  }),
  game('major-one', localDate(2026, 9, 12, 13), {
    isDivisional: true,
  }),
  game('major-two', localDate(2026, 9, 12, 14), {
    eventType: 'championship',
  }),
  game('major-three', localDate(2026, 9, 12, 15), {
    isElimination: true,
  }),
  game('major-four', localDate(2026, 9, 12, 16), {
    hasPlayoffImplications: true,
  }),
  game('major-five', localDate(2026, 9, 12, 17), {
    hasSeedingImplications: true,
  }),
];

function assertIds(actualGames, expectedIds, message) {
  const actualIds = actualGames.map((item) => item.id);
  assert(
    JSON.stringify(actualIds) === JSON.stringify(expectedIds),
    `${message}: expected ${expectedIds.join(', ')}, got ${actualIds.join(', ')}`,
  );
}

export function runSelectorChecks() {
  const todayGames = getGamesForDate(fixtureGames, now);
  assertIds(
    todayGames,
    ['today-live-major', 'today-favorite', 'today-normal'],
    'date selector should retain today\'s live/scheduled games and prioritize them',
  );

  const windowGames = getMyGamesWindow(fixtureGames, now);
  assert(
    !windowGames.some((item) => item.id === 'today-normal'),
    'normal non-favorite games should not enter My Games',
  );
  assert(
    !windowGames.some((item) => item.id === 'day-eight-outside-window'),
    'the eighth day after today should be outside the eight-date window',
  );
  assert(
    windowGames.some((item) => item.id === 'day-seven-favorite'),
    'the seventh day after today should be inside the window',
  );

  const myGames = getMyGames(fixtureGames, now);
  assert(
    myGames.some((item) => item.id === 'today-favorite') &&
      myGames.some((item) => item.id === 'day-seven-favorite'),
    'every favorite-team game inside the window should be retained',
  );

  const septemberTwelve = myGames.filter(
    (item) => item.startTime === localDate(2026, 9, 12, 13).toISOString() ||
      item.startTime === localDate(2026, 9, 12, 14).toISOString() ||
      item.startTime === localDate(2026, 9, 12, 15).toISOString() ||
      item.startTime === localDate(2026, 9, 12, 16).toISOString() ||
      item.startTime === localDate(2026, 9, 12, 17).toISOString(),
  );
  assert(
    septemberTwelve.length === 3,
    'My Games should cap non-favorite major games at three per calendar day',
  );

  assert(
    myGames[0].id === 'today-live-major',
    'live games should be displayed before non-live games',
  );

  const todayMyGames = getTodayMyGames(fixtureGames, now);
  assertIds(
    todayMyGames,
    ['today-live-major', 'today-favorite'],
    'today selector should return only selected My Games from today',
  );

  const grouped = groupMyGamesByDate(fixtureGames, now);
  assert(grouped.has('2026-09-07'), 'grouped My Games should include today');
  assert(grouped.has('2026-09-14'), 'grouped My Games should include day seven');
  assert(!grouped.has('2026-09-15'), 'grouped My Games should exclude day eight');
  assert(grouped.get('2026-09-12').length === 3, 'grouped My Games should preserve the daily major-game cap');

  return true;
}

runSelectorChecks();
