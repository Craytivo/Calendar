import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { GameCard } from './GameCard.jsx';
import { IntelligentDaySummary } from './IntelligentDaySummary.jsx';
import './CalendarView.css';
import './IntelligentDaySummary.css';

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PRIORITY_TIERS = new Set(['must-watch', 'excellent', 'strong', 'worth-watching']);

function formatDate(date, options = {}) {
  return date.toLocaleDateString('en-US', options);
}

function getDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function startOfWeek(date) {
  const value = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  value.setDate(value.getDate() - value.getDay());
  return value;
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function isPriority(game) {
  return PRIORITY_TIERS.has(game.v2.tier.id);
}

export function CalendarView({ games, cursor, onShiftWeek, onOpenGame }) {
  const [selectedDateKey, setSelectedDateKey] = useState(null);
  const weekStart = startOfWeek(cursor);
  const visibleDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const weekEnd = visibleDays[6];

  const gamesByDate = useMemo(() => {
    const grouped = new Map();
    games.forEach((game) => {
      const dateKey = getDateKey(new Date(game.schedule.startTime));
      if (!grouped.has(dateKey)) grouped.set(dateKey, []);
      grouped.get(dateKey).push(game);
    });
    return grouped;
  }, [games]);

  const selectedGames = selectedDateKey ? (gamesByDate.get(selectedDateKey) || []) : [];
  const selectedDate = selectedDateKey ? new Date(`${selectedDateKey}T12:00:00`) : null;
  const totalGames = visibleDays.reduce((sum, date) => sum + (gamesByDate.get(getDateKey(date)) || []).length, 0);
  const priorityGames = visibleDays.reduce((sum, date) => {
    const dayGames = gamesByDate.get(getDateKey(date)) || [];
    return sum + dayGames.filter(isPriority).length;
  }, 0);

  return (
    <section className="calendar-view">
      <div className="calendar-heading">
        <div>
          <span className="eyebrow">Weekly radar</span>
          <h2>{formatDate(weekStart, { month: 'short', day: 'numeric' })} – {formatDate(weekEnd, { month: 'short', day: 'numeric', year: 'numeric' })}</h2>
          <p className="calendar-subtitle">Scan the week, then open a day for ranked games and V2 reasoning.</p>
        </div>
        <div className="month-controls">
          <button className="icon-button" onClick={() => onShiftWeek(-1)} aria-label="Previous week"><ChevronLeft size={18} /></button>
          <button className="icon-button" onClick={() => onShiftWeek(1)} aria-label="Next week"><ChevronRight size={18} /></button>
        </div>
      </div>

      <div className="calendar-radar-summary" aria-label="Weekly game summary">
        <div><strong>{totalGames}</strong><span>games</span></div>
        <div><strong>{priorityGames}</strong><span>ranked</span></div>
        <div className="radar-legend"><span className="legend-dot priority" />Ranked <span className="legend-dot live" />Live</div>
      </div>

      <div className="calendar-card">
        <div className="week-row">
          {visibleDays.map((date) => (
            <div key={getDateKey(date)} className="week-day-label"><span>{weekDays[date.getDay()]}</span><strong>{date.getDate()}</strong></div>
          ))}
        </div>
        <div className="calendar-grid seven-day-grid">
          {visibleDays.map((date) => {
            const dateKey = getDateKey(date);
            const dayGames = gamesByDate.get(dateKey) || [];
            const hasLive = dayGames.some((game) => game.status.state === 'live');
            const hasPriority = dayGames.some(isPriority);
            return (
              <button
                type="button"
                className={`day-cell ${hasLive ? 'has-live' : ''} ${hasPriority ? 'has-priority' : ''}`}
                key={dateKey}
                onClick={() => setSelectedDateKey(dateKey)}
                aria-label={`${formatDate(date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}, ${dayGames.length} game${dayGames.length === 1 ? '' : 's'}`}
              >
                <span className="day-number">{date.getDate()}</span>
                {dayGames.length > 0 && <div className="game-dots" aria-hidden="true">
                  {dayGames.slice(0, 8).map((game) => <span className={`game-dot ${game.status.state === 'live' ? 'live' : ''} ${isPriority(game) ? 'priority' : ''}`} key={game.identity.gameId} />)}
                  {dayGames.length > 8 && <span className="game-dot-more">+{dayGames.length - 8}</span>}
                </div>}
                <span className="day-game-count">{dayGames.length ? `${dayGames.length} ${dayGames.length === 1 ? 'game' : 'games'}` : 'No games'}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="calendar-note">The radar is intentionally lightweight; the selected day contains the detailed V2 view.</p>

      {selectedDateKey && <div className="calendar-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelectedDateKey(null)}>
        <div className="calendar-modal" role="dialog" aria-modal="true" aria-labelledby="calendar-modal-title">
          <div className="calendar-modal-header">
            <div><span className="eyebrow">Day view</span><h3 id="calendar-modal-title">{formatDate(selectedDate, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h3></div>
            <button className="icon-button" onClick={() => setSelectedDateKey(null)} aria-label="Close date details"><X size={18} /></button>
          </div>
          <IntelligentDaySummary games={selectedGames} date={selectedDate} onOpenGame={onOpenGame} />
          {selectedGames.length > 0
            ? <div className="calendar-modal-games">{selectedGames.map((game) => <GameCard key={game.identity.gameId} game={game} onOpen={onOpenGame} />)}</div>
            : <div className="calendar-modal-empty">No games scheduled for this date.</div>}
        </div>
      </div>}
    </section>
  );
}
