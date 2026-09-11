import { teams } from '../types.js';
import { favoriteTeamIds } from '../team-identity.js';
import { scoreCompetitive } from './competitive.js';
import { scoreStakes } from './stakes.js';
import { scoreTeamQuality } from './team-quality.js';
import { scoreNarrative } from './narrative.js';
import { scoreForm } from './form.js';
import { scorePersonal } from './personal.js';
import { getWatchTier } from './tiers.js';

const mustSeeTeamIds = new Set(
  teams.filter((team) => team.favoriteTier === 'must-see').map((team) => team.id),
);

export const SCORING_WEIGHTS = {
  competitive: 25,
  stakes: 25,
  teamQuality: 15,
  narrative: 10,
  form: 10,
  personal: 15,
};

function collectReasons(parts) {
  return [...new Set(parts.flatMap((part) => part.reasons ?? []))].slice(0, 3);
}

export function scoreGame(game) {
  const competitive = scoreCompetitive(game);
  const stakes = scoreStakes(game);
  const teamQuality = scoreTeamQuality(game);
  const narrative = scoreNarrative(game, favoriteTeamIds);
  const form = scoreForm(game);
  const personal = scorePersonal(game, favoriteTeamIds, mustSeeTeamIds);

  const total = Math.round(
    competitive.score +
      stakes.score +
      teamQuality.score +
      narrative.score +
      form.score +
      personal.score,
  );

  const confidence = Number(
    (
      (competitive.confidence * competitive.max +
        stakes.confidence * stakes.max +
        teamQuality.confidence * teamQuality.max +
        narrative.confidence * narrative.max +
        form.confidence * form.max +
        personal.confidence * personal.max) /
      100
    ).toFixed(2),
  );

  const tier = getWatchTier(total);
  const categories = [competitive, stakes, teamQuality, narrative, form, personal];

  return {
    total: Math.max(0, Math.min(100, total)),
    tier: tier.label,
    breakdown: {
      competitive,
      stakes,
      teamQuality,
      narrative,
      form,
      personal,
    },
    reasons: collectReasons(categories),
    confidence,
  };
}

export function compareGameModels(game, oldModel) {
  const next = scoreGame(game);
  const oldScore = oldModel.getPriorityScore(game);
  return {
    id: game.id,
    leagueId: game.leagueId,
    oldScore,
    oldTier: oldModel.getPriorityLabel(oldModel.getPriorityTier(game)),
    newScore: next.total,
    newTier: next.tier,
    delta: next.total - oldScore,
    reasons: next.reasons,
    confidence: next.confidence,
    breakdown: next.breakdown,
  };
}
