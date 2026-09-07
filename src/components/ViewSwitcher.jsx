import React from 'react';
import { CalendarDays, ListFilter } from 'lucide-react';

export function ViewSwitcher({ view, onChange, onFilter }) {
  return (
    <div className="view-toolbar">
      <div className="segmented-control" aria-label="View">
        <button className={view === 'my-games' ? 'active' : ''} onClick={() => onChange('my-games')}>
          My Games
        </button>
        <button className={view === 'calendar' ? 'active' : ''} onClick={() => onChange('calendar')}>
          <CalendarDays size={15} /> Calendar
        </button>
      </div>
      <button className="filter-button" onClick={onFilter}>
        <ListFilter size={16} />
        <span>Filter & Sort</span>
      </button>
    </div>
  );
}
