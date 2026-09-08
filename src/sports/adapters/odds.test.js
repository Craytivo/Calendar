import { normalizeEspnOdds } from './odds.js';

function assert(condition, message) { if (!condition) throw new Error(message); }

export function runOddsChecks() {
  const nfl = normalizeEspnOdds([
    { provider: { id: '41', name: 'DraftKings', priority: 1 }, spread: -1.5, overUnder: 51.5, homeTeamOdds: { moneyLine: -115 }, awayTeamOdds: { moneyLine: -105 }, overOdds: -110, underOdds: -110 },
    { provider: { id: '2', name: 'Other Book', priority: 2 }, spread: -2, overUnder: 50, homeTeamOdds: { moneyLine: -120 }, awayTeamOdds: { moneyLine: 100 } },
  ], { homeTeamId: 'home', awayTeamId: 'away' });
  assert(nfl.provider.name === 'DraftKings', 'highest-priority provider should be selected');
  assert(nfl.spread === -1.5, 'spread should normalize');
  assert(nfl.total === 51.5, 'total should normalize');
  assert(nfl.moneyline.home === -115 && nfl.moneyline.away === -105, 'two-way moneyline should normalize');
  assert(nfl.providers.length === 2, 'all providers should be retained as metadata');

  const soccer = normalizeEspnOdds([{ provider: { name: 'DraftKings', priority: 1 }, overUnder: 2.5, homeTeamOdds: { moneyLine: 120 }, awayTeamOdds: { moneyLine: 210 }, drawMoneyLine: 250 }]);
  assert(soccer.total === 2.5, 'soccer total should normalize');
  assert(soccer.moneyline.draw === 250, 'soccer draw moneyline should normalize');
  return true;
}

runOddsChecks();
