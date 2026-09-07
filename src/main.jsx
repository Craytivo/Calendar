import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ChevronLeft, ChevronRight, Plus, RefreshCw, Settings2, Star } from 'lucide-react';
import { leagues } from './sports/leagues.js';
import { getMyGames } from './sports/selectors.js';
import './styles.css';

const leagueColors = {
  nfl: 'ink',
  nba: 'blue',
  'ncaa-football': 'green',
  laliga: 'red',
  epl: 'blue',
  mlb: 'green',
  nhl: 'red',
  ufc: 'ink',
  ucl: 'blue',
};

const favoriteTeamIds = new Set(['sac-kings', 'oregon-ducks', 'real-madrid', 'tottenham', 'blue-jays', 'oilers']);
const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function App() {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [games, setGames] = useState([]);
  const [activeLeagues, setActiveLeagues] = useState(leagues.map((league) => league.id));
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadGames = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/sports?days=7');
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

  const myGames = useMemo(() => {
    const selected = getMyGames(games, today);
    return selected
      .filter((game) => activeLeagues.includes(game.leagueId))
      .filter((game) => !favoritesOnly || favoriteTeamIds.has(game.homeTeamId) || favoriteTeamIds.has(game.awayTeamId));
  }, [games, activeLeagues, favoritesOnly]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((firstDay + days) / 7) * 7 }, (_, i) => i - firstDay + 1);

  const toggleLeague = (id) => setActiveLeagues((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const shiftMonth = (delta) => setCursor(new Date(year, month + delta, 1));

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">G</span><span>GameDay</span></div>
        <div className="top-actions">
          <button className="icon-button" onClick={loadGames} title="Refresh sports data"><RefreshCw size={18} className={loading ? 'spin' : ''} /></button>
          <button className="icon-button"><Settings2 size={18} /></button>
          <button className="add-button"><Plus size={18} /> Add league</button>
        </div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">Your sports. Your schedule.</p>
          <h1>Only the games you care about.</h1>
          <p className="hero-copy">A focused sports calendar built around your favorite leagues, teams, and matchups — without the noise.</p>
        </div>
        <button className={`focus-toggle ${favoritesOnly ? 'active' : ''}`} onClick={() => setFavoritesOnly(!favoritesOnly)}>
          <Star size={17} fill={favoritesOnly ? 'currentColor' : 'none'} /> Favorites only
        </button>
      </section>

      <section className="controls">
        <div className="league-filters">
          {leagues.map((league) => <button key={league.id} className={`league-pill ${activeLeagues.includes(league.id) ? 'selected' : ''}`} onClick={() => toggleLeague(league.id)}><span className={`dot ${leagueColors[league.id]}`} />{league.shortName}</button>)}
        </div>
        <div className="month-controls">
          <button className="icon-button" onClick={() => shiftMonth(-1)}><ChevronLeft size={18} /></button>
          <strong>{monthNames[month]} {year}</strong>
          <button className="icon-button" onClick={() => shiftMonth(1)}><ChevronRight size={18} /></button>
        </div>
      </section>

      {error && <div className="data-notice">{error}. The calendar will retry when you refresh.</div>}

      <section className="calendar-card">
        <div className="week-row">{weekDays.map((day) => <div key={day}>{day}</div>)}</div>
        <div className="calendar-grid">
          {cells.map((day, index) => {
            const dateKey = day > 0 && day <= days ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
            const dayGames = dateKey ? myGames.filter((game) => game.startTime.slice(0, 10) === dateKey) : [];
            return <div className={`day-cell ${day < 1 || day > days ? 'muted' : ''}`} key={index}>
              {day > 0 && day <= days && <span className="day-number">{day}</span>}
              <div className="game-stack">{dayGames.map((game) => <Game game={game} key={game.id} />)}</div>
            </div>;
          })}
        </div>
      </section>

      <footer>
        <span>{loading ? 'Loading sports data…' : `${myGames.length} priority games in the 7-day window`}</span>
        <span>{lastUpdated ? `Updated ${new Date(lastUpdated).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Free data aggregation · Phase 2'}</span>
      </footer>
    </main>
  );
}

function Game({ game }) {
  const league = leagues.find((item) => item.id === game.leagueId);
  const status = game.status === 'final' ? 'Final' : game.status === 'live' ? 'Live' : new Date(game.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return <button className={`game-card ${leagueColors[game.leagueId]}`}>
    <span className="game-league">{league?.shortName ?? game.leagueId.toUpperCase()} · {status}</span>
    <span className="matchup"><b>{game.awayTeam?.name ?? 'TBD'}</b><span>@</span><b>{game.homeTeam?.name ?? 'TBD'}</b></span>
  </button>;
}

createRoot(document.getElementById('root')).render(<App />);
