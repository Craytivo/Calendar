import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { leagues } from './sports/leagues.js';
import { favoriteTeamIds } from './sports/team-identity.js';
import { getMyGames } from './sports/selectors.js';
import { AppHeader } from './components/AppHeader.jsx';
import { CalendarView } from './components/CalendarView.jsx';
import { FilterSheet } from './components/FilterSheet.jsx';
import { GameDetailModal } from './components/GameDetailModal.jsx';
import { MyGamesView } from './components/MyGamesView.jsx';
import { ViewSwitcher } from './components/ViewSwitcher.jsx';
import './styles.css';
import './styles-polish.css';

const viewerTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const LIVE_REFRESH_MS = 30_000;
const IDLE_LIVE_REFRESH_MS = 60_000;
const CALENDAR_REFRESH_MS = 300_000;

function formatFreshness(date, loading) {
  if (loading && !date) return 'Updating data…';
  if (!date) return 'Waiting for data';
  const ageSeconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (ageSeconds < 10) return 'Updated just now';
  if (ageSeconds < 60) return `Updated ${ageSeconds}s ago`;
  const minutes = Math.floor(ageSeconds / 60);
  if (ageSeconds < 120) return `Updated ${minutes}m ago`;
  return `Data delayed · ${minutes}m ago`;
}

function localDateKey(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: viewerTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(date));
}

function mergeLiveGames(currentGames, liveGames) {
  if (!liveGames.length) return currentGames;
  const updates = new Map(liveGames.map((game) => [game.id, game]));
  const merged = currentGames.map((game) => {
    const update = updates.get(game.id);
    if (!update) return game;
    return {
      ...game,
      ...update,
      homeTeam: { ...game.homeTeam, ...update.homeTeam },
      awayTeam: { ...game.awayTeam, ...update.awayTeam },
    };
  });
  const existingIds = new Set(currentGames.map((game) => game.id));
  return [...merged, ...liveGames.filter((game) => !existingIds.has(game.id))];
}

function mergeSelectedGame(current, liveGames) {
  if (!current) return current;
  const update = liveGames.find((game) => game.id === current.id);
  if (!update) return current;
  return {
    ...current,
    ...update,
    homeTeam: { ...current.homeTeam, ...update.homeTeam },
    awayTeam: { ...current.awayTeam, ...update.awayTeam },
  };
}

function getLiveRefreshDelay(games, now = Date.now()) {
  const todayKey = localDateKey(now);
  const todayGames = games.filter((game) => localDateKey(game.startTime) === todayKey);
  if (!todayGames.length) return null;

  const liveGames = todayGames.filter((game) => game.status === 'live');
  if (liveGames.length) {
    const lateLive = liveGames.some((game) => {
      const seconds = Number(game.clockSeconds);
      return Number.isFinite(seconds) && seconds <= 120;
    });
    return lateLive ? 15_000 : LIVE_REFRESH_MS;
  }

  const upcoming = todayGames
    .filter((game) => game.status !== 'final')
    .map((game) => new Date(game.startTime).getTime() - now)
    .filter((delta) => Number.isFinite(delta) && delta > 0)
    .sort((a, b) => a - b);

  if (!upcoming.length) return null;
  const nextStart = upcoming[0];
  if (nextStart <= 5 * 60_000) return 15_000;
  if (nextStart <= 30 * 60_000) return 30_000;
  if (nextStart <= 2 * 60 * 60_000) return IDLE_LIVE_REFRESH_MS;
  return CALENDAR_REFRESH_MS;
}

