import { leagues } from '../leagues.js';
import { getGameScoreSnapshot } from '../game-score.js';
import { scoreGameV2 } from '../scoring/index-v2.js';

const COMPONENT_ORDER = ['competitive', 'teamQuality', 'stakes', 'narrative', 'form', 'personal'];
const COMPONENT_CONTRIBUTION_MAX = {
  competitive: 30,
  teamQuality: 20,
  stakes: 20,
  narrative: 15,
  form: 10,
  personal: 5,
};

function teamView(team = {}, leagueId = '') {
  return {
    id: String(team.id ?? ''),
    name: String(team.name ?? 'TBD'),
    abbreviation: String(team.abbreviation ?? ''),
    leagueId: team.leagueId || leagueId || null,
    ranking: Number.isFinite(Number(team.ranking)) ? Number(team.ranking) : null,
    logoUrl: team.logoUrl ?? null,
    primaryColor: team.primaryColor ?? team.color ?? null,
  };
}

function statusLabel(status, startTime) {
  if (status === 'live') return 'LIVE';
  if (status === 'final') return 'FINAL';
  if (status === 'postponed') return 'POSTPONED';
  if (status === 'cancelled') return 'CANCELLED';
  return new Date(startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function tierId(label) {
  return String(label ?? 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function componentView(id, component, fallbackMax = 0) {
  const contribution = Number(component?.contribution ?? 0);
  const contributionMax = COMPONENT_CONTRIBUTION_MAX[id] ?? 0;
  return {
    score: Number(component?.score ?? 0),
    max: Number(component?.max ?? fallbackMax),
    contribution,
    contributionMax,
    contributionPercent: contributionMax > 0
      ? Math.max(0, Math.min(100, Math.round((contribution / contributionMax) * 100)))
      : 0,
    confidence: Number(component?.confidence ?? 0),
    reasons: Array.isArray(component?.reasons) ? component.reasons.filter(Boolean) : [],
  };
}

function buildExplanation(scoring) {
  const components = scoring?.breakdown ?? {};
  const ranked = COMPONENT_ORDER
    .map((id) => ({ id, contribution: Number(components[id]?.contribution ?? 0), reasons: components[id]?.reasons ?? [] }))
    .sort((a, b) => b.contribution - a.contribution);

  const primary = ranked.find((item) => item.reasons.length > 0) ?? ranked[0];
  const secondary = ranked.find((item) => item.id !== primary?.id && item.reasons.length > 0);

  return {
    primary: primary?.reasons?.[0] ?? null,
    secondary: secondary?.reasons?.[0] ?? null,
    summary: [primary?.reasons?.[0], secondary?.reasons?.[0]].filter(Boolean).join(' · ') || null,
    dominantComponent: primary?.id ?? null,
  };
}

function scoreboardFor(game) {
  const away = game?.awayScore ?? game?.awayTeam?.score;
  const home = game?.homeScore ?? game?.homeTeam?.score;
  return {
    away: away == null ? null : Number(away),
    home: home == null ? null : Number(home),
  };
}

export function toGameViewModel(game, scoring = scoreGameV2(game)) {
  const league = leagues.find((item) => item.id === game.leagueId);
  const liveSnapshot = getGameScoreSnapshot(game);
  const components = scoring.breakdown ?? {};
  const startTime = game.startTime;
  const scoreboard = scoreboardFor(game);

  return {
    identity: {
      gameId: String(game.id),
      providerGameId: game.providerGameId ?? null,
    },

    schedule: {
      startTime,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      displayTime: new Date(startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      displayDate: new Date(startTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
    },

    league: {
      id: String(game.leagueId),
      name: league?.name ?? String(game.leagueId).toUpperCase(),
      abbreviation: league?.shortName ?? String(game.leagueId).toUpperCase(),
      sport: league?.sport ?? null,
    },

    teams: {
      away: teamView(game.awayTeam, game.leagueId),
      home: teamView(game.homeTeam, game.leagueId),
    },

    status: {
      state: game.status,
      label: statusLabel(game.status, startTime),
      period: game.period ?? null,
      clock: game.clock ?? null,
    },

    details: {
      venue: game.venue ?? null,
      network: game.network ?? null,
    },

    v2: {
      total: Number(scoring.total ?? 0),
      tier: {
        id: tierId(scoring.tier),
        label: scoring.tier ?? 'Unranked',
      },
      confidence: Number(scoring.confidence ?? 0),
      components: {
        competitive: componentView('competitive', components.competitive, 25),
        teamQuality: componentView('teamQuality', components.teamQuality, 20),
        stakes: componentView('stakes', components.stakes, 20),
        narrative: componentView('narrative', components.narrative, 15),
        form: componentView('form', components.form, 10),
        personal: {
          ...componentView('personal', components.personal, 15),
          uiContribution: Number(components.personal?.uiContribution ?? components.personal?.contribution ?? 0),
        },
      },
    },

    explanation: buildExplanation(scoring),

    live: {
      available: game.status === 'live' || game.status === 'final',
      score: liveSnapshot.score,
      level: liveSnapshot.level,
      trend: null,
      homeScore: scoreboard.home,
      awayScore: scoreboard.away,
      events: [],
      reasons: liveSnapshot.reasons,
    },
  };
}

export function toGameViewModels(games = []) {
  return games.map((game) => toGameViewModel(game));
}
