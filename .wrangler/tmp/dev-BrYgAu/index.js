var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/sports/adapters/normalizer.js
var VALID_EVENT_TYPES = /* @__PURE__ */ new Set(["regular-season", "postseason", "playoff", "championship", "final", "elimination", "knockout", "tournament", "main-card"]);
function firstDefined(...values) {
  return values.find((value) => value !== void 0 && value !== null && value !== "");
}
__name(firstDefined, "firstDefined");
function toNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : void 0;
  }
  return void 0;
}
__name(toNumber, "toNumber");
function toBoolean(value) {
  if (value === true || value === false) return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return void 0;
}
__name(toBoolean, "toBoolean");
function normalizeStatus(value) {
  const status = String(value ?? "").toLowerCase();
  if (["live", "in_progress", "in-progress"].includes(status)) return "live";
  if (["final", "completed", "complete"].includes(status)) return "final";
  if (["postponed", "delayed"].includes(status)) return "postponed";
  if (["cancelled", "canceled"].includes(status)) return "cancelled";
  return "scheduled";
}
__name(normalizeStatus, "normalizeStatus");
function normalizeEventType(value, fallback = "regular-season") {
  const type = String(value ?? fallback).toLowerCase();
  return VALID_EVENT_TYPES.has(type) ? type : fallback;
}
__name(normalizeEventType, "normalizeEventType");
function normalizeTeam(raw = {}) {
  return {
    id: String(firstDefined(raw.id, raw.teamId, raw.uid, raw.slug, raw.name) ?? "").trim(),
    name: String(firstDefined(raw.name, raw.displayName, raw.shortName, raw.abbreviation) ?? "").trim(),
    abbreviation: String(firstDefined(raw.abbreviation, raw.abbr, raw.shortName, raw.name) ?? "").trim(),
    leagueId: String(firstDefined(raw.leagueId, raw.league, raw.sport) ?? "").trim(),
    favorite: raw.favorite === true,
    favoriteTier: raw.favoriteTier,
    ...firstDefined(raw.logoUrl, raw.logo, raw.logoURL, raw.badge) ? { logoUrl: String(firstDefined(raw.logoUrl, raw.logo, raw.logoURL, raw.badge)).trim() } : {},
    ...firstDefined(raw.primaryColor, raw.color, raw.teamColor) ? { primaryColor: String(firstDefined(raw.primaryColor, raw.color, raw.teamColor)).trim() } : {}
  };
}
__name(normalizeTeam, "normalizeTeam");
function normalizeTeamContext(raw = {}) {
  const team = raw.team ?? raw;
  const context = normalizeTeam(team);
  const winPercentage = toNumber(firstDefined(raw.winPercentage, raw.winningPercentage, raw.winPct, team.winPercentage, team.winningPercentage, team.winPct));
  const gamesPlayed = toNumber(firstDefined(raw.gamesPlayed, raw.games, team.gamesPlayed, team.games));
  const conferenceRank = toNumber(firstDefined(raw.conferenceRank, raw.conferencePosition, team.conferenceRank, team.conferencePosition));
  const leagueRank = toNumber(firstDefined(raw.leagueRank, raw.standing, raw.position, team.leagueRank, team.standing, team.position));
  const ranking = toNumber(firstDefined(raw.ranking, raw.apRanking, raw.rank, team.ranking, team.apRanking, team.rank));
  const wins = toNumber(firstDefined(raw.wins, team.wins));
  const losses = toNumber(firstDefined(raw.losses, team.losses));
  const ties = toNumber(firstDefined(raw.ties, team.ties));
  const points = toNumber(firstDefined(raw.points, raw.leaguePoints, team.points, team.leaguePoints));
  const goalDifference = toNumber(firstDefined(raw.goalDifference, raw.goalDiff, team.goalDifference, team.goalDiff));
  return { ...context, ...winPercentage !== void 0 ? { winPercentage } : {}, ...gamesPlayed !== void 0 ? { gamesPlayed } : {}, ...conferenceRank !== void 0 ? { conferenceRank } : {}, ...leagueRank !== void 0 ? { leagueRank } : {}, ...ranking !== void 0 ? { ranking } : {}, ...wins !== void 0 ? { wins } : {}, ...losses !== void 0 ? { losses } : {}, ...ties !== void 0 ? { ties } : {}, ...points !== void 0 ? { points } : {}, ...goalDifference !== void 0 ? { goalDifference } : {} };
}
__name(normalizeTeamContext, "normalizeTeamContext");
function normalizeGame(raw = {}) {
  const startTime = firstDefined(raw.startTime, raw.startDate, raw.date, raw.start);
  const status = normalizeStatus(firstDefined(raw.status, raw.gameStatus, raw.state));
  const eventType = normalizeEventType(firstDefined(raw.eventType, raw.type, raw.phase));
  const homeRaw = firstDefined(raw.homeTeam, raw.home, raw.homeCompetitor);
  const awayRaw = firstDefined(raw.awayTeam, raw.away, raw.awayCompetitor);
  const homeTeam = homeRaw ? normalizeTeamContext(homeRaw) : void 0;
  const awayTeam = awayRaw ? normalizeTeamContext(awayRaw) : void 0;
  const game = { id: String(firstDefined(raw.id, raw.gameId, raw.eventId, raw.uid) ?? "").trim(), leagueId: String(firstDefined(raw.leagueId, raw.league, raw.competitionId, raw.sport) ?? "").trim(), homeTeamId: firstDefined(raw.homeTeamId, raw.homeId, homeTeam?.id), awayTeamId: firstDefined(raw.awayTeamId, raw.awayId, awayTeam?.id), startTime: startTime ? new Date(startTime).toISOString() : "", venue: firstDefined(raw.venue, raw.venueName, raw.location), status, eventType, round: firstDefined(raw.round, raw.roundName), competitionId: firstDefined(raw.competitionId, raw.competition, raw.leagueId), competitionPhase: firstDefined(raw.competitionPhase, raw.phase), uclStage: raw.uclStage, tieId: raw.tieId, isTwoLegTie: toBoolean(raw.isTwoLegTie), leg: toNumber(raw.leg), isFirstLeg: toBoolean(raw.isFirstLeg), isSecondLeg: toBoolean(raw.isSecondLeg), isDivisional: toBoolean(raw.isDivisional), isElimination: toBoolean(raw.isElimination), isMajorEvent: toBoolean(raw.isMajorEvent), isRivalry: toBoolean(raw.isRivalry), hasPlayoffImplications: toBoolean(raw.hasPlayoffImplications), hasSeedingImplications: toBoolean(raw.hasSeedingImplications), hasQualificationImplications: toBoolean(raw.hasQualificationImplications), hasTitleOrUclQualificationImplications: toBoolean(raw.hasTitleOrUclQualificationImplications), homeTeam, awayTeam };
  return Object.fromEntries(Object.entries(game).filter(([, value]) => value !== void 0 && value !== ""));
}
__name(normalizeGame, "normalizeGame");
function normalizeGames(rawGames = []) {
  return rawGames.map(normalizeGame).filter((game) => game.id && game.leagueId && game.startTime);
}
__name(normalizeGames, "normalizeGames");

