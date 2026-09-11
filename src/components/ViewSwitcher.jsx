import React from 'react';
import { CalendarDays, ListFilter } from 'lucide-react';

export function ViewSwitcher({ view, onChange, onFilter }) {
  return (
    <div className="view-toolbar" aria-label="Calendar views">
      <div className="segmented-control">
        <button className={view === 'my-games' ? 'active' : ''} onClick={() => onChange('my-games')} aria-pressed={view === 'my-games'}>
          My Games
        </button>
        <button className={view === 'calendar' ? 'active' : ''} onClick={() => onChange('calendar')} aria-pressed={view === 'calendar'}>
          <CalendarDays size={15} /> Calendar
        </button>
      </div>
      <button className="filter-button" onClick={onFilter} aria-label="Filter games" title="Filter games">
        <ListFilter size={16} />
        <span>Filter</span>
      </button>
    </div>
  );
}
