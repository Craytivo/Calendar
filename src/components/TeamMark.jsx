import React from 'react';

const teamIdentity = {
  'sac-kings': { label: 'SAC', color: '#5A2D81' },
  'oregon-ducks': { label: 'ORE', color: '#0A7A3B' },
  'real-madrid': { label: 'RMA', color: '#1F4E8C' },
  tottenham: { label: 'TOT', color: '#132257' },
  'blue-jays': { label: 'TOR', color: '#134A8E' },
  oilers: { label: 'EDM', color: '#FF4C00' },
};

export function TeamMark({ team, size = 'medium' }) {
  const identity = teamIdentity[team?.id] || {
    label: team?.abbreviation || team?.name?.slice(0, 3) || 'TBD',
    color: '#64748b',
  };

  return (
    <span
      className={`team-mark ${size}`}
      style={{ '--team-color': identity.color }}
      aria-label={`${team?.name || 'Team'} logo`}
    >
      <span>{identity.label}</span>
    </span>
  );
}
