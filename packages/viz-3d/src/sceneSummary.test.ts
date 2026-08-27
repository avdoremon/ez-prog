import { expect, test } from 'vitest';
import { buildSceneSummary } from './sceneSummary.js';

test('describes an empty tree', () => {
  expect(buildSceneSummary([])).toBe('Empty tree.');
});

test('describes size and level count with no marks', () => {
  expect(buildSceneSummary([8, 3, 10, 1, 6, 9, 14])).toBe(
    'Binary tree, 7 nodes, 3 levels.',
  );
});

test('describes a single active node', () => {
  const summary = buildSceneSummary([8, 3, 10], [{ kind: 'cursor', at: { t: 'index', i: 1 } }]);
  expect(summary).toBe('Binary tree, 3 nodes, 2 levels. Node 1 (value 3) is cursor.');
});

test('describes a range mark by count', () => {
  const summary = buildSceneSummary(
    [8, 3, 10],
    [{ kind: 'done', at: { t: 'range', from: 0, to: 2 } }],
  );
  expect(summary).toBe('Binary tree, 3 nodes, 2 levels. 3 nodes done.');
});

test('uses singular wording for one node and one level', () => {
  expect(buildSceneSummary([42])).toBe('Binary tree, 1 node, 1 level.');
});
