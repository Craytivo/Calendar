const ESPN_CORE_BASE = 'https://sports.core.api.espn.com/v2/sports';
const ESPN_SITE_BASE = 'https://site.api.espn.com/apis/site/v2/sports';
const REQUEST_TIMEOUT_MS = 8000;

function finite(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function firstFinite(...values) {
  for (const value of values) {
    const parsed = finite(value);
    if (parsed !== undefined) return parsed;
  }
  return undefined;
}

function providerOf(raw) {
  return raw?.provider || raw?.book || raw?.sportsbook || {};
}

function providerPriority(raw) {
  return firstFinite(raw?.provider?.priority, raw?.priority, 9999);
}

function extractItems(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.odds)) return raw.odds;
  if (Array.isArray(raw?.data)) return raw.data;
  return [];
}

function extractMoneyline(teamOdds) {
  return firstFinite(teamOdds?.moneyLine, teamOdds?.moneyline, teamOdds?.money_line, teamOdds?.ml);
}

function normalizeOne(raw, homeTeamId, awayTeamId) {
  const homeTeamOdds = raw?.homeTeamOdds || raw?.homeOdds || raw?.home || {};
  const awayTeamOdds = raw?.awayTeamOdds || raw?.awayOdds || raw?.away || {};
  const provider = providerOf(raw);
  const spread = firstFinite(raw?.spread, raw?.pointSpread, raw?.homeSpread, raw?.details?.spread);
  const total = firstFinite(raw?.overUnder, raw?.overunder, raw?.total, raw?.totals?.value);
  const homeMoneyline = extractMoneyline(homeTeamOdds) ?? firstFinite(raw?.homeMoneyLine, raw?.homeMoneyline);
  const awayMoneyline = extractMoneyline(awayTeamOdds) ?? firstFinite(raw?.awayMoneyLine, raw?.awayMoneyline);
  const drawMoneyline = firstFinite(raw?.drawMoneyLine, raw?.drawMoneyline, raw?.drawOdds?.moneyLine, raw?.draw?.moneyLine);
  const overOdds = firstFinite(raw?.overOdds, raw?.over?.moneyLine, raw?.over?.odds);
  const underOdds = firstFinite(raw?.underOdds, raw?.under?.moneyLine, raw?.under?.odds);
  const format = raw?.format || raw?.oddsFormat || raw?.moneylineFormat;

  if ([spread, total, homeMoneyline, awayMoneyline, drawMoneyline].every((value) => value === undefined)) return null;

  const moneyline = {};
  if (homeMoneyline !== undefined) moneyline.home = homeMoneyline;
  if (awayMoneyline !== undefined) moneyline.away = awayMoneyline;
  if (drawMoneyline !== undefined) moneyline.draw = drawMoneyline;

  return {
    provider: {
      id: String(provider?.id ?? '').trim() || undefined,
      name: String(provider?.name ?? provider?.displayName ?? provider?.abbreviation ?? '').trim() || undefined,
      priority: providerPriority(raw),
    },
    ...(spread !== undefined ? { spread } : {}),
    ...(total !== undefined ? { total } : {}),
    ...(Object.keys(moneyline).length ? { moneyline } : {}),
    ...((overOdds !== undefined || underOdds !== undefined) ? { overOdds, underOdds } : {}),
    ...(format ? { format } : {}),
    ...(homeTeamId ? { homeTeamId } : {}),
    ...(awayTeamId ? { awayTeamId } : {}),
    details: raw?.details,
  };
}

export function normalizeEspnOdds(rawOdds, { homeTeamId, awayTeamId } = {}) {
  const items = extractItems(rawOdds)
    .map((item) => normalizeOne(item, homeTeamId, awayTeamId))
    .filter(Boolean)
    .sort((a, b) => (a.provider.priority ?? 9999) - (b.provider.priority ?? 9999));

  if (!items.length) return undefined;
  const selected = items[0];
  return {
    ...selected,
    providers: items.map((item) => item.provider),
  };
}

async function requestJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
    if (!response.ok) throw new Error(`ESPN odds returned ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function coreUrl(config, eventId, competitionId) {
  return `${ESPN_CORE_BASE}/${config.sport}/leagues/${config.league}/events/${eventId}/competitions/${competitionId}/odds`;
}

function siteUrl(config, eventId, competitionId) {
  return `${ESPN_SITE_BASE}/${config.sport}/${config.league}/summary?event=${eventId}&competition=${competitionId}`;
}

export async function fetchEspnEventOdds({ sport, league, eventId, competitionId, homeTeamId, awayTeamId }) {
  if (!sport || !league || !eventId || !competitionId) return undefined;
  try {
    const payload = await requestJson(coreUrl({ sport, league }, eventId, competitionId));
    return normalizeEspnOdds(payload, { homeTeamId, awayTeamId });
  } catch {
    try {
      const payload = await requestJson(siteUrl({ sport, league }, eventId, competitionId));
      return normalizeEspnOdds(payload?.odds, { homeTeamId, awayTeamId });
    } catch {
      return undefined;
    }
  }
}
