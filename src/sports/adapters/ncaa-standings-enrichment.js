import { fetchEspnStandings } from './espn-standings.js';

function cleanName(name = '') {
  return String(name).replace(/\s+/g, ' ').trim().toLowerCase();
}

export function enrichNcaaStandings(games, standings) {
  if (!Array.isArray(standings) || standings.length === 0) return games;

  const byProviderId = new Map();
  const byName = new Map();

  for (const entry of standings) {
    if (entry?.providerId != null) byProviderId.set(String(entry.providerId), entry);
    if (entry?.name) byName.set(cleanName(entry.name), entry);
  }

  const enrichTeam = (team) => {
    if (!team) return team;

    const context = byProviderId.get(String(team.providerId)) || byName.get(cleanName(team.name));
    if (!context) return team;

    return {
      ...team,
      wins: context.wins ?? team.wins,
      losses: context.losses ?? team.losses,
      ties: context.ties ?? team.ties,
      gamesPlayed: context.gamesPlayed ?? team.gamesPlayed,
      winPercentage: context.winPercentage ?? team.winPercentage,
      ranking: context.ranking ?? team.ranking,
      leagueRank: context.leagueRank ?? team.leagueRank,
      conferenceRank: context.conferenceRank ?? team.conferenceRank,
      conference: context.conference ?? team.conference,
      playoffStatus: context.playoffStatus ?? team.playoffStatus,
      standingsSource: 'ESPN standings',
    };
  };

  return games.map((game) => game.leagueId === 'ncaa-football'
    ? { ...game, homeTeam: enrichTeam(game.homeTeam), awayTeam: enrichTeam(game.awayTeam) }
    : game);
}

export async function enrichNcaaLeagueGames(games) {
  if (!games.some((game) => game.leagueId === 'ncaa-football')) return games;

  const years = [...new Set(
    games
      .filter((game) => game.leagueId === 'ncaa-football')
      .map((game) => new Date(game.startTime).getFullYear())
      .filter(Number.isFinite),
  )];

  try {
    const standingsByYear = new Map();
    for (const year of years) {
      standingsByYear.set(year, await fetchEspnStandings('ncaa-football', year));
    }

    return games.map((game) => {
      if (game.leagueId !== 'ncaa-football') return game;
      const year = new Date(game.startTime).getFullYear();
      return enrichNcaaStandings([game], standingsByYear.get(year) || [])[0];
    });
  } catch {
    return games;
  }
}
