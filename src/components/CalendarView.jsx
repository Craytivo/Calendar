import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { leagues } from '../sports/leagues.js';
import { GameCard } from './GameCard.jsx';

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export function CalendarView({ games, cursor, onShiftMonth }) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((firstDay + days) / 7) * 7 }, (_, i) => i - firstDay + 1);

  return (
    <section className="calendar-view">
      <div className="calendar-heading">
        <div>
          <span className="eyebrow">Full schedule</span>
          <h2>{monthNames[month]} {year}</h2>
        </div>
        <div className="month-controls">
          <button className="icon-button" onClick={() => onShiftMonth(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button>
          <button className="icon-button" onClick={() => onShiftMonth(1)} aria-label="Next month"><ChevronRight size={18} /></button>
        </div>
      </div>
      <div className="calendar-card">
        <div className="week-row">{weekDays.map((day) => <div key={day}>{day}</div>)}</div>
        <div className="calendar-grid">
          {cells.map((day, index) => {
            const dateKey = day > 0 && day <= days ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
            const dayGames = dateKey ? games.filter((game) => game.startTime.slice(0, 10) === dateKey) : [];
            return (
              <div className={`day-cell ${!dateKey ? 'muted' : ''}`} key={index}>
                {dateKey && <span className="day-number">{day}</span>}
                <div className="game-stack">{dayGames.map((game) => <GameCard key={game.id} game={game} compact />)}</div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="calendar-note">Calendar uses the same selected games and priority system as My Games.</p>
    </section>
  );
}
