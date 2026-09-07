import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const logos = {
  'sac-kings': 'https://a.espncdn.com/i/teamlogos/nba/500/sac.png',
  'oregon-ducks': 'https://a.espncdn.com/i/teamlogos/ncaa/500/2483.png',
  'real-madrid': 'https://a.espncdn.com/i/teamlogos/soccer/500/86.png',
  tottenham: 'https://a.espncdn.com/i/teamlogos/soccer/500/367.png',
  'blue-jays': 'https://a.espncdn.com/i/teamlogos/mlb/500/14.png',
  oilers: 'https://a.espncdn.com/i/teamlogos/nhl/500/25.png',
};

const outputDir = path.resolve('public/team-logos');
await mkdir(outputDir, { recursive: true });

const failures = [];

for (const [teamId, url] of Object.entries(logos)) {
  const outputPath = path.join(outputDir, `${teamId}.png`);
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length) throw new Error('empty image');
    await writeFile(outputPath, buffer);
    console.log(`Saved local favorite logo: ${teamId}`);
  } catch (error) {
    failures.push(`${teamId}: ${error.message}`);
  }
}

if (failures.length) {
  console.error('Favorite logo download failed. Refusing to build without local favorite assets.');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