// src/sports/adapters/soccer-context.js
var DOMESTIC_RACE_CONFIG = {
  epl: { uclCutoff: 5, titleBand: 3 },
  laliga: { uclCutoff: 3, titleBand: 3 }
};
function hasMeaningfulDomesticRace(game) {
  const config = DOMESTIC_RACE_CONFIG[game.leagueId];
  if (!config || !game.homeTeam || !game.awayTeam) return false;
  const teams = [game.homeTeam, game.awayTeam];
  const played = teams.map((team) => team.gamesPlayed).filter((value) => typeof value === "number");
  if (played.length < 2 || Math.min(...played) < 10) return false;
  const ranks = teams.map((team) => team.leagueRank);
  if (ranks.some((rank) => typeof rank !== "number")) return false;
  const [homeRank, awayRank] = ranks;
  const bothInQualificationRace = homeRank <= config.uclCutoff + 2 && awayRank <= config.uclCutoff + 2;
  const bothInTitleRace = homeRank <= config.titleBand && awayRank <= config.titleBand;
  return bothInQualificationRace || bothInTitleRace;
}
__name(hasMeaningfulDomesticRace, "hasMeaningfulDomesticRace");
function applyDomesticSoccerRaceContext(games) {
  return games.map((game) => {
    if (!["epl", "laliga"].includes(game.leagueId)) return game;
    return hasMeaningfulDomesticRace(game) ? { ...game, hasTitleOrUclQualificationImplications: true } : game;
  });
}
__name(applyDomesticSoccerRaceContext, "applyDomesticSoccerRaceContext");

// src/sports/adapters/thesportsdb.js
var THESPORTSDB_LEAGUES = [
  { id: "nfl", providerId: "4391", name: "NFL" },
  { id: "nba", providerId: "4387", name: "NBA" },
  { id: "ncaa-football", providerId: "4479", name: "NCAA Football" },
  { id: "ucl", providerId: "4480", name: "UEFA Champions League" },
  { id: "laliga", providerId: "4335", name: "Spanish La Liga" },
  { id: "epl", providerId: "4328", name: "English Premier League" },
  { id: "mlb", providerId: "4424", name: "MLB" },
  { id: "nhl", providerId: "4380", name: "NHL" },
  { id: "ufc", providerId: "4443", name: "UFC" }
];

