import React, { useEffect, useMemo, useState } from 'react';
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
  return `Updated ${minutes}m ago`;
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
  const merged = currentGames.map((game) => updates.get(game.id) ? { ...game, ...updates.get(game.id) } : game);
  const existingIds = new Set(currentGames.map((game) => game.id));
  return [...merged, ...liveGames.filter((game) => !existingIds.has(game.id))];
}

function App() {
  const today = new Date();
  const [view, setView] = useState('my-games');
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const [games, setGames] = useState([]);
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
      if (!silent || !games.length) setError(err.message || 'Unable to load sports data');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const todayLeagueIds = useMemo(() => {
    const ids = new Set();
    for (const game of games) {
      if (localDateKey(game.startTime) === localDateKey(Date.now())) ids.add(game.leagueId);
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
      setSelectedGame((current) => current ? liveGames.find((game) => game.id === current.id) ? { ...current, ...liveGames.find((game) => game.id === current.id) } : current : current);
      if (liveGames.length) setLastUpdated(payload.fetchedAt ?? new Date().toISOString());
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
    const refreshMs = hasLiveGames ? LIVE_REFRESH_MS : IDLE_LIVE_REFRESH_MS;
    const timer = window.setInterval(() => {
      setFreshnessNow(Date.now());
      void loadLiveGames();
    }, refreshMs);
    return () => window.clearInterval(timer);
  }, [todayLeagueQuery, hasLiveGames]);

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
        <span className="data-freshness" title={hasLiveGames ? 'Live scoreboards refresh automatically every 30 seconds; the full calendar refreshes every 5 minutes' : 'Live scoreboards refresh automatically every 60 seconds when today has games; the full calendar refreshes every 5 minutes'}>{freshnessLabel}</span>
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
