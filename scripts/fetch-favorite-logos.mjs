import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const leagueSources = {
  nfl: { sport: 'football', league: 'nfl' },
  nba: { sport: 'basketball', league: 'nba' },
  'ncaa-football': { sport: 'football', league: 'college-football' },
  mlb: { sport: 'baseball', league: 'mlb' },
  epl: { sport: 'soccer', league: 'eng.1' },
  laliga: { sport: 'soccer', league: 'esp.1' },
};

const favoriteLogos = {
  'sac-kings': { league: 'nba', externalId: '23' },
  'oregon-ducks': { url: 'https://a.espncdn.com/i/teamlogos/ncaa/500/2483.png' },
  'kansas-state-wildcats': { league: 'ncaa-football', externalId: '2306' },
  'washington-state-cougars': { league: 'ncaa-football', externalId: '265' },
  'real-madrid': { url: 'https://a.espncdn.com/i/teamlogos/soccer/500/86.png' },
  tottenham: { url: 'https://a.espncdn.com/i/teamlogos/soccer/500/367.png' },
  'blue-jays': { league: 'mlb', externalId: '14' },
  dodgers: { url: 'https://a.espncdn.com/i/teamlogos/mlb/500/lad.png' },
  oilers: { url: 'https://a.espncdn.com/i/teamlogos/nhl/500/25.png' },
  vikings: { league: 'nfl', externalId: '16' },
  'inter-milan': { url: 'https://a.espncdn.com/i/teamlogos/soccer/500/110.png' },
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

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

const failures = [];

for (const [leagueId, source] of Object.entries(leagueSources)) {
  try {
    const payload = await fetchJson(`${ESPN_BASE}/${source.sport}/${source.league}/teams?limit=100`);
    const teams = payload?.sports?.[0]?.leagues?.[0]?.teams?.map((entry) => entry.team).filter(Boolean) || [];
    if (!teams.length) throw new Error('no teams returned');

    for (const team of teams) {
      const logoUrl = team.logos?.[0]?.href || team.logo;
      if (!logoUrl || !team.id) continue;
      const outputPath = path.join(outputDir, leagueId, `${team.id}.png`);
      if (await fileExists(outputPath)) continue;
      try {
        await saveLogo(logoUrl, outputPath);
        console.log(`Saved local ${leagueId} logo: ${team.id}`);
      } catch (error) {
        failures.push(`${leagueId}/${team.id}: ${error.message}`);
      }
    }
  } catch (error) {
    const leagueDir = path.join(outputDir, leagueId);
    if (!(await fileExists(leagueDir))) failures.push(`${leagueId}: ${error.message}`);
  }
}

for (const [teamId, favorite] of Object.entries(favoriteLogos)) {
  const outputPath = path.join(outputDir, `${teamId}.png`);
  if (await fileExists(outputPath)) continue;

  try {
    let logoUrl = favorite.url;
    if (!logoUrl) {
      const source = leagueSources[favorite.league];
      const payload = await fetchJson(`${ESPN_BASE}/${source.sport}/${source.league}/teams/${favorite.externalId}`);
      const team = payload?.team;
      logoUrl = team?.logos?.[0]?.href || team?.logo;
    }
    if (!logoUrl) throw new Error('no logo returned');
    await saveLogo(logoUrl, outputPath);
    console.log(`Saved local favorite logo: ${teamId}`);
  } catch (error) {
    failures.push(`${teamId}: ${error.message}`);
  }
}

if (failures.length) {
  console.error('Local logo download failed. Missing logo assets:');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
