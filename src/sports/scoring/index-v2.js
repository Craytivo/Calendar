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

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function getPersonalModifier(personal) {
  return Math.min(5, Math.max(0, personal?.score ?? 0) * (5 / 15));
}

function scoreBase(breakdown) {
  return clamp(
    (breakdown.competitive.score / breakdown.competitive.max) * 30 +
    (breakdown.teamQuality.score / breakdown.teamQuality.max) * 20 +
    (breakdown.stakes.score / breakdown.stakes.max) * 20 +
    (breakdown.narrative.score / breakdown.narrative.max) * 15 +
    (breakdown.form.score / breakdown.form.max) * 10,
  );
}

export function scoreGameV2(game) {
  const competitive = scoreCompetitiveV2(game);
  const stakes = scoreStakes(game);
  const teamQuality = scoreTeamQuality(game);
  const narrative = scoreNarrative(game, favoriteTeamIds);
  const form = scoreForm(game);
  const personal = scorePersonal(game, favoriteTeamIds, mustSeeTeamIds);
  const dataCompleteness = scoreDataCompleteness(game);

  const breakdown = { competitive, stakes, teamQuality, narrative, form, personal, dataCompleteness };
  const baseScore = scoreBase(breakdown);
  const personalModifier = getPersonalModifier(personal);
  const rawTotal = Math.round(clamp(baseScore + personalModifier));

  // Confidence describes how much supporting data we have; it must not become a
  // penalty that turns an otherwise reasonable game into an artificially low score.
  const weightedConfidence = (
    competitive.confidence * 25 +
    stakes.confidence * 25 +
    teamQuality.confidence * 15 +
    narrative.confidence * 10 +
    form.confidence * 10 +
    personal.confidence * 15
  ) / 100;

  const confidence = Number(Math.min(weightedConfidence, dataCompleteness.confidence).toFixed(2));

  return {
    total: rawTotal,
    rawTotal,
    confidenceAdjustedTotal: rawTotal,
    tier: getWatchTier(rawTotal).label,
    confidence,
    priorityFloor: { minScore: 0, reason: null },
    breakdown,
  };
}
