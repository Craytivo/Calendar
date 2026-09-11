import assert from 'node:assert/strict';
import { buildDiagnosticSummary, buildGameDiagnostic, buildV2GameDiagnostic } from './api-diagnostic.js';

const ucl = {
  id: 'espn:ucl:test', leagueId: 'ucl', status: 'live', eventType: 'regular-season', startTime: '2026-09-08T18:00:00.000Z',
  period: 2, clock: '88:14', clockSeconds: 5294, clockMode: 'elapsed', homeScore: 3, awayScore: 3,
  homeTeam: { name: 'Club Brugge' }, awayTeam: { name: 'Aston Villa' },
};

const diagnostic = buildGameDiagnostic(ucl);
assert.equal(diagnostic.clockMode, 'elapsed');
assert.equal(diagnostic.clockSeconds, 5294);
assert.equal(diagnostic.score.home, 3);
assert.equal(diagnostic.score.away, 3);
assert.ok(diagnostic.gameScore >= 70, 'late tied UCL game should score strongly');
assert.ok(diagnostic.reasons.includes('Tied game'), 'diagnostic should expose score reason');
assert.equal(diagnostic.v2.id, ucl.id);
assert.equal(diagnostic.v2.v2.total, diagnostic.v2.breakdown
  ? Math.round(
    (diagnostic.v2.breakdown.competitive.score / diagnostic.v2.breakdown.competitive.max) * 30 +
    (diagnostic.v2.breakdown.teamQuality.score / diagnostic.v2.breakdown.teamQuality.max) * 20 +
    (diagnostic.v2.breakdown.stakes.score / diagnostic.v2.breakdown.stakes.max) * 20 +
    (diagnostic.v2.breakdown.narrative.score / diagnostic.v2.breakdown.narrative.max) * 15 +
    (diagnostic.v2.breakdown.form.score / diagnostic.v2.breakdown.form.max) * 10 +
    Math.min(5, (diagnostic.v2.breakdown.personal.score ?? 0) * (5 / 15)),
  ) : diagnostic.v2.v2.total);

const mlb = {
  id: 'lxf2uu', leagueId: 'mlb', status: 'scheduled', eventType: 'regular-season', startTime: '2026-09-11T23:07:00.000Z',
  homeTeamId: 'blue-jays', awayTeamId: 'orioles',
  homeTeam: {
    id: 'blue-jays', name: 'Toronto Blue Jays', winPercentage: 73 / 147, leagueRank: 4,
    runDifferential: 12, homeWinPercentage: 37 / 72, lastTenWinPercentage: 0.6,
  },
  awayTeam: {
    id: 'orioles', name: 'Baltimore Orioles', winPercentage: 71 / 147, leagueRank: 5,
    runDifferential: -40, awayWinPercentage: 35 / 72, lastTenWinPercentage: 0.3,
  },
};

const v2 = buildV2GameDiagnostic(mlb);
assert.equal(v2.id, 'lxf2uu');
assert.equal(v2.apiData.away.winPercentage, 48.3);
assert.equal(v2.apiData.home.winPercentage, 49.7);
assert.equal(v2.apiData.away.lastTenWinPercentage, 30);
assert.equal(v2.apiData.home.splitWinPercentage, 51.4);
assert.ok(Number.isFinite(v2.v2.total));
assert.ok(v2.v2.total >= 0 && v2.v2.total <= 100);
assert.ok(Number.isFinite(v2.confidence));

const summary = buildDiagnosticSummary([ucl]);
assert.equal(summary.ucl.count, 1);
assert.equal(summary.ucl.live, 1);
assert.equal(summary.ucl.clockModes.elapsed, 1);
assert.equal(summary.ucl.highestScore.id, ucl.id);

console.log('API diagnostic tests passed');

