const SPORT_PROFILES = {
  nfl: { liveMs: 30_000, lateMs: 15_000, breakMs: 60_000, upcomingMs: 30_000 },
  'ncaa-football': { liveMs: 30_000, lateMs: 15_000, breakMs: 60_000, upcomingMs: 30_000 },
  nba: { liveMs: 20_000, lateMs: 10_000, breakMs: 60_000, upcomingMs: 30_000 },
  nhl: { liveMs: 20_000, lateMs: 15_000, breakMs: 90_000, upcomingMs: 30_000 },
  mlb: { liveMs: 20_000, lateMs: 15_000, breakMs: 30_000, upcomingMs: 30_000 },
  epl: { liveMs: 30_000, lateMs: 15_000, breakMs: 60_000, upcomingMs: 30_000 },
  laliga: { liveMs: 30_000, lateMs: 15_000, breakMs: 60_000, upcomingMs: 30_000 },
  ucl: { liveMs: 30_000, lateMs: 15_000, breakMs: 60_000, upcomingMs: 30_000 },
  'epl-cup': { liveMs: 30_000, lateMs: 15_000, breakMs: 60_000, upcomingMs: 30_000 },
  ufc: { liveMs: 30_000, lateMs: 20_000, breakMs: 60_000, upcomingMs: 60_000 },
};

function profileFor(game) {
  return SPORT_PROFILES[game?.leagueId] ?? { liveMs: 30_000, lateMs: 15_000, breakMs: 60_000, upcomingMs: 30_000 };
}

function clockSeconds(game) {
  const value = Number(game?.clockSeconds);
  return Number.isFinite(value) ? value : undefined;
}

function detail(game) {
  return String(game?.statusDetail ?? game?.shortDetail ?? '').toLowerCase();
}

export function isGameBreak(game) {
  if (game?.status !== 'live') return false;
  const text = detail(game);
  if (/half.?time|halftime|intermission|end of (?:the )?(?:1st|2nd|3rd|first|second|third) (?:half|period)|between periods/.test(text)) return true;
  const clock = clockSeconds(game);
  if (clock !== undefined && clock <= 0) {
    if (['nfl', 'ncaa-football', 'nba', 'nhl'].includes(game?.leagueId)) return true;
  }
  return false;
}

export function getGameStateRefreshDelay(games, now = Date.now()) {
  const todayKey = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));
  const todayGames = games.filter((game) => {
    const key = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(game.startTime));
    return key === todayKey;
  });
  if (!todayGames.length) return null;

  const liveGames = todayGames.filter((game) => game.status === 'live');
  if (liveGames.length) {
    const active = liveGames.filter((game) => !isGameBreak(game));
    if (!active.length) return Math.min(...liveGames.map((game) => profileFor(game).breakMs));
    return Math.min(...active.map((game) => {
      const profile = profileFor(game);
      const clock = clockSeconds(game);
      const late = clock !== undefined && clock <= 120;
      return late ? profile.lateMs : profile.liveMs;
    }));
  }

  const upcoming = todayGames
    .filter((game) => game.status !== 'final' && game.status !== 'cancelled' && game.status !== 'postponed')
    .map((game) => ({ game, delta: new Date(game.startTime).getTime() - now }))
    .filter(({ delta }) => Number.isFinite(delta) && delta > 0)
    .sort((a, b) => a.delta - b.delta);

  if (!upcoming.length) return null;
  const next = upcoming[0];
  const profile = profileFor(next.game);
  if (next.delta <= 5 * 60_000) return 15_000;
  if (next.delta <= 30 * 60_000) return profile.upcomingMs;
  if (next.delta <= 2 * 60 * 60_000) return 60_000;
  return 300_000;
}

export function statusRank(status) {
  if (status === 'final') return 3;
  if (status === 'live') return 2;
  return 1;
}

export function mergeGameUpdate(current, update) {
  if (!current) return update;
  if (!update) return current;

  const currentRank = statusRank(current.status);
  const updateRank = statusRank(update.status);
  if (updateRank < currentRank) return current;

  const currentFetched = Date.parse(current.fetchedAt ?? current.lastUpdated ?? '');
  const updateFetched = Date.parse(update.fetchedAt ?? update.lastUpdated ?? '');
  if (currentRank === updateRank && Number.isFinite(currentFetched) && Number.isFinite(updateFetched) && updateFetched < currentFetched) return current;

  return {
    ...current,
    ...update,
    homeTeam: { ...current.homeTeam, ...update.homeTeam },
    awayTeam: { ...current.awayTeam, ...update.awayTeam },
  };
}

export function mergeLiveGames(currentGames, liveGames) {
  if (!liveGames.length) return currentGames;
  const updates = new Map(liveGames.map((game) => [game.id, game]));
  const merged = currentGames.map((game) => mergeGameUpdate(game, updates.get(game.id)));
  const existingIds = new Set(currentGames.map((game) => game.id));
  return [...merged, ...liveGames.filter((game) => !existingIds.has(game.id))];
}
