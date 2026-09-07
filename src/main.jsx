import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ChevronLeft, ChevronRight, Plus, Settings2, Star } from 'lucide-react';
import './styles.css';

const leagues = [
  { id: 'nfl', name: 'NFL', color: 'ink' },
  { id: 'nba', name: 'NBA', color: 'blue' },
  { id: 'nhl', name: 'NHL', color: 'red' },
  { id: 'mlb', name: 'MLB', color: 'green' },
];

const initialGames = [
  { id: 1, date: '2026-09-08', time: '18:30', league: 'nfl', away: 'Kansas City', home: 'Las Vegas', status: 'Upcoming' },
  { id: 2, date: '2026-09-10', time: '19:00', league: 'nba', away: 'Boston', home: 'New York', status: 'Upcoming' },
  { id: 3, date: '2026-09-11', time: '19:30', league: 'nhl', away: 'Edmonton', home: 'Calgary', status: 'Upcoming' },
  { id: 4, date: '2026-09-13', time: '11:00', league: 'nfl', away: 'Buffalo', home: 'Miami', status: 'Upcoming' },
  { id: 5, date: '2026-09-15', time: '18:00', league: 'mlb', away: 'Toronto', home: 'Seattle', status: 'Upcoming' },
];

const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const weekDays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function App() {
  const [cursor, setCursor] = useState(new Date(2026, 8, 1));
  const [games] = useState(initialGames);
  const [activeLeagues, setActiveLeagues] = useState(['nfl', 'nba', 'nhl']);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const visibleGames = useMemo(() => games.filter(g => activeLeagues.includes(g.league)), [games, activeLeagues]);
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((firstDay + days) / 7) * 7 }, (_, i) => i - firstDay + 1);

  const toggleLeague = (id) => setActiveLeagues(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const shiftMonth = (delta) => setCursor(new Date(year, month + delta, 1));

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">G</span><span>GameDay</span></div>
        <div className="top-actions"><button className="icon-button"><Settings2 size={18} /></button><button className="add-button"><Plus size={18} /> Add league</button></div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">Your sports. Your schedule.</p>
          <h1>Only the games you care about.</h1>
          <p className="hero-copy">A focused sports calendar built around your favorite leagues, teams, and matchups — without the noise.</p>
        </div>
        <button className={`focus-toggle ${favoritesOnly ? 'active' : ''}`} onClick={() => setFavoritesOnly(!favoritesOnly)}><Star size={17} fill={favoritesOnly ? 'currentColor' : 'none'} /> Favorites only</button>
      </section>

      <section className="controls">
        <div className="league-filters">
          {leagues.map(league => <button key={league.id} className={`league-pill ${activeLeagues.includes(league.id) ? 'selected' : ''}`} onClick={() => toggleLeague(league.id)}><span className={`dot ${league.color}`} />{league.name}</button>)}
        </div>
        <div className="month-controls">
          <button className="icon-button" onClick={() => shiftMonth(-1)}><ChevronLeft size={18} /></button>
          <strong>{monthNames[month]} {year}</strong>
          <button className="icon-button" onClick={() => shiftMonth(1)}><ChevronRight size={18} /></button>
        </div>
      </section>

      <section className="calendar-card">
        <div className="week-row">{weekDays.map(day => <div key={day}>{day}</div>)}</div>
        <div className="calendar-grid">
          {cells.map((day, index) => {
            const dateKey = day > 0 && day <= days ? `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}` : null;
            const dayGames = dateKey ? visibleGames.filter(g => g.date === dateKey) : [];
            return <div className={`day-cell ${day < 1 || day > days ? 'muted' : ''}`} key={index}>
              {day > 0 && day <= days && <span className="day-number">{day}</span>}
              <div className="game-stack">{dayGames.map(game => <Game game={game} key={game.id} />)}</div>
            </div>;
          })}
        </div>
      </section>

      <footer><span>{visibleGames.length} games in view</span><span>Phase 1 · Calendar foundation</span></footer>
    </main>
  );
}

function Game({ game }) {
  const league = leagues.find(l => l.id === game.league);
  return <button className={`game-card ${league.color}`}><span className="game-league">{league.name} · {game.time}</span><span className="matchup"><b>{game.away}</b><span>@</span><b>{game.home}</b></span></button>;
}

createRoot(document.getElementById('root')).render(<App />);
