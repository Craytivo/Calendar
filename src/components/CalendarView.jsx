import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { leagues } from '../sports/leagues.js';
import { getPriorityTier } from '../sports/priority.js';
import { GameCard } from './GameCard.jsx';
import { GameDetailModal } from './GameDetailModal.jsx';

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function leagueColor(leagueId) {
  const league = leagues.find((item) => item.id === leagueId);
  return league?.color || '#64748b';
}

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
  return getPriorityTier(game) <= 2 || game.isMajorEvent;
}

export function CalendarView({ games, cursor, onShiftWeek }) {
  const [selectedDateKey, setSelectedDateKey] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const weekStart = startOfWeek(cursor);
  const visibleDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const weekEnd = visibleDays[6];

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
  const totalGames = visibleDays.reduce((sum, date) => sum + (gamesByDate.get(getDateKey(date)) || []).length, 0);
  const priorityGames = visibleDays.reduce((sum, date) => {
    const dayGames = gamesByDate.get(getDateKey(date)) || [];
    return sum + dayGames.filter(isPriority).length;
  }, 0);

  return (
    <section className="calendar-view">
      <div className="calendar-heading">
        <div>
          <span className="eyebrow">Visual weekly radar</span>
          <h2>{formatDate(weekStart, { month: 'short', day: 'numeric' })} – {formatDate(weekEnd, { month: 'short', day: 'numeric', year: 'numeric' })}</h2>
          <p className="calendar-subtitle">A quiet view of the week. Select a day to see the games.</p>
        </div>
        <div className="month-controls">
          <button className="icon-button" onClick={() => onShiftWeek(-1)} aria-label="Previous week"><ChevronLeft size={18} /></button>
          <button className="icon-button" onClick={() => onShiftWeek(1)} aria-label="Next week"><ChevronRight size={18} /></button>
        </div>
      </div>

      <div className="calendar-radar-summary">
        <div><strong>{totalGames}</strong><span>games</span></div>
        <div><strong>{priorityGames}</strong><span>priority</span></div>
        <div className="radar-legend"><span className="legend-dot priority" />Priority <span className="legend-dot live" />Live</div>
      </div>

      <div className="calendar-card">
        <div className="week-row">
          {visibleDays.map((date) => (
            <div key={getDateKey(date)} className="week-day-label">
              <span>{weekDays[date.getDay()]}</span>
              <strong>{date.getDate()}</strong>
            </div>
          ))}
        </div>
        <div className="calendar-grid seven-day-grid">
          {visibleDays.map((date) => {
            const dateKey = getDateKey(date);
            const dayGames = gamesByDate.get(dateKey) || [];
            const hasLive = dayGames.some((game) => game.status === 'live');
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
                {dayGames.length > 0 && (
                  <div className="game-dots" aria-hidden="true">
                    {dayGames.slice(0, 8).map((game) => (
                      <span
                        className={`game-dot ${game.status === 'live' ? 'live' : ''} ${isPriority(game) ? 'priority' : ''}`}
                        key={game.id}
                        style={{ '--dot-color': leagueColor(game.leagueId) }}
                      />
                    ))}
                    {dayGames.length > 8 && <span className="game-dot-more">+{dayGames.length - 8}</span>}
                  </div>
                )}
                <span className="day-game-count">{dayGames.length ? `${dayGames.length} ${dayGames.length === 1 ? 'game' : 'games'}` : 'No games'}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="calendar-note">My Games stays focused on what matters. This radar shows the broader week at a glance.</p>

      {selectedDateKey && (
        <div className="calendar-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelectedDateKey(null)}>
          <div className="calendar-modal" role="dialog" aria-modal="true" aria-labelledby="calendar-modal-title">
            <div className="calendar-modal-header">
              <div>
                <span className="eyebrow">Game schedule</span>
                <h3 id="calendar-modal-title">{formatDate(new Date(`${selectedDateKey}T12:00:00`), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h3>
                <span className="calendar-modal-count">{selectedGames.length} {selectedGames.length === 1 ? 'game' : 'games'}</span>
              </div>
              <button className="icon-button" onClick={() => setSelectedDateKey(null)} aria-label="Close date details"><X size={18} /></button>
            </div>

            {selectedGames.length > 0 ? (
              <div className="calendar-modal-games">
                {selectedGames.map((game) => <GameCard key={game.id} game={game} onOpen={setSelectedGame} />)}
              </div>
            ) : (
              <div className="calendar-modal-empty">No games scheduled for this date.</div>
            )}
          </div>
        </div>
      )}

      <GameDetailModal game={selectedGame} onClose={() => setSelectedGame(null)} />
    </section>
  );
}
