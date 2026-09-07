import React from 'react';
import { Check, X } from 'lucide-react';

export function FilterSheet({ open, leagues, activeLeagues, onToggleLeague, favoritesOnly, onFavoritesOnly, onClose }) {
  if (!open) return null;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <aside className="filter-sheet" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-header">
          <div><span className="eyebrow">Personalize</span><h2>Filter & Sort</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Close filters"><X size={18} /></button>
        </div>
        <div className="sheet-section">
          <div className="sheet-label">Show</div>
          <button className={`sheet-option ${!favoritesOnly ? 'selected' : ''}`} onClick={() => onFavoritesOnly(false)}>My Games {!favoritesOnly && <Check size={16} />}</button>
          <button className={`sheet-option ${favoritesOnly ? 'selected' : ''}`} onClick={() => onFavoritesOnly(true)}>Favorite teams only {favoritesOnly && <Check size={16} />}</button>
        </div>
        <div className="sheet-section">
          <div className="sheet-label">Leagues</div>
          <div className="league-options">
            {leagues.map((league) => (
              <button key={league.id} className={`league-option ${activeLeagues.includes(league.id) ? 'selected' : ''}`} onClick={() => onToggleLeague(league.id)}>
                <span>{league.name}</span>
                {activeLeagues.includes(league.id) && <Check size={16} />}
              </button>
            ))}
          </div>
        </div>
        <div className="sheet-section">
          <div className="sheet-label">Sort</div>
          <div className="sort-note">Priority first, then start time. Live games always rise to the top.</div>
        </div>
      </aside>
    </div>
  );
}
