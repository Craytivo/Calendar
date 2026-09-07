import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { leagues } from '../sports/leagues.js';
import { GameCard } from './GameCard.jsx';

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function leagueColor(leagueId) {
  const league = leagues.find((item) => item.id === leagueId);
  return league?.color || '#64748b';
}

function formatDateKey(dateKey, options = {}) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString('en-US', options);
}

function getDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function CalendarView({ games, cursor, onShiftMonth }) {
  const [selectedDateKey, setSelectedDateKey] = useState(null);
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const weeks = Math.ceil((firstDay + daysInMonth) / 7);
  const startDate = new Date(year, month, 1 - firstDay);
  const visibleDays = Array.from({ length: weeks * 7 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return date;
  });

  const gamesByDate = useMemo(() => {
    const grouped = new Map();
    games.forEach((game) => {
      const dateKey = game.startTime.slice(0, 10);
      if (!grouped.has(dateKey)) grouped.set(dateKey, []);
      grouped.get(dateKey).push(game);
    });
    return grouped;
  }, [games]);

  const selectedGames = selectedDateKey ? (gamesByDate.get(selectedDateKey) || []) : [];

  return (
    <section className="calendar-view">
      <div className="calendar-heading">
        <div>
          <span className="eyebrow">7-day schedule</span>
          <h2>{monthNames[month]} {year}</h2>
        </div>
        <div className="month-controls">
          <button className="icon-button" onClick={() => onShiftMonth(-1)} aria-label="Previous week"><ChevronLeft size={18} /></button>
          <button className="icon-button" onClick={() => onShiftMonth(1)} aria-label="Next week"><ChevronRight size={18} /></button>
        </div>
      </div>

      <div className="calendar-card">
        <div className="week-row">
          {weekDays.map((day) => <div key={day}>{day}</div>)}
        </div>
        <div className="calendar-grid seven-day-grid">
          {visibleDays.map((date) => {
            const dateKey = getDateKey(date);
            const dayGames = gamesByDate.get(dateKey) || [];
            const inMonth = date.getMonth() === month;
            const hasLive = dayGames.some((game) => game.status === 'live');

            return (
              <button
                type="button"
                className={`day-cell ${!inMonth ? 'muted' : ''} ${hasLive ? 'has-live' : ''}`}
                key={dateKey}
                onClick={() => setSelectedDateKey(dateKey)}
                aria-label={`${formatDateKey(dateKey, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}, ${dayGames.length} game${dayGames.length === 1 ? '' : 's'}`}
              >
                <span className="day-number">{date.getDate()}</span>
                {dayGames.length > 0 && (
                  <div className="game-dots" aria-hidden="true">
                    {dayGames.slice(0, 8).map((game) => (
                      <span
                        className={`game-dot ${game.status === 'live' ? 'live' : ''}`}
                        key={game.id}
                        style={{ '--dot-color': leagueColor(game.leagueId) }}
                      />
                    ))}
                    {dayGames.length > 8 && <span className="game-dot-more">+{dayGames.length - 8}</span>}
                  </div>
                )}
                {dayGames.length > 0 && (
                  <span className="day-game-count">{dayGames.length} {dayGames.length === 1 ? 'game' : 'games'}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <p className="calendar-note">Select any date to view its games and details.</p>

      {selectedDateKey && (
        <div className="calendar-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelectedDateKey(null)}>
          <div className="calendar-modal" role="dialog" aria-modal="true" aria-labelledby="calendar-modal-title">
            <div className="calendar-modal-header">
              <div>
                <span className="eyebrow">Game schedule</span>
                <h3 id="calendar-modal-title">{formatDateKey(selectedDateKey, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h3>
                <span className="calendar-modal-count">{selectedGames.length} {selectedGames.length === 1 ? 'game' : 'games'}</span>
              </div>
              <button className="icon-button" onClick={() => setSelectedDateKey(null)} aria-label="Close date details"><X size={18} /></button>
            </div>

            {selectedGames.length > 0 ? (
              <div className="calendar-modal-games">
                {selectedGames.map((game) => <GameCard key={game.id} game={game} />)}
              </div>
            ) : (
              <div className="calendar-modal-empty">No games scheduled for this date.</div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
