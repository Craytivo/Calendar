import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('./contrast-system.css', import.meta.url), 'utf8');

const requiredTokens = [
  '--foreground-primary',
  '--foreground-secondary',
  '--foreground-tertiary',
  '--foreground-inverse',
  '--surface-page',
  '--surface-base',
  '--surface-raised',
  '--surface-subtle',
  '--surface-dark',
  '--border-strong',
];

for (const token of requiredTokens) assert.ok(css.includes(token), `Missing contrast token: ${token}`);

assert.ok(css.includes('@media (prefers-color-scheme: dark)'), 'Dark theme guardrail is missing');
assert.ok(css.includes('h1, h2, h3, h4, h5, h6'), 'Global heading foreground rule is missing');
assert.ok(css.includes('.today-brief-heading h2'), 'Today Brief contrast rule is missing');
assert.ok(css.includes('.next-up-header h2'), 'Next Up contrast rule is missing');
assert.ok(css.includes('.game-detail-modal h1'), 'Game detail modal contrast rule is missing');
assert.ok(css.includes('.filter-sheet'), 'Filter sheet contrast rule is missing');
assert.ok(css.includes('.mobile-nav'), 'Mobile navigation contrast rule is missing');
assert.ok(css.includes('!important'), 'Dark-surface foreground guardrails are not protected from later stylesheet overrides');

console.log('contrast-system.test.js passed');