// src/sports/adapters/espn-schedules.js
var ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";
var ESPN_HEADERS = {
  Accept: "application/json",
  "User-Agent": "Craytivo Sports Calendar/1.0"
};
var LEAGUE_CONFIG = {
  nfl: { sport: "football", league: "nfl" },
  nba: { sport: "basketball", league: "nba" },
  "ncaa-football": { sport: "football", league: "college-football" },
  mlb: { sport: "baseball", league: "mlb" },
  nhl: { sport: "hockey", league: "nhl" },
  ufc: { sport: "mma", league: "ufc" },
  epl: { sport: "soccer", league: "eng.1" },
  "epl-cup": { sport: "soccer", league: "eng.league_cup" },
  laliga: { sport: "soccer", league: "esp.1" },
  ucl: { sport: "soccer", league: "uefa.champions" }
};
var FAVORITE_TEAMS = {
  "sac-kings": { name: "Sacramento Kings", sport: "basketball", league: "nba", externalId: "23" },
  "oregon-ducks": { name: "Oregon Ducks", sport: "football", league: "college-football", externalId: "2483" },
  "real-madrid": { name: "Real Madrid", sport: "soccer", league: "esp.1", externalId: "86" },
  tottenham: { name: "Tottenham Hotspur", sport: "soccer", league: "eng.1", externalId: "367" },
  "blue-jays": { name: "Toronto Blue Jays", sport: "baseball", league: "mlb", externalId: "14" },
  dodgers: { name: "Los Angeles Dodgers", sport: "baseball", league: "mlb", externalId: "119" },
  oilers: { name: "Edmonton Oilers", sport: "hockey", league: "nhl", externalId: "25" },
  vikings: { name: "Minnesota Vikings", sport: "football", league: "nfl", externalId: "16" }
};
var FAVORITE_TEAM_IDS = {
  "Sacramento Kings": "sac-kings",
  "Oregon Ducks": "oregon-ducks",
  Oregon: "oregon-ducks",
  "Real Madrid": "real-madrid",
  Tottenham: "tottenham",
  "Tottenham Hotspur": "tottenham",
  "Toronto Blue Jays": "blue-jays",
  "Los Angeles Dodgers": "dodgers",
  Dodgers: "dodgers",
  "Edmonton Oilers": "oilers",
  "Minnesota Vikings": "vikings"
};
function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}
__name(addDays, "addDays");
function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}
__name(dateKey, "dateKey");
function cleanName(name = "") {
  return String(name).replace(/\s+/g, " ").trim();
}
__name(cleanName, "cleanName");
function favoriteIdFor(name = "") {
  return FAVORITE_TEAM_IDS[cleanName(name)] || void 0;
}
__name(favoriteIdFor, "favoriteIdFor");
function teamFromCompetitor(competitor, leagueId) {
  const rawName = cleanName(competitor?.team?.displayName || competitor?.team?.name || competitor?.athlete?.displayName || competitor?.displayName);
  const favoriteId = favoriteIdFor(rawName);
  const team = competitor?.team || competitor?.athlete || competitor || {};
  const id = favoriteId || String(team.id || competitor?.id || rawName).trim();
  const abbreviation = cleanName(team.abbreviation || competitor?.abbreviation || rawName).toUpperCase();
  const logoUrl = team.logo || team.logos?.[0]?.href;
  const primaryColor = team.color || team.colors?.primary;
  return {
    id,
    name: rawName,
    abbreviation,
    leagueId,
    ...favoriteId ? { favorite: true } : {},
    ...logoUrl ? { logoUrl } : {},
    ...primaryColor ? { primaryColor } : {}
  };
}
__name(teamFromCompetitor, "teamFromCompetitor");
function eventTypeFor(event) {
  const competition = event?.competitions?.[0];
  const seasonType = String(event?.season?.slug || event?.season?.type?.slug || "").toLowerCase();
  const typeText = [event?.type?.text, event?.type?.name, event?.status?.type?.name, seasonType].join(" ").toLowerCase();
  if (typeText.includes("championship") || typeText.includes("final")) return "championship";
  if (typeText.includes("playoff") || typeText.includes("postseason") || typeText.includes("knockout")) return "playoff";
  if (typeText.includes("preseason")) return "preseason";
  if (competition?.type?.abbreviation === "STD") return "regular-season";
  return "regular-season";
}
__name(eventTypeFor, "eventTypeFor");
function statusFor(event) {
  const status = event?.status?.type;
  if (status?.completed) return "final";
  if (status?.state === "in") return "live";
  if (status?.name === "STATUS_POSTPONED") return "postponed";
  if (status?.name === "STATUS_CANCELED") return "cancelled";
  return "scheduled";
}
__name(statusFor, "statusFor");
function scoreFor(competitor, scores) {
  const raw = scores.get(competitor?.id);
  if (raw == null || raw === "") return void 0;
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : void 0;
}
__name(scoreFor, "scoreFor");
function mapEvent(event, leagueId) {
  const competition = event?.competitions?.[0];
  const competitors = competition?.competitors || [];
  const home = competitors.find((item) => item.homeAway === "home") || competitors[1];
  const away = competitors.find((item) => item.homeAway === "away") || competitors[0];
  if (!home || !away || !event?.date) return null;
  const homeTeam = teamFromCompetitor(home, leagueId);
  const awayTeam = teamFromCompetitor(away, leagueId);
  const scores = new Map(competitors.map((item) => [item.id, item.score]));
  const homeScore = scoreFor(home, scores);
  const awayScore = scoreFor(away, scores);
  const isCup = leagueId === "epl-cup";
  const normalizedLeagueId = isCup ? "epl" : leagueId;
  return {
    id: `espn:${leagueId}:${event.id}`,
    leagueId: normalizedLeagueId,
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
    startTime: event.date,
    venue: competition?.venue?.fullName || competition?.venue?.address?.city,
    status: statusFor(event),
    eventType: eventTypeFor(event),
    round: event?.week?.text || event?.season?.slug,
    competitionId: competition?.id || event?.id,
    competitionPhase: event?.season?.type?.slug,
    isMajorEvent: Boolean(event?.league?.isTournament || event?.isPostseason || isCup),
    isElimination: Boolean(event?.isElimination),
    ...isCup ? { competitionName: "Carabao Cup" } : {},
    ...homeScore !== void 0 ? { homeScore } : {},
    ...awayScore !== void 0 ? { awayScore } : {},
    homeTeam: { ...homeTeam, ...homeScore !== void 0 ? { score: homeScore } : {} },
    awayTeam: { ...awayTeam, ...awayScore !== void 0 ? { score: awayScore } : {} }
  };
}
__name(mapEvent, "mapEvent");
function fallbackUrlFor(url) {
  return url.replace("https://site.api.espn.com", "https://site.web.api.espn.com");
}
__name(fallbackUrlFor, "fallbackUrlFor");
function shouldTryFallback(error) {
  return error?.status === 403 || error?.name === "TypeError" || /Network connection lost|fetch failed/i.test(error?.message || "");
}
__name(shouldTryFallback, "shouldTryFallback");
async function requestJson(url) {
  const response = await fetch(url, { headers: ESPN_HEADERS });
  if (!response.ok) {
    const error = new Error(`ESPN returned ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}
__name(requestJson, "requestJson");
async function fetchJson(url) {
  try {
    return await requestJson(url);
  } catch (primaryError) {
    if (!shouldTryFallback(primaryError)) throw primaryError;
    await new Promise((resolve) => setTimeout(resolve, 150));
    try {
      return await requestJson(fallbackUrlFor(url));
    } catch (fallbackError) {
      const error = new Error(
        `${primaryError.message}; fallback ${fallbackError.message}`
      );
      error.status = fallbackError.status || primaryError.status;
      throw error;
    }
  }
}
__name(fetchJson, "fetchJson");
function normalizeEvents(payload, leagueId) {
  const events = Array.isArray(payload?.events) ? payload.events : [];
  return normalizeGames(events.map((event) => mapEvent(event, leagueId)).filter(Boolean));
}
__name(normalizeEvents, "normalizeEvents");
async function fetchEspnLeagueWindow(leagueId, startDate, days = 7) {
  const config = LEAGUE_CONFIG[leagueId];
  if (!config) throw new Error(`Unsupported ESPN league: ${leagueId}`);
  const endDate = addDays(startDate, days - 1);
  const url = `${ESPN_BASE}/${config.sport}/${config.league}/scoreboard?dates=${dateKey(startDate)}-${dateKey(endDate)}`;
  const payload = await fetchJson(url);
  return normalizeEvents(payload, leagueId);
}
__name(fetchEspnLeagueWindow, "fetchEspnLeagueWindow");
async function fetchEspnTeamWindow(teamId, startDate, days = 7) {
  const favorite = FAVORITE_TEAMS[teamId];
  if (!favorite) throw new Error(`Unsupported favorite team: ${teamId}`);
  const endDate = addDays(startDate, days - 1);
  const url = `${ESPN_BASE}/${favorite.sport}/${favorite.league}/teams/${favorite.externalId}/schedule?dates=${dateKey(startDate)}-${dateKey(endDate)}`;
  const payload = await fetchJson(url);
  const leagueId = favorite.league === "eng.1" ? "epl" : favorite.league === "esp.1" ? "laliga" : Object.keys(LEAGUE_CONFIG).find((key) => LEAGUE_CONFIG[key].sport === favorite.sport && LEAGUE_CONFIG[key].league === favorite.league) || favorite.league;
  return normalizeEvents(payload, leagueId);
}
__name(fetchEspnTeamWindow, "fetchEspnTeamWindow");
function favoriteTeamIds() {
  return Object.keys(FAVORITE_TEAMS);
}
__name(favoriteTeamIds, "favoriteTeamIds");

// src/sports/adapters/espn-standings.js
var ESPN_STANDINGS = {
  nfl: { sport: "football", league: "nfl", seasonType: "2" },
  nba: { sport: "basketball", league: "nba", seasonType: "2" },
  "ncaa-football": { sport: "football", league: "college-football", seasonType: "2" },
  mlb: { sport: "baseball", league: "mlb", seasonType: "2" },
  nhl: { sport: "hockey", league: "nhl", seasonType: "2" }
};
var FAVORITE_TEAM_NAMES = {
  "sacramento kings": "sac-kings",
  oregon: "oregon-ducks",
  "oregon ducks": "oregon-ducks",
  "real madrid": "real-madrid",
  tottenham: "tottenham",
  "tottenham hotspur": "tottenham",
  "toronto blue jays": "blue-jays",
  "edmonton oilers": "oilers"
};
var NFL_DIVISIONS = {
  "buffalo bills": "AFC East",
  "miami dolphins": "AFC East",
  "new england patriots": "AFC East",
  "new york jets": "AFC East",
  "baltimore ravens": "AFC North",
  "cincinnati bengals": "AFC North",
  "cleveland browns": "AFC North",
  "pittsburgh steelers": "AFC North",
  "houston texans": "AFC South",
  "indianapolis colts": "AFC South",
  "jacksonville jaguars": "AFC South",
  "tennessee titans": "AFC South",
  "denver broncos": "AFC West",
  "kansas city chiefs": "AFC West",
  "las vegas raiders": "AFC West",
  "los angeles chargers": "AFC West",
  "dallas cowboys": "NFC East",
  "new york giants": "NFC East",
  "philadelphia eagles": "NFC East",
  "washington commanders": "NFC East",
  "chicago bears": "NFC North",
  "detroit lions": "NFC North",
  "green bay packers": "NFC North",
  "minnesota vikings": "NFC North",
  "atlanta falcons": "NFC South",
  "carolina panthers": "NFC South",
  "new orleans saints": "NFC South",
  "tampa bay buccaneers": "NFC South",
  "arizona cardinals": "NFC West",
  "los angeles rams": "NFC West",
  "san francisco 49ers": "NFC West",
  "seattle seahawks": "NFC West"
};
function clean(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}
__name(clean, "clean");
function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : void 0;
}
__name(number, "number");
function stat(entry, names) {
  const stats = entry.stats ?? [];
  for (const name of names) {
    const item = stats.find((candidate) => clean(candidate.name ?? candidate.shortDisplayName) === clean(name));
    if (item) return item.value ?? item.displayValue;
  }
  return void 0;
}
__name(stat, "stat");
function normalizeEntry(entry, group) {
  const team = entry.team ?? {};
  const name = team.displayName ?? team.shortDisplayName ?? team.name ?? "";
  const wins = number(stat(entry, ["wins", "win"]));
  const losses = number(stat(entry, ["losses", "loss"]));
  const ties = number(stat(entry, ["ties", "tie"])) ?? 0;
  const gamesPlayed = number(stat(entry, ["gamesPlayed", "games"])) ?? (wins !== void 0 && losses !== void 0 ? wins + losses + ties : void 0);
  const winPercentage = number(stat(entry, ["winPercent", "winPct", "winningPercentage", "winpercentage"])) ?? (wins !== void 0 && gamesPlayed ? (wins + ties * 0.5) / gamesPlayed : void 0);
  const rank = number(stat(entry, ["rank", "leagueRank", "standing", "position"]));
  const conferenceRank = number(stat(entry, ["conferenceRank", "confRank", "conferencePosition", "playoffSeed"]));
  const playoffSeed = number(stat(entry, ["playoffSeed", "seed"]));
  const gamesBehind = number(stat(entry, ["gamesBehind", "gb"]));
  const playoffStatus = clean(entry.note ?? entry.status?.name ?? entry.status?.type);
  return {
    id: FAVORITE_TEAM_NAMES[clean(name)] ?? `espn:${team.id ?? clean(name)}`,
    providerId: team.id,
    name,
    abbreviation: team.abbreviation,
    wins,
    losses,
    ties,
    gamesPlayed,
    winPercentage,
    ranking: number(stat(entry, ["apRank", "rank", "pollRank", "currentRank"])) ?? number(entry.rank),
    leagueRank: rank,
    conferenceRank: conferenceRank ?? playoffSeed,
    playoffSeed,
    gamesBehind,
    conference: group?.abbreviation ?? group?.name,
    division: clean(name) in NFL_DIVISIONS ? NFL_DIVISIONS[clean(name)] : group?.name,
    playoffStatus
  };
}
__name(normalizeEntry, "normalizeEntry");
function getEntries(payload) {
  return (payload?.groups ?? []).flatMap((group) => (group.entries ?? []).map((entry) => normalizeEntry(entry, group)));
}
__name(getEntries, "getEntries");
function isLateSeason(game) {
  const date = new Date(game.startTime);
  if (Number.isNaN(date.getTime())) return false;
  return game.leagueId === "nfl" && date.getMonth() >= 11 || game.leagueId === "nba" && (date.getMonth() <= 3 || date.getMonth() >= 10) || game.leagueId === "mlb" && date.getMonth() >= 8 || game.leagueId === "nhl" && date.getMonth() >= 3;
}
__name(isLateSeason, "isLateSeason");
function maturityFor(leagueId) {
  if (leagueId === "nfl") return 8;
  if (leagueId === "nba") return 50;
  if (leagueId === "mlb") return 100;
  if (leagueId === "nhl") return 50;
  return 0;
}
__name(maturityFor, "maturityFor");
function cutoffFor(leagueId) {
  if (leagueId === "nfl") return 7;
  if (leagueId === "nba") return 8;
  if (leagueId === "nhl") return 8;
  if (leagueId === "mlb") return 12;
  return void 0;
}
__name(cutoffFor, "cutoffFor");
function significantPlayoffRace(game) {
  if (!["nfl", "nba", "mlb", "nhl"].includes(game.leagueId)) return false;
  const home = game.homeTeam;
  const away = game.awayTeam;
  const cutoff = cutoffFor(game.leagueId);
  const maturity = maturityFor(game.leagueId);
  if (!home || !away || !cutoff || (home.gamesPlayed ?? 0) < maturity || (away.gamesPlayed ?? 0) < maturity) return false;
  const ranks = [home.conferenceRank ?? home.leagueRank, away.conferenceRank ?? away.leagueRank].filter((value) => Number.isFinite(value));
  if (ranks.length !== 2) return false;
  const bothNearCutoff = ranks.every((rank) => rank >= cutoff - 2 && rank <= cutoff + 2);
  return bothNearCutoff || isLateSeason(game) && ranks.some((rank) => rank <= cutoff + 1);
}
__name(significantPlayoffRace, "significantPlayoffRace");
function enrichGame(game, standingsByName) {
  const lookup = /* @__PURE__ */ __name((team) => {
    if (!team) return team;
    const context = standingsByName.get(clean(team.name));
    return context ? { ...team, ...context, id: team.id } : team;
  }, "lookup");
  const homeTeam = lookup(game.homeTeam);
  const awayTeam = lookup(game.awayTeam);
  const isDivisional = Boolean(homeTeam?.division && awayTeam?.division && homeTeam.division === awayTeam.division);
  const enriched = { ...game, homeTeam, awayTeam, isDivisional: game.leagueId === "nfl" ? isDivisional : game.isDivisional };
  if (["nfl", "nba", "mlb", "nhl"].includes(game.leagueId)) {
    enriched.hasPlayoffImplications = Boolean(game.hasPlayoffImplications || significantPlayoffRace(enriched));
  }
  return enriched;
}
__name(enrichGame, "enrichGame");
async function fetchEspnStandings(leagueId, year = (/* @__PURE__ */ new Date()).getFullYear()) {
  const config = ESPN_STANDINGS[leagueId];
  if (!config) return [];
  const url = new URL(`https://site.api.espn.com/apis/v2/sports/${config.sport}/${config.league}/standings`);
  url.searchParams.set("season", String(year));
  url.searchParams.set("seasontype", config.seasonType);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`ESPN standings returned ${response.status}`);
  return getEntries(await response.json());
}
__name(fetchEspnStandings, "fetchEspnStandings");
async function enrichGamesWithEspnStandings(games, year = (/* @__PURE__ */ new Date()).getFullYear()) {
  const leagueIds = [...new Set(games.map((game) => game.leagueId))].filter((leagueId) => ESPN_STANDINGS[leagueId]);
  const results = await Promise.allSettled(leagueIds.map(async (leagueId) => [leagueId, await fetchEspnStandings(leagueId, year)]));
  const byLeague = /* @__PURE__ */ new Map();
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const [leagueId, entries] = result.value;
    byLeague.set(leagueId, new Map(entries.map((entry) => [clean(entry.name), entry])));
  }
  return normalizeGames(games.map((game) => enrichGame(game, byLeague.get(game.leagueId) ?? /* @__PURE__ */ new Map())));
}
__name(enrichGamesWithEspnStandings, "enrichGamesWithEspnStandings");

