import { enrichGamesWithEspnStandings } from './espn-standings.js';

function assert(condition, message) { if (!condition) throw new Error(message); }
function stat(name, value) { return { name, value: String(value), displayValue: String(value) }; }
const originalFetch = globalThis.fetch;

export async function runEspnStandingsChecks() {
  let fetchCount = 0;
  globalThis.fetch = async (url) => {
    fetchCount += 1;
    const text = String(url);
    if (text.includes('/football/nfl/standings')) return new Response(JSON.stringify({ groups: [{ name: 'AFC West', abbreviation: 'AFCW', entries: [
      { team: { id: '1', displayName: 'Kansas City Chiefs', abbreviation: 'KC' }, stats: [stat('wins', 10), stat('losses', 3), stat('winPercent', 0.769)] },
      { team: { id: '2', displayName: 'Denver Broncos', abbreviation: 'DEN' }, stats: [stat('wins', 9), stat('losses', 4), stat('winPercent', 0.692)] },
    ] }] }), { status: 200 });
    if (text.includes('/basketball/nba/standings')) return new Response(JSON.stringify({ groups: [{ name: 'Western Conference', abbreviation: 'West', entries: [
      { team: { id: '3', displayName: 'Sacramento Kings', abbreviation: 'SAC' }, stats: [stat('wins', 12), stat('losses', 3), stat('winPercent', 0.8), stat('rank', 5)] },
      { team: { id: '4', displayName: 'Denver Nuggets', abbreviation: 'DEN' }, stats: [stat('wins', 11), stat('losses', 4), stat('winPercent', 0.733), stat('rank', 6)] },
    ] }] }), { status: 200 });
    if (text.includes('/baseball/mlb/standings')) return new Response(JSON.stringify({ groups: [{ name: 'American League', abbreviation: 'AL', entries: [
      { team: { id: '10', displayName: 'New York Yankees', abbreviation: 'NYY' }, stats: [stat('wins', 82), stat('losses', 65), stat('winPercent', 0.558), stat('rank', 3), stat('runDifferential', 54)] },
      { team: { id: '11', displayName: 'Boston Red Sox', abbreviation: 'BOS' }, stats: [stat('wins', 78), stat('losses', 69), stat('winPercent', 0.531), stat('rank', 6), stat('runDifferential', 12)] },
    ] }] }), { status: 200 });
    if (text.includes('/baseball/mlb/teams/10/record')) return new Response(JSON.stringify({ items: [
      { type: 'total', summary: '82-65', value: 0.558 },
      { type: 'home', summary: '44-29', value: 0.603 },
      { type: 'away', summary: '38-36', value: 0.514 },
      { type: 'last10', summary: '7-3', value: 0.7 },
    ] }), { status: 200 });
    if (text.includes('/baseball/mlb/teams/11/record')) return new Response(JSON.stringify({ items: [
      { type: 'total', summary: '78-69', value: 0.531 },
      { type: 'home', summary: '43-31', value: 0.581 },
      { type: 'away', summary: '35-38', value: 0.479 },
      { type: 'last10', summary: '5-5', value: 0.5 },
    ] }), { status: 200 });
    throw new Error(`Unexpected standings URL: ${text}`);
  };

  const nflFixture = [{ id: 'nfl-test', leagueId: 'nfl', startTime: '2026-09-20T18:00:00.000Z', status: 'scheduled', eventType: 'regular-season', homeTeam: { id: 'tsdb:nfl:1', name: 'Kansas City Chiefs', leagueId: 'nfl' }, awayTeam: { id: 'tsdb:nfl:2', name: 'Denver Broncos', leagueId: 'nfl' } }];
  const nfl = await enrichGamesWithEspnStandings(nflFixture);
  assert(nfl[0].homeTeam.winPercentage === 0.769, 'NFL win percentage should be normalized');
  assert(nfl[0].homeTeam.wins === 10, 'NFL wins should be normalized');
  assert(nfl[0].isDivisional === true, 'NFL same-division games should be detected');

  const nflCached = await enrichGamesWithEspnStandings(nflFixture);
  assert(nflCached.diagnostics[0].cached === true, 'second standings read should use cache');
  assert(fetchCount === 1, 'cached standings should avoid a second ESPN request');

  const nba = await enrichGamesWithEspnStandings([{ id: 'nba-test', leagueId: 'nba', startTime: '2026-11-20T03:00:00.000Z', status: 'scheduled', eventType: 'regular-season', homeTeam: { id: 'provider:sac', name: 'Sacramento Kings', leagueId: 'nba' }, awayTeam: { id: 'tsdb:nba:4', name: 'Denver Nuggets', leagueId: 'nba' } }]);
  assert(nba[0].homeTeam.id === 'sac-kings', 'favorite team should resolve to canonical ID');
  assert(nba[0].homeTeam.conferenceRank === 5, 'NBA conference rank should be normalized');
  assert(nba[0].homeTeam.gamesPlayed === 15, 'NBA games played should be derived');
  assert(nba[0].hasPlayoffImplications === false, 'early-season NBA game should not be marked playoff-relevant by cutoff alone');

  const mlb = await enrichGamesWithEspnStandings([{ id: 'mlb-test', leagueId: 'mlb', startTime: '2026-09-20T23:00:00.000Z', status: 'scheduled', eventType: 'regular-season', homeTeam: { id: 'tsdb:mlb:10', name: 'New York Yankees', leagueId: 'mlb' }, awayTeam: { id: 'tsdb:mlb:11', name: 'Boston Red Sox', leagueId: 'mlb' } }]);
  assert(mlb[0].homeTeam.runDifferential === 54, 'MLB run differential should be normalized');
  assert(mlb[0].homeTeam.homeWins === 44 && mlb[0].homeTeam.homeLosses === 29, 'MLB home record should be normalized');
  assert(mlb[0].awayTeam.awayWins === 35 && mlb[0].awayTeam.awayLosses === 38, 'MLB away record should be normalized');
  assert(mlb[0].homeTeam.lastTenWins === 7 && mlb[0].homeTeam.lastTenLosses === 3, 'MLB last-ten record should be normalized');
  assert(mlb[0].awayTeam.lastTenWins === 5 && mlb[0].awayTeam.lastTenLosses === 5, 'MLB away last-ten record should be normalized');

  globalThis.fetch = originalFetch;
  return true;
}

runEspnStandingsChecks().catch((error) => { globalThis.fetch = originalFetch; throw error; });