if (process.env.LIVE_API_DIAGNOSTIC === '1') {
  const { fetchEspnLeagueWindow } = await import('./adapters/espn-schedules.js');
  const { enrichGamesWithEspnStandings } = await import('./adapters/espn-standings.js');

  const startDate = new Date('2026-09-11T00:00:00-06:00');
  const games = await fetchEspnLeagueWindow('mlb', startDate, 7);
  const enriched = await enrichGamesWithEspnStandings(games, startDate.getFullYear());
  const actual = enriched.games.find((game) => {
    const names = [game.homeTeam?.name, game.awayTeam?.name];
    return names.includes('Baltimore Orioles') && names.includes('Toronto Blue Jays');
  });

  assert.ok(actual, 'live ESPN payload should contain Orioles vs Blue Jays');

  console.log('\n=== MLB ENRICHMENT BOUNDARY ===');
  console.log(`Standings diagnostics: ${JSON.stringify(enriched.diagnostics, null, 2)}`);
  console.log(`Schedule team IDs: away=${actual.awayTeam?.id ?? 'MISSING'} home=${actual.homeTeam?.id ?? 'MISSING'}`);
  console.log(`Schedule team names: away=${actual.awayTeam?.name ?? 'MISSING'} home=${actual.homeTeam?.name ?? 'MISSING'}`);
  console.log('Enriched team fields:');
  console.log(`├── Orioles: ${JSON.stringify({ id: actual.awayTeam?.id, winPercentage: actual.awayTeam?.winPercentage, leagueRank: actual.awayTeam?.leagueRank, runDifferential: actual.awayTeam?.runDifferential, awayWinPercentage: actual.awayTeam?.awayWinPercentage, lastTenWinPercentage: actual.awayTeam?.lastTenWinPercentage })}`);
  console.log(`└── Blue Jays: ${JSON.stringify({ id: actual.homeTeam?.id, winPercentage: actual.homeTeam?.winPercentage, leagueRank: actual.homeTeam?.leagueRank, runDifferential: actual.homeTeam?.runDifferential, homeWinPercentage: actual.homeTeam?.homeWinPercentage, lastTenWinPercentage: actual.homeTeam?.lastTenWinPercentage })}`);

  const live = buildV2GameDiagnostic(actual);
  const { away, home } = live.apiData;

  const pct = (value) => value == null ? 'MISSING' : `${value}%`;

  console.log('\n=== LIVE ORIOLES vs BLUE JAYS V2 TRACE ===');
  console.log(`GAME: ${live.matchup}`);
  console.log(`ID: ${live.id}`);
  console.log('');
  console.log('API DATA');
  console.log(`├── Orioles win %: ${pct(away.winPercentage)}`);
  console.log(`├── Orioles rank: ${away.leagueRank ?? 'MISSING'}`);
  console.log(`├── Orioles run differential: ${away.runDifferential ?? 'MISSING'}`);
  console.log(`├── Orioles away %: ${pct(away.splitWinPercentage)}`);
  console.log(`├── Orioles L10 %: ${pct(away.lastTenWinPercentage)}`);
  console.log(`├── Blue Jays win %: ${pct(home.winPercentage)}`);
  console.log(`├── Blue Jays rank: ${home.leagueRank ?? 'MISSING'}`);
  console.log(`├── Blue Jays run differential: ${home.runDifferential ?? 'MISSING'}`);
  console.log(`├── Blue Jays home %: ${pct(home.splitWinPercentage)}`);
  console.log(`└── Blue Jays L10 %: ${pct(home.lastTenWinPercentage)}`);
  console.log('');
  console.log('V2 CONTRIBUTIONS');
  console.log(`├── Competitive: ${live.v2.competitive} / 30`);
  console.log(`├── Team Quality: ${live.v2.teamQuality} / 20`);
  console.log(`├── Stakes: ${live.v2.stakes} / 20`);
  console.log(`├── Narrative: ${live.v2.narrative} / 15`);
  console.log(`├── Form: ${live.v2.form} / 10`);
  console.log(`├── Personal: ${live.v2.personal} / 5`);
  console.log(`└── TOTAL: ${live.v2.total} / 100`);
  console.log('');
  console.log(`CONFIDENCE: ${Math.round(live.confidence * 100)}%`);
  console.log('');
  console.log('REASONS');
  for (const reason of live.reasons) console.log(`├── ${reason}`);
  console.log('');
  console.log('RAW V2 BREAKDOWN');
  console.log(JSON.stringify(live.breakdown, null, 2));
}
