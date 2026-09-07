import { normalizeGames } from './normalizer.js';

const ESPN_COLLEGE_FOOTBALL = 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard';

function dateKey(date) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function normalizeEspnEvent(event) {
  const competition = event.competitions?.[0];
  if (!competition) return null;

  const home = competition.competitors?.find((item) => item.homeAway === 'home');
  const away = competition.competitors?.find((item) => item.homeAway === 'away');
  if (!home || !away) return null;

  const context = (competitor) => ({
    id: competitor.team?.displayName === 'Oregon Ducks' || competitor.team?.shortDisplayName === 'Oregon' ? 'oregon-ducks' : `espn:cfb:${competitor.team?.id}`,
    name: competitor.team?.displayName ?? competitor.team?.shortDisplayName ?? 'TBD',
    leagueId: 'ncaa-football',
    ranking: Number(competitor.curatedRank?.current) || undefined,
  });

  const status = event.status?.type?.state === 'in' ? 'live' : event.status?.type?.completed ? 'final' : 'scheduled';
  const eventType = /playoff|championship|bowl/i.test(event.name ?? '') ? 'postseason' : 'regular-season';

  return {
    id: `espn:cfb:${event.id}`,
    leagueId: 'ncaa-football',
    homeTeamId: context(home).id,
    awayTeamId: context(away).id,
    startTime: event.date,
    status,
    eventType,
    round: event.season?.slug,
    competitionId: 'ncaa-football',
    homeTeam: context(home),
    awayTeam: context(away),
  };
}

export async function fetchEspnCollegeFootballWindow(now = new Date(), days = 7) {
  const requests = [];
  for (let offset = 0; offset < days; offset += 1) {
    const date = addDays(now, offset);
    requests.push(
      fetch(`${ESPN_COLLEGE_FOOTBALL}?dates=${dateKey(date)}`).then((response) => {
        if (!response.ok) throw new Error(`ESPN returned ${response.status}`);
        return response.json();
      }),
    );
  }

  const payloads = await Promise.all(requests);
  const events = payloads.flatMap((payload) => payload.events ?? []).map(normalizeEspnEvent).filter(Boolean);
  return normalizeGames(events);
}