function App() {
  const today = new Date();
  const [view, setView] = useState('my-games');
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const [games, setGames] = useState([]);
  const gamesRef = useRef(games);
  gamesRef.current = games;
  const [activeLeagues, setActiveLeagues] = useState(leagues.map((league) => league.id));
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dataHealth, setDataHealth] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [freshnessNow, setFreshnessNow] = useState(() => Date.now());

  const loadGames = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/sports?days=7&timezone=${encodeURIComponent(viewerTimeZone)}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Sports data unavailable');
      const payload = await response.json();
      const nextGames = payload.games ?? [];
      setGames(nextGames);
      setDataHealth(payload.health ?? null);
      setLastUpdated(payload.fetchedAt ?? new Date().toISOString());
      setSelectedGame((current) => current ? nextGames.find((game) => game.id === current.id) ?? current : current);
    } catch (err) {
      if (!silent || !gamesRef.current.length) setError(err.message || 'Unable to load sports data');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const todayLeagueIds = useMemo(() => {
    const todayKey = localDateKey(Date.now());
    const ids = new Set();
    for (const game of games) {
      if (localDateKey(game.startTime) === todayKey) ids.add(game.leagueId);
    }
    return Array.from(ids).sort();
  }, [games]);

  const todayLeagueQuery = todayLeagueIds.join(',');
  const hasLiveGames = games.some((game) => game.status === 'live');

  const loadLiveGames = async ({ silent = true } = {}) => {
    if (!todayLeagueQuery) return;
    try {
      const response = await fetch(`/api/sports?mode=live&leagues=${encodeURIComponent(todayLeagueQuery)}&timezone=${encodeURIComponent(viewerTimeZone)}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Live sports data unavailable');
      const payload = await response.json();
      const liveGames = payload.games ?? [];
      setGames((current) => mergeLiveGames(current, liveGames));
      setSelectedGame((current) => mergeSelectedGame(current, liveGames));
      setLastUpdated(payload.fetchedAt ?? new Date().toISOString());
    } catch (err) {
      if (!silent) setError(err.message || 'Unable to load live sports data');
    }
  };

  useEffect(() => { loadGames(); }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFreshnessNow(Date.now());
      void loadGames({ silent: true });
    }, CALENDAR_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!todayLeagueQuery) return undefined;

    let cancelled = false;
    let timer;

    const scheduleNextLiveRefresh = () => {
      if (cancelled) return;
      const delay = getLiveRefreshDelay(gamesRef.current);
      if (delay == null) return;
      timer = window.setTimeout(async () => {
        setFreshnessNow(Date.now());
        await loadLiveGames();
        scheduleNextLiveRefresh();
      }, delay);
    };

    void loadLiveGames();
    scheduleNextLiveRefresh();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [todayLeagueQuery]);

  useEffect(() => {
    const timer = window.setInterval(() => setFreshnessNow(Date.now()), 10_000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredGames = useMemo(() => games
    .filter((game) => activeLeagues.includes(game.leagueId))
    .filter((game) => !favoritesOnly || favoriteTeamIds.has(game.homeTeamId) || favoriteTeamIds.has(game.awayTeamId)),
  [games, activeLeagues, favoritesOnly]);

  const filteredMyGames = useMemo(() => getMyGames(filteredGames, today), [filteredGames]);

  const toggleLeague = (id) => setActiveLeagues((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  const shiftWeek = (delta) => setCursor((current) => new Date(current.getFullYear(), current.getMonth(), current.getDate() + (delta * 7)));

  const nflUnavailable = dataHealth?.nfl?.status === 'error';
  const freshnessLabel = useMemo(() => formatFreshness(lastUpdated, loading), [lastUpdated, loading, freshnessNow]);

  return (
    <main className="app-shell">
      <AppHeader loading={loading} onRefresh={loadGames} />

      <section className="page-intro">
        <div>
          <span className="eyebrow">Personal sports calendar</span>
          <h1>My Games</h1>
          <p>Only the games worth your attention, organized around today and the next seven days.</p>
        </div>
        <div className="window-note">7-day signal</div>
      </section>

      <ViewSwitcher view={view} onChange={setView} onFilter={() => setFilterOpen(true)} />

      {error && <div className="data-notice">{error}. Refresh to try again.</div>}
      {!error && nflUnavailable && (
        <div className="data-notice">NFL data is temporarily unavailable. Other sports may still be current. Refresh to retry NFL data.</div>
      )}

      {view === 'my-games' ? (
        <MyGamesView games={filteredMyGames} now={today} onOpenGame={setSelectedGame} />
      ) : (
        <CalendarView games={filteredGames} cursor={cursor} onShiftWeek={shiftWeek} onOpenGame={setSelectedGame} />
      )}

      <GameDetailModal game={selectedGame} onClose={() => setSelectedGame(null)} />

      <footer>
        <span>{loading ? 'Loading sports data…' : `${filteredMyGames.length} games in your 7-day view`}</span>
        <span className="data-freshness" title={hasLiveGames ? 'Live games refresh every 15 seconds late in the game and every 30 seconds otherwise; upcoming games increase refresh frequency near start time. The full calendar refreshes every 5 minutes.' : 'Upcoming games refresh more often as their start time approaches; the full calendar refreshes every 5 minutes.'}>{freshnessLabel}</span>
      </footer>

      <FilterSheet
        open={filterOpen}
        leagues={leagues}
        activeLeagues={activeLeagues}
        onToggleLeague={toggleLeague}
        favoritesOnly={favoritesOnly}
        onFavoritesOnly={setFavoritesOnly}
        onClose={() => setFilterOpen(false)}
      />

      <nav className="mobile-nav" aria-label="Primary navigation">
        <button className={view === 'my-games' ? 'active' : ''} onClick={() => setView('my-games')}>My Games</button>
        <button className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}>Calendar</button>
      </nav>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
