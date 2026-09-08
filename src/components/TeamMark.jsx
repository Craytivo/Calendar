import React, { useEffect, useState } from 'react';

const teamIdentity = {
  'sac-kings': { label: 'SAC', color: '#5A2D81' }, 'oregon-ducks': { label: 'ORE', color: '#0A7A3B' },
  'kansas-state-wildcats': { label: 'KSU', color: '#512888' }, 'washington-state-cougars': { label: 'WSU', color: '#981E32' },
  'real-madrid': { label: 'RMA', color: '#1F4E8C' }, tottenham: { label: 'TOT', color: '#132257' },
  'blue-jays': { label: 'TOR', color: '#134A8E' }, dodgers: { label: 'LAD', color: '#005A9C' },
  oilers: { label: 'EDM', color: '#FF4C00' }, vikings: { label: 'MIN', color: '#4F2683' }, 110: { label: 'INT', color: '#00529B' },
};

const favoriteLogoPaths = {
  'sac-kings': '/team-logos/sac-kings.png', 'oregon-ducks': '/team-logos/oregon-ducks.png',
  'kansas-state-wildcats': '/team-logos/kansas-state-wildcats.png', 'real-madrid': '/team-logos/real-madrid.png',
  tottenham: '/team-logos/tottenham.png', 'blue-jays': '/team-logos/blue-jays.png', dodgers: '/team-logos/dodgers.png',
  oilers: '/team-logos/oilers.png', vikings: '/team-logos/vikings.png', 'inter-milan': '/team-logos/inter-milan.png',
};

const localNameLogoPaths = {
  'Inter Milan': '/team-logos/inter-milan.png', Internazionale: '/team-logos/inter-milan.png', 'Inter Milano': '/team-logos/inter-milan.png',
  'Kansas State': '/team-logos/kansas-state-wildcats.png', 'Kansas State Wildcats': '/team-logos/kansas-state-wildcats.png',
  'Washington State': '/team-logos/washington-state-cougars.png', 'Washington State Cougars': '/team-logos/washington-state-cougars.png',
};

const leagueLogoDirectories = { nfl: 'nfl', nba: 'nba', mlb: 'mlb', epl: 'epl', laliga: 'laliga', 'eng.1': 'epl', 'esp.1': 'laliga' };

const collegeAbbreviations = {
  'Alabama Crimson Tide': 'ALA', 'Arkansas Razorbacks': 'ARK', 'Auburn Tigers': 'AUB', 'Clemson Tigers': 'CLEM', 'Florida Gators': 'FLA', 'Florida State Seminoles': 'FSU',
  'Georgia Bulldogs': 'UGA', 'Iowa Hawkeyes': 'IOWA', 'LSU Tigers': 'LSU', 'Miami Hurricanes': 'MIA', 'Michigan Wolverines': 'MICH', 'Mississippi State Bulldogs': 'MSST',
  'Notre Dame Fighting Irish': 'ND', 'Ohio State Buckeyes': 'OSU', 'Oklahoma Sooners': 'OU', 'Oklahoma State Cowboys': 'OKST', 'Ole Miss Rebels': 'MISS', 'Oregon Ducks': 'ORE',
  'Kansas State Wildcats': 'KSU', 'Washington State Cougars': 'WSU', 'Penn State Nittany Lions': 'PSU', 'South Carolina Gamecocks': 'SC', 'Tennessee Volunteers': 'TENN',
  'Texas Longhorns': 'TEX', 'Texas A&M Aggies': 'TAMU', 'Utah Utes': 'UTAH', 'Washington Huskies': 'WASH', 'Wisconsin Badgers': 'WIS',
};

const collegeShortNames = {
  'Oklahoma State Cowboys': 'Oklahoma St.', 'Mississippi State Bulldogs': 'Mississippi St.', 'Florida State Seminoles': 'Florida St.', 'Kansas State Wildcats': 'Kansas St.',
  'Michigan State Spartans': 'Michigan St.', 'Ohio State Buckeyes': 'Ohio State', 'Penn State Nittany Lions': 'Penn State', 'Arizona State Sun Devils': 'Arizona St.',
  'Iowa State Cyclones': 'Iowa State', 'Boise State Broncos': 'Boise St.', 'Oregon State Beavers': 'Oregon St.', 'Washington State Cougars': 'Washington St.',
};

function normalizedName(name = '') { return String(name).trim().replace(/\s+/g, ' '); }

export function getTeamAbbreviation(team) {
  const name = normalizedName(team?.name);
  if (teamIdentity[team?.id]) return teamIdentity[team.id].label;
  if (collegeAbbreviations[name]) return collegeAbbreviations[name];
  const providerAbbr = normalizedName(team?.abbreviation);
  if (providerAbbr && providerAbbr.length <= 5 && providerAbbr !== name) return providerAbbr.toUpperCase();
  const words = name.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').filter(Boolean);
  if (!words.length) return 'TBD';
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
  return words.map((word) => word[0]).join('').slice(0, 4).toUpperCase();
}

export function getDisplayTeamName(team) { const name = normalizedName(team?.name) || 'TBD'; return collegeShortNames[name] || name; }

function getLocalLogoPath(team) {
  if (favoriteLogoPaths[team?.id]) return favoriteLogoPaths[team.id];
  const name = normalizedName(team?.name);
  if (localNameLogoPaths[name]) return localNameLogoPaths[name];
  const directory = leagueLogoDirectories[team?.leagueId];
  if (directory && team?.id) return `/team-logos/${directory}/${team.id}.png`;
  return null;
}

function getRemoteLogoPath(team) {
  const logo = team?.logo || team?.logoUrl || team?.logos?.[0]?.href;
  return typeof logo === 'string' && logo.startsWith('http') ? logo : null;
}

export function TeamMark({ team, size = 'medium' }) {
  const identity = teamIdentity[team?.id];
  const color = team?.color || team?.primaryColor || team?.teamColor || identity?.color || '#64748b';
  const label = getTeamAbbreviation(team);
  const localLogoPath = getLocalLogoPath(team);
  const remoteLogoPath = getRemoteLogoPath(team);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => { setImageFailed(false); }, [localLogoPath, remoteLogoPath]);
  const logoPath = localLogoPath || remoteLogoPath;
  const showLogo = Boolean(logoPath) && !imageFailed;

  return (
    <span className={`team-mark ${size} ${showLogo ? 'has-logo' : ''}`} style={{ '--team-color': color }} aria-label={`${team?.name || 'Team'} ${showLogo ? 'logo' : 'abbreviation'}`}>
      {showLogo ? <img src={logoPath} alt="" aria-hidden="true" loading="lazy" decoding="async" onError={() => setImageFailed(true)} /> : <span>{label}</span>}
    </span>
  );
}
