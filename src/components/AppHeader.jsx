import React from 'react';
import { RefreshCw } from 'lucide-react';

export function AppHeader({ loading, onRefresh }) {
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-mark">G</span>
        <span>GameDay</span>
      </div>
      <button className="icon-button" onClick={onRefresh} aria-label="Refresh sports data" title="Refresh sports data">
        <RefreshCw size={18} className={loading ? 'spin' : ''} />
      </button>
    </header>
  );
}
