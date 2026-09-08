import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { leagues } from './sports/leagues.js';
import { favoriteTeamIds } from './sports/team-identity.js';
import { getMyGames } from './sports/selectors.js';
import { getGameStateRefreshDelay, mergeGameUpdate, mergeLiveGames } from './sports/live-state.js';
import { AppHeader } from './components/AppHeader.jsx';
import { CalendarView } from './components/CalendarView.jsx';
import { FilterSheet } from './components/FilterSheet.jsx';
import { GameDetailModal } from './components/GameDetailModal.jsx';
import { MyGamesView } from './components/MyGamesView.jsx';
import { ViewSwitcher } from './components/ViewSwitcher.jsx';
import './styles.css';
import './styles-polish.css';
import './theme-contrast.css';
import './spacing-refinement.css';
import './dark-heading-contrast.css';
import './watch-score-refinement.css';

const viewerTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const CALENDAR_REFRESH_MS = 300_000;

function formatFreshness(date, loading) {
  if (loading && !date) return 'Updating data…';
  if (!date) return 'Waiting for data';
  const ageSeconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (ageSeconds < 10) return 'Updated just now';
  if (ageSeconds < 60) return `Updated ${ageSeconds}s ago`;
  const minutes = Math.floor(ageSeconds / 60);
  if (ageSeconds < 120) return `Updated ${minutes}m ago`;
  return `Data delayed · ${minutes}m ago`;
}
