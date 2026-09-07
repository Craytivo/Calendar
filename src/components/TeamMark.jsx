import React, { useEffect, useState } from 'react';

const teamIdentity = {
  'sac-kings': { label: 'SAC', color: '#5A2D81' },
  'oregon-ducks': { label: 'ORE', color: '#0A7A3B' },
  'real-madrid': { label: 'RMA', color: '#1F4E8C' },
  tottenham: { label: 'TOT', color: '#132257' },
  'blue-jays': { label: 'TOR', color: '#134A8E' },
  oilers: { label: 'EDM', color: '#FF4C00' },
};

// Provider-independent fallbacks for the user's favorite teams.
// If a live provider logo is missing or stale, the UI tries this saved logo before
// falling all the way back to the colored abbreviation mark.
const favoriteLogoUrls = {
  'sac-kings': 'https://a.espncdn.com/i/teamlogos/nba/500/sac.png',
  'oregon-ducks': 'https://a.espncdn.com/i/teamlogos/ncaa/500/2483.png',
  'real-madrid': 'https://a.espncdn.com/i/teamlogos/soccer/500/86.png',
  tottenham: 'https://a.espncdn.com/i/teamlogos/soccer/500/367.png',
  'blue-jays': 'https://a.espncdn.com/i/teamlogos/mlb/500/14.png',
  oilers: 'https://a.espncdn.com/i/teamlogos/nhl/500/25.png',
};

const collegeAbbreviations = {
  'Alabama Crimson Tide': 'ALA', 'Arkansas Razorbacks': 'ARK', 'Auburn Tigers': 'AUB',
  'Clemson Tigers': 'CLEM', 'Florida Gators': 'FLA', 'Florida State Seminoles': 'FSU',
  'Georgia Bulldogs': 'UGA', 'Iowa Hawkeyes': 'IOWA', 'LSU Tigers': 'LSU',
  'Miami Hurricanes': 'MIA', 'Michigan Wolverines': 'MICH', 'Mississippi State Bulldogs': 'MSST',
  'Notre Dame Fighting Irish': 'ND', 'Ohio State Buckeyes': 'OSU', 'Oklahoma Sooners': 'OU',
  'Oklahoma State Cowboys': 'OKST', 'Ole Miss Rebels': 'MISS', 'Oregon Ducks': 'ORE',
  'Penn State Nittany Lions': 'PSU', 'South Carolina Gamecocks': 'SC', 'Tennessee Volunteers': 'TENN',
  'Texas Longhorns': 'TEX', 'Texas A&M Aggies': 'TAMU', 'Utah Utes': 'UTAH',
  'Washington Huskies': 'WASH', 'Wisconsin Badgers': 'WIS',
};

const collegeShortNames = {
  'Oklahoma State Cowboys': 'Oklahoma St.', 'Mississippi State Bulldogs': 'Mississippi St.',
  'Florida State Seminoles': 'Florida St.', 'Kansas State Wildcats': 'Kansas St.',
  'Michigan State Spartans': 'Michigan St.', 'Ohio State Buckeyes': 'Ohio State',
  'Penn State Nittany Lions': 'Penn State', 'Arizona State Sun Devils': 'Arizona St.',
  'Iowa State Cyclones': 'Iowa State', 'Boise State Broncos': 'Boise St.',
  'Oregon State Beavers': 'Oregon St.',
};

function normalizedName(name = '') {
  return String(name).trim().replace(/\s+/g, ' ');
}

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

export function getDisplayTeamName(team) {
  const name = normalizedName(team?.name) || 'TBD';
  return collegeShortNames[name] || name;
}

export function TeamMark({ team, size = 'medium' }) {
  const identity = teamIdentity[team?.id];
  const color = team?.color || team?.primaryColor || team?.teamColor || identity?.color || '#64748b';
  const label = getTeamAbbreviation(team);
  const providerLogoUrl = normalizedName(team?.logoUrl);
  const savedLogoUrl = favoriteLogoUrls[team?.id];
  const initialLogoUrl = providerLogoUrl || savedLogoUrl || '';
  const [imageUrl, setImageUrl] = useState(initialLogoUrl);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageUrl(initialLogoUrl);
    setImageFailed(false);
  }, [initialLogoUrl]);

  const showLogo = Boolean(imageUrl) && !imageFailed;

  const handleImageError = () => {
    if (savedLogoUrl && imageUrl !== savedLogoUrl) {
      setImageUrl(savedLogoUrl);
      return;
    }
    setImageFailed(true);
  };

  return (
    <span
      className={`team-mark ${size} ${showLogo ? 'has-logo' : ''}`}
      style={{ '--team-color': color }}
      aria-label={`${team?.name || 'Team'} logo mark`}
    >
      {showLogo ? (
        <img
          src={imageUrl}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          onError={handleImageError}
        />
      ) : (
        <span>{label}</span>
      )}
    </span>
  );
}
