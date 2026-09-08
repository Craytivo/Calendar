import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const leagueSources={
 nfl:{sport:'football',league:'nfl'},nba:{sport:'basketball',league:'nba'},'ncaa-football':{sport:'football',league:'college-football'},mlb:{sport:'baseball',league:'mlb'},nhl:{sport:'hockey',league:'nhl'},epl:{sport:'soccer',league:'eng.1'},laliga:{sport:'soccer',league:'esp.1'},'ligue-1':{sport:'soccer',league:'fra.1'},'serie-a':{sport:'soccer',league:'ita.1'},ucl:{sport:'soccer',league:'uefa.champions'}};
const configuredLogos={
 'sac-kings':{league:'nba',externalId:'23'},'oregon-ducks':{url:'https://a.espncdn.com/i/teamlogos/ncaa/500/2483.png'},'kansas-state-wildcats':{league:'ncaa-football',externalId:'2306'},'real-madrid':{url:'https://a.espncdn.com/i/teamlogos/soccer/500/86.png'},tottenham:{url:'https://a.espncdn.com/i/teamlogos/soccer/500/367.png'},'blue-jays':{league:'mlb',externalId:'14'},dodgers:{url:'https://a.espncdn.com/i/teamlogos/mlb/500/lad.png'},oilers:{url:'https://a.espncdn.com/i/teamlogos/nhl/500/25.png'},vikings:{league:'nfl',externalId:'16'},'inter-milan':{url:'https://a.espncdn.com/i/teamlogos/soccer/500/110.png'},'washington-state-cougars':{league:'ncaa-football',externalId:'265'}};
const ESPN_BASE='https://site.api.espn.com/apis/site/v2/sports';
const ESPN_FALLBACK_BASE='https://site.web.api.espn.com/apis/site/v2/sports';
const outputDir=path.resolve('public/team-logos');
await mkdir(outputDir,{recursive:true});
const fallbackUrlFor=(url)=>url.replace(ESPN_BASE,ESPN_FALLBACK_BASE);
async function fetchJson(url){let response;try{response=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(8000)});if(response.ok)return response.json();}catch{}response=await fetch(fallbackUrlFor(url),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(8000)});if(!response.ok)throw new Error(`HTTP ${response.status} for ${url}`);return response.json();}
async function saveLogo(url,outputPath){const response=await fetch(url,{signal:AbortSignal.timeout(8000)});if(!response.ok)throw new Error(`HTTP ${response.status}`);const buffer=Buffer.from(await response.arrayBuffer());if(!buffer.length)throw new Error('empty image');await mkdir(path.dirname(outputPath),{recursive:true});await writeFile(outputPath,buffer);}
async function fileExists(filePath){try{await access(filePath);return true;}catch{return false;}}
const failures=[];
for(const [leagueId,source] of Object.entries(leagueSources)){try{const payload=await fetchJson(`${ESPN_BASE}/${source.sport}/${source.league}/teams?limit=100`);const teams=payload?.sports?.[0]?.leagues?.[0]?.teams?.map((entry)=>entry.team).filter(Boolean)||[];if(!teams.length)throw new Error('no teams returned');for(const team of teams){const logoUrl=team.logos?.[0]?.href||team.logo;if(!logoUrl||!team.id)continue;const outputPath=path.join(outputDir,leagueId,`${team.id}.png`);if(await fileExists(outputPath))continue;try{await saveLogo(logoUrl,outputPath);console.log(`Cached ${leagueId}/${team.id}`);}catch(error){failures.push(`${leagueId}/${team.id}: ${error.message}`);}}}catch(error){failures.push(`${leagueId}: ${error.message}`);}}
for(const [teamId,config] of Object.entries(configuredLogos)){const outputPath=path.join(outputDir,`${teamId}.png`);if(await fileExists(outputPath))continue;try{let logoUrl=config.url;if(!logoUrl){const source=leagueSources[config.league];const payload=await fetchJson(`${ESPN_BASE}/${source.sport}/${source.league}/teams/${config.externalId}`);const team=payload?.team;logoUrl=team?.logos?.[0]?.href||team?.logo;}if(!logoUrl)throw new Error('no logo returned');await saveLogo(logoUrl,outputPath);console.log(`Cached configured logo ${teamId}`);}catch(error){failures.push(`${teamId}: ${error.message}`);}}
if(failures.length){console.error('Logo sync failed for:');failures.forEach((failure)=>console.error(` - ${failure}`));process.exit(1);}
console.log('Logo library sync complete. Existing assets were preserved.');
