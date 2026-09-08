function parseClock(clock) {
  if (typeof clock !== 'string') return null;
  const match = clock.trim().match(/^(\d+):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function formatSoccerClock(game) {
  const period = Number(game.period);
  const rawClock = String(game.clock || '').trim();
  if (period === 5) return 'PENALTIES';
  if (![1, 2, 3, 4].includes(period)) return rawClock;

  const seconds = parseClock(rawClock);
  if (seconds == null) return rawClock;

  const offset = period === 1 ? 0 : period === 2 ? 45 * 60 : period === 3 ? 90 * 60 : 105 * 60;
  const totalSeconds = seconds < offset ? offset + seconds : seconds;
  const minutes = Math.floor(totalSeconds / 60);
  const displaySeconds = String(totalSeconds % 60).padStart(2, '0');
  const phase = period <= 2 ? `${period}H` : 'ET';
  return `${phase} · ${minutes}:${displaySeconds}`;
}

export function formatScoreboardMeta(game) {
  const clock = game.clock || '';
  if (game.leagueId === 'mlb') {
    const inning = Number(game.period);
    if (Number.isFinite(inning) && inning > 0) {
      const suffix = inning === 1 ? 'st' : inning === 2 ? 'nd' : inning === 3 ? 'rd' : 'th';
      return `${inning}${suffix} inning`;
    }
    return '';
  }
  if (game.leagueId === 'epl' || game.leagueId === 'laliga' || game.leagueId === 'ucl') return formatSoccerClock(game);
  if (game.leagueId === 'nhl') {
    const period = Number(game.period);
    if (game.isOvertime) return period > 3 ? 'OT' : `P${period} · OT`;
    return Number.isFinite(period) ? `P${period}${clock ? ` · ${clock}` : ''}` : clock;
  }
  if (game.leagueId === 'ufc') {
    const period = Number(game.period);
    return Number.isFinite(period) ? `R${period}${clock ? ` · ${clock}` : ''}` : clock;
  }
  const period = game.period != null ? `Q${game.period}` : '';
  if (game.isOvertime) return period ? `${period} · OT` : 'OVERTIME';
  if (period && clock) return `${period} · ${clock}`;
  return period || clock || '';
}
