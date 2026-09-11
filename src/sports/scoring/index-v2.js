import { teams } from '../types.js';
import { favoriteTeamIds } from '../team-identity.js';
import { scoreCompetitiveV2 } from './competitive-v2.js';
import { scoreStakes } from './stakes.js';
import { scoreTeamQuality } from './team-quality.js';
import { scoreNarrative } from './narrative.js';
import { scoreForm } from './form.js';
import { scorePersonal } from './personal.js';
import { scoreDataCompleteness } from './data-completeness.js';
import { getWatchTier } from './tiers.js';

const mustSeeTeamIds = new Set(teams.filter((team) => team.favoriteTier === 'must-see').map((team) => team.id));

export function scoreGameV2(game) {
  const competitive = scoreCompetitiveV2(game);
  const stakes = scoreStakes(game);
  const teamQuality = scoreTeamQuality(game);
  const narrative = scoreNarrative(game, favoriteTeamIds);
  const form = scoreForm(game);
  const personal = scorePersonal(game, favoriteTeamIds, mustSeeTeamIds);
  const dataCompleteness = scoreDataCompleteness(game);
  const total = Math.round(competitive.score + stakes.score + teamQuality.score + narrative.score + form.score + personal.score);
  const weightedConfidence = (competitive.confidence * 25 + stakes.confidence * 25 + teamQuality.confidence * 15 + narrative.confidence * 10 + form.confidence * 10 + personal.confidence * 15) / 100;
  const confidence = Number(Math.min(weightedConfidence, dataCompleteness.confidence).toFixed(2));

  return {
    total: Math.max(0, Math.min(100, total)),
    tier: getWatchTier(total).label,
    breakdown: { competitive, stakes, teamQuality, narrative, form, personal, dataCompleteness },
    confidence,
  };
}
