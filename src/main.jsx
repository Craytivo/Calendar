import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { leagues } from './sports/leagues.js';
import { getMyGames } from './sports/selectors.js';
import { AppHeader } from './components/AppHeader.jsx';
import { CalendarView } from './components/CalendarView.jsx';
import { FilterSheet } from './components/FilterSheet.jsx';
import { MyGamesView } from './components/MyGamesView.jsx';
import { ViewSwitcher } from './components/ViewSwitcher.jsx';
import './styles.css';

const favoriteTeamIds = new Set(['sac-kings', 'oregon-ducks', 'real-madrid', 'tottenham', 'blue-jays', 'oilers', 'vikings']);
const viewerTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

function App() {
  const today = new Date();
  const [view, setView] = useState('my-games');
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [games, setGames] = useState([]);
  const [activeLeagues, setActiveLeagues] = useState(leagues.map((league) => league.id));
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadGames = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/sports?days=7&timezone=${encodeURIComponent(viewerTimeZone)}`);
      if (!response.ok) throw new Error('Sports data unavailable');
      const payload = await response.json();
      setGames(payload.games ?? []);
      setLastUpdated(payload.fetchedAt ?? new Date().toISOString());
    } catch (err) {
      setError(err.message || 'Unable to load sports data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadGames(); }, []);

  const filteredMyGames = useMemo(() => {
    const selected = getMyGames(games, today);
    return selected
      .filter((game) => activeLeagues.includes(game.leagueId))
      .filter((game) => !favoritesOnly || favoriteTeamIds.has(game.homeTeamId) || favoriteTeamIds.has(game.awayTeamId));
  }, [games, activeLeagues, favoritesOnly]);

  const toggleLeague = (id) => setActiveLeagues((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  const shiftMonth = (delta) => setCursor((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));

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

      {view === 'my-games' ? (
        <MyGamesView games={filteredMyGames} now={today} />
      ) : (
        <CalendarView games={filteredMyGames} cursor={cursor} onShiftMonth={shiftMonth} />
      )}

      <footer>
        <span>{loading ? 'Loading sports data…' : `${filteredMyGames.length} games in your 7-day view`}</span>
        <span>{lastUpdated ? `Updated ${new Date(lastUpdated).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Free data aggregation'}</span>
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
