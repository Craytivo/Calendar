import React from 'react';

const teamInitials = {
  'sac-kings': 'SAC',
  'oregon-ducks': 'ORE',
  'real-madrid': 'RMA',
  tottenham: 'TOT',
  'blue-jays': 'TOR',
  oilers: 'EDM',
};

export function TeamMark({ team, size = 'medium' }) {
  const label = teamInitials[team?.id] || team?.abbreviation || team?.name?.slice(0, 3) || 'TBD';
  return <span className={`team-mark ${size}`} aria-hidden="true">{label}</span>;
}