// api/sports.js
var API_BASE = "https://www.thesportsdb.com/api/v1/json/123";
var WINDOW_DAYS = 7;
var CACHE_SECONDS = 60;
var ESPN_SCHEDULE_LEAGUES = [
  "nfl",
  "nba",
  "ncaa-football",
  "mlb",
  "nhl",
  "ufc",
  "epl",
  "epl-cup",
  "laliga",
  "ucl"
];
var SOCCER_STANDING_LEAGUES = ["ucl", "laliga", "epl"];
function addDays2(date, days) {
  return new Date(date.getTime() + days * 864e5);
}
__name(addDays2, "addDays");
function dateKey2(date) {
  return date.toISOString().slice(0, 10);
}
__name(dateKey2, "dateKey");
function todayInTimeZone(timeZone) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(/* @__PURE__ */ new Date());
    const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
    return new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)));
  } catch {
    const now = /* @__PURE__ */ new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
}
__name(todayInTimeZone, "todayInTimeZone");
function seasonFor(leagueId, date) {
  const year = date.getUTCFullYear();
  return ["epl", "laliga", "nba", "nhl"].includes(leagueId) ? `${year}-${year + 1}` : String(year);
}
__name(seasonFor, "seasonFor");
async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`TheSportsDB returned ${response.status}`);
  return response.json();
}
__name(getJson, "getJson");
async function fetchSoccerTable(league, today) {
  const season = seasonFor(league.id, today);
  const result = await getJson(`${API_BASE}/lookuptable.php?l=${league.providerId}&s=${encodeURIComponent(season)}`);
  return result.table ?? [];
}
__name(fetchSoccerTable, "fetchSoccerTable");
function applySoccerStandings(games, tablesByLeague) {
  return games.map((game) => {
    const table = tablesByLeague[game.leagueId];
    if (!table?.length) return game;
    const standings = /* @__PURE__ */ new Map();
    for (const row of table) {
      const name = String(row.name ?? row.strTeam ?? "").trim().toLowerCase();
      const rank = Number(row.intRank ?? row.intPosition ?? row.intStanding ?? row.position);
      if (!name || !Number.isFinite(rank)) continue;
      const played = Number(row.intPlayed ?? row.intGamesPlayed ?? row.played);
      const points = Number(row.intPoints ?? row.points);
      const goalDifference = Number(row.intGoalDifference ?? row.intGoalDiff ?? row.goalDifference);
      standings.set(name, {
        leagueRank: rank,
        ...Number.isFinite(played) ? { gamesPlayed: played } : {},
        ...Number.isFinite(points) ? { points } : {},
        ...Number.isFinite(goalDifference) ? { goalDifference } : {}
      });
    }
    const addRank = /* @__PURE__ */ __name((team) => {
      if (!team) return team;
      const context = standings.get(String(team.name ?? "").trim().toLowerCase());
      return context ? { ...team, ...context } : team;
    }, "addRank");
    return { ...game, homeTeam: addRank(game.homeTeam), awayTeam: addRank(game.awayTeam) };
  });
}
__name(applySoccerStandings, "applySoccerStandings");
function inWindow(game, startKey, endKey) {
  const key = String(game.startTime).slice(0, 10);
  return key >= startKey && key < endKey;
}
__name(inWindow, "inWindow");
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error ?? "Unknown error");
}
__name(errorMessage, "errorMessage");
function sourceRecord(id, name, provider, status, count = 0, error = null) {
  return { id, name, provider, status, count, ...error ? { error } : {} };
}
__name(sourceRecord, "sourceRecord");
function sourceName(leagueId) {
  const names = {
    "ncaa-football": "NCAA Football",
    "epl-cup": "Carabao Cup",
    epl: "Premier League",
    laliga: "La Liga",
    ucl: "UEFA Champions League"
  };
  return names[leagueId] || leagueId.toUpperCase();
}
__name(sourceName, "sourceName");
async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const requestedDays = Number(req.query?.days ?? WINDOW_DAYS);
  const days = Number.isFinite(requestedDays) ? Math.min(Math.max(Math.floor(requestedDays), 1), WINDOW_DAYS) : WINDOW_DAYS;
  const timeZone = String(req.query?.timezone || "UTC");
  const today = todayInTimeZone(timeZone);
  const end = addDays2(today, days);
  const startKey = dateKey2(today);
  const endKey = dateKey2(end);
  const games = [];
  const sources = [];
  const diagnostics = { timezone: timeZone, standings: [], favorites: [] };
  const scheduleResults = await Promise.allSettled(
    ESPN_SCHEDULE_LEAGUES.map(async (leagueId) => [leagueId, await fetchEspnLeagueWindow(leagueId, today, days)])
  );
  scheduleResults.forEach((result, index) => {
    const leagueId = ESPN_SCHEDULE_LEAGUES[index];
    if (result.status === "fulfilled") {
      const [, leagueGames] = result.value;
      const normalized = leagueGames.filter((game) => inWindow(game, startKey, endKey));
      games.push(...normalized);
      sources.push(sourceRecord(leagueId, sourceName(leagueId), "ESPN public scoreboard", "ok", normalized.length));
    } else {
      sources.push(sourceRecord(leagueId, sourceName(leagueId), "ESPN public scoreboard", "error", 0, errorMessage(result.reason)));
    }
  });
  const favoriteIds = favoriteTeamIds();
  const favoriteResults = await Promise.allSettled(
    favoriteIds.map(async (teamId) => [teamId, await fetchEspnTeamWindow(teamId, today, days)])
  );
  favoriteResults.forEach((result, index) => {
    const teamId = favoriteIds[index];
    if (result.status === "fulfilled") {
      const [, teamGames] = result.value;
      const normalized = teamGames.filter((game) => inWindow(game, startKey, endKey));
      games.push(...normalized);
      diagnostics.favorites.push(sourceRecord(teamId, teamId, "ESPN favorite-team schedule", "ok", normalized.length));
    } else {
      diagnostics.favorites.push(sourceRecord(teamId, teamId, "ESPN favorite-team schedule", "error", 0, errorMessage(result.reason)));
    }
  });
  const soccerLeagues = THESPORTSDB_LEAGUES.filter((league) => SOCCER_STANDING_LEAGUES.includes(league.id));
  const tableResults = await Promise.allSettled(
    soccerLeagues.map(async (league) => [league.id, await fetchSoccerTable(league, today)])
  );
  const tablesByLeague = {};
  tableResults.forEach((result, index) => {
    const league = soccerLeagues[index];
    if (result.status === "fulfilled") {
      const [leagueId, table] = result.value;
      tablesByLeague[leagueId] = table;
      diagnostics.standings.push(sourceRecord(leagueId, league.name, "TheSportsDB standings", "ok", table.length));
    } else {
      diagnostics.standings.push(sourceRecord(league.id, league.name, "TheSportsDB standings", "error", 0, errorMessage(result.reason)));
    }
  });
  let enrichedGames = games;
  try {
    const withSoccerStandings = applySoccerStandings(games, tablesByLeague);
    const withDomesticRaceContext = applyDomesticSoccerRaceContext(withSoccerStandings);
    enrichedGames = await enrichGamesWithEspnStandings(withDomesticRaceContext, today.getUTCFullYear());
    diagnostics.standings.push(sourceRecord("espn-major-sports", "Major sports standings", "ESPN standings", "ok"));
  } catch (error) {
    diagnostics.standings.push(sourceRecord("espn-major-sports", "Major sports standings", "ESPN standings", "error", 0, errorMessage(error)));
  }
  const uniqueGames = Array.from(new Map(enrichedGames.map((game) => [game.id, game])).values()).filter((game) => inWindow(game, startKey, endKey)).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  const nflSource = sources.find((source) => source.id === "nfl");
  const scheduleErrors = sources.filter((source) => source.status === "error");
  const health = {
    status: scheduleErrors.length === ESPN_SCHEDULE_LEAGUES.length ? "degraded" : "ok",
    nfl: nflSource ? { status: nflSource.status, count: nflSource.count, ...nflSource.error ? { error: nflSource.error } : {} } : { status: "missing", count: 0 },
    failedSources: scheduleErrors.map((source) => source.id)
  };
  res.setHeader("Cache-Control", `s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`);
  return res.status(200).json({
    source: "free-sports-aggregation",
    windowDays: days,
    startDate: startKey,
    endDateExclusive: endKey,
    fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
    games: uniqueGames,
    sources,
    diagnostics,
    health
  });
}
__name(handler, "handler");

