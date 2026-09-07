import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const leagueSources = {
  nfl: { sport: 'football', league: 'nfl' },
  nba: { sport: 'basketball', league: 'nba' },
  mlb: { sport: 'baseball', league: 'mlb' },
};

const favoriteLogos = {
  'sac-kings': { league: 'nba', externalId: '23' },
  'oregon-ducks': { url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/2483.png' },
  'real-madrid': { url: 'https://a.espncdn.com/i/teamlogos/soccer/500/86.png' },
  tottenham: { url: 'https://a.espncdn.com/i/teamlogos/soccer/500/367.png' },
  'blue-jays': { league: 'mlb', externalId: '14' },
  dodgers: { league: 'mlb', externalId: '119' },
  oilers: { url: 'https://a.espncdn.com/i/teamlogos/nhl/500/25.png' },
  vikings: { league: 'nfl', externalId: '16' },
};

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports';
const outputDir = path.resolve('public/team-logos');

await mkdir(outputDir, { recursive: true });

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.json();
}

async function saveLogo(url, outputPath) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) throw new Error('empty image');
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, buffer);
}

const failures = [];

// Download every NFL, NBA, and MLB team logo for broad My Games coverage.
for (const [leagueId, source] of Object.entries(leagueSources)) {
  try {
    const payload = await fetchJson(`${ESPN_BASE}/${source.sport}/${source.league}/teams?limit=100`);
    const teams = payload?.sports?.[0]?.leagues?.[0]?.teams?.map((entry) => entry.team).filter(Boolean) || [];
    if (!teams.length) throw new Error('no teams returned');

    for (const team of teams) {
      const logoUrl = team.logos?.[0]?.href || team.logo;
      if (!logoUrl || !team.id) continue;
      try {
        await saveLogo(logoUrl, path.join(outputDir, leagueId, `${team.id}.png`));
        console.log(`Saved local ${leagueId} logo: ${team.id}`);
      } catch (error) {
        failures.push(`${leagueId}/${team.id}: ${error.message}`);
      }
    }
  } catch (error) {
    failures.push(`${leagueId}: ${error.message}`);
  }
}

// Favorite teams outside NFL/NBA/MLB must also remain local canonical assets.
for (const [teamId, favorite] of Object.entries(favoriteLogos)) {
  try {
    let logoUrl = favorite.url;
    if (!logoUrl) {
      const source = leagueSources[favorite.league];
      const payload = await fetchJson(`${ESPN_BASE}/${source.sport}/${source.league}/teams/${favorite.externalId}`);
      const team = payload?.team;
      logoUrl = team?.logos?.[0]?.href || team?.logo;
    }
    if (!logoUrl) throw new Error('no logo returned');
    await saveLogo(logoUrl, path.join(outputDir, `${teamId}.png`));
    console.log(`Saved local favorite logo: ${teamId}`);
  } catch (error) {
    failures.push(`${teamId}: ${error.message}`);
  }
}

if (failures.length) {
  console.error('Local logo download failed. Refusing to build with missing required logo assets.');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
