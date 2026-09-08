const MAX_FUTURE_DAYS = 7;
const VALID_STATUSES = new Set(['scheduled','live','final','postponed','cancelled']);

export function isReliableGame(game, now = new Date()) {
  if (!game?.id || !game?.leagueId || !game?.startTime) return false;
  const time = new Date(game.startTime).getTime();
  if (!Number.isFinite(time)) return false;
  if (!VALID_STATUSES.has(game.status)) return false;
  if (game.status === 'live' || game.status === 'final') return true;
  const max = now.getTime() + MAX_FUTURE_DAYS * 86400000;
  return time <= max;
}

export function sanitizeGames(games, now = new Date()) {
  const unique = new Map();
  for (const game of Array.isArray(games) ? games : []) {
    if (!isReliableGame(game, now)) continue;
    const existing = unique.get(game.id);
    if (!existing) unique.set(game.id, game);
    else {
      const existingTime = new Date(existing.fetchedAt || 0).getTime();
      const nextTime = new Date(game.fetchedAt || 0).getTime();
      if (game.status === 'final' || (game.status === 'live' && existing.status !== 'final') || nextTime >= existingTime) unique.set(game.id, game);
    }
  }
  return [...unique.values()].sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

export function getDataReliability(games, now = new Date()) {
  const input = Array.isArray(games) ? games : [];
  const valid = input.filter((game) => isReliableGame(game, now));
  const duplicateCount = input.length - new Set(input.map((game) => game?.id).filter(Boolean)).size;
  const liveCount = valid.filter((game) => game.status === 'live').length;
  const staleLiveCount = valid.filter((game) => game.status === 'live' && game.fetchedAt && now.getTime() - new Date(game.fetchedAt).getTime() > 120000).length;
  return { inputCount: input.length, validCount: valid.length, duplicateCount, liveCount, staleLiveCount, status: staleLiveCount > 0 ? 'degraded' : 'ok' };
}
