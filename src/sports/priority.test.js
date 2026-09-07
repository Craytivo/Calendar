import { getPriorityTier, sortGamesByPriority } from './priority.js';
import { validGames } from './games.js';

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

const expectedOrder = [
  'ucl-test-1',
  'oregon-test-1',
  'tottenham-test-1',
  'ufc-test-1',
  'kings-test-1',
  'blue-jays-test-1',
  'oilers-test-1',
  'super-bowl-test-1',
  'rivalry-test-1',
  'normal-test-1',
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function runPriorityChecks() {
  for (const [gameId, expectedTier] of Object.entries(expectedById)) {
    const game = validGames.find((candidate) => candidate.id === gameId);
    assert(game, `Missing test game: ${gameId}`);

    const actualTier = getPriorityTier(game);
    assert(
      actualTier === expectedTier,
      `${gameId} expected priority ${expectedTier}, got ${actualTier}`,
    );
  }

  const actualOrder = sortGamesByPriority(validGames).map((game) => game.id);
  assert(
    JSON.stringify(actualOrder) === JSON.stringify(expectedOrder),
    `Expected sorted order ${expectedOrder.join(', ')}, got ${actualOrder.join(', ')}`,
  );

  return true;
}

runPriorityChecks();