// worker/index.js
function createVercelRequest(request) {
  const url = new URL(request.url);
  return {
    method: request.method,
    query: Object.fromEntries(url.searchParams.entries())
  };
}
__name(createVercelRequest, "createVercelRequest");
function createVercelResponse() {
  const headers = new Headers();
  let statusCode = 200;
  let body = null;
  return {
    setHeader(name, value) {
      headers.set(name, String(value));
    },
    status(status) {
      statusCode = status;
      return this;
    },
    json(payload) {
      body = JSON.stringify(payload);
      headers.set("Content-Type", "application/json; charset=utf-8");
      return new Response(body, { status: statusCode, headers });
    }
  };
}
__name(createVercelResponse, "createVercelResponse");
async function handleSportsApi(request) {
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  }
  const req = createVercelRequest(request);
  const res = createVercelResponse();
  const response = await handler(req, res);
  if (response instanceof Response) return response;
  return new Response(JSON.stringify({ error: "Sports API did not return a response" }), {
    status: 500,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}
__name(handleSportsApi, "handleSportsApi");
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/sports") {
      try {
        return await handleSportsApi(request);
      } catch (error) {
        return new Response(JSON.stringify({
          error: error instanceof Error ? error.message : String(error ?? "Sports API unavailable")
        }), {
          status: 502,
          headers: { "Content-Type": "application/json; charset=utf-8" }
        });
      }
    }
    return env.ASSETS.fetch(request);
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-vFMg9A/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-vFMg9A/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
