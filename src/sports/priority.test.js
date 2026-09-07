import { getPriorityTier, PRIORITY_TEST_EXPECTATIONS, sortGamesByPriority } from './priority';
import { validGames } from './games';

const expectedById = {
  'ucl-test-1': 0,
  'oregon-test-1': 1,
  'tottenham-test-1': 1,
  'ufc-test-1': 1,
  'kings-test-1': 2,
  'blue-jays-test-1': 2,
  'oilers-test-1': 2,
  'super-bowl-test-1': 3,
  'rivalry-test-1': 4,
  'normal-test-1': 5,
};

export function runPriorityChecks() {
  const results = Object.entries(expectedById).map(([gameId, expectedTier]) => {
    const game = validGames.find((candidate) => candidate.id === gameId);
    const actualTier = game ? getPriorityTier(game) : null;

    return {
      gameId,
      expectedTier,
      actualTier,
      passed: actualTier === expectedTier,
    };
  });

  const failed = results.filter((result) => !result.passed);

  if (failed.length > 0) {
    throw new Error(
      `Priority checks failed: ${failed
        .map((result) => `${result.gameId} expected ${result.expectedTier}, got ${result.actualTier}`)
        .join('; ')}`,
    );
  }

  const sortedIds = sortGamesByPriority(validGames).map((game) => game.id);
  const expectedOrder = Object.entries(expectedById)
    .sort(([, a], [, b]) => a - b)
    .map(([gameId]) => gameId);

  if (JSON.stringify(sortedIds) !== JSON.stringify(expectedOrder)) {
    throw new Error(
      `Priority sorting failed. Expected ${expectedOrder.join(', ')}, got ${sortedIds.join(', ')}`,
    );
  }

  return results;
}

export const PRIORITY_TEST_EXPECTATIONS = expectedById;
