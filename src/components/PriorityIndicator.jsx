import React from 'react';
import { Star, Zap } from 'lucide-react';
import { getPriorityLabel, getPriorityTier } from '../sports/priority.js';

export function PriorityIndicator({ game }) {
  const tier = getPriorityTier(game);
  const label = getPriorityLabel(game);
  const isFavorite = Boolean(game.homeTeam?.favorite || game.awayTeam?.favorite);

  if (tier > 4 && !isFavorite) return null;

  return (
    <span className={`priority-indicator tier-${tier}`}>
      {tier <= 1 ? <Zap size={12} /> : isFavorite ? <Star size={12} fill="currentColor" /> : null}
      {label}
    </span>
  );
}
