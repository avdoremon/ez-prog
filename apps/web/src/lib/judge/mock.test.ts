import { expect, test } from 'vitest';
import { MockJudge } from './mock.js';

const judge = new MockJudge();

test('reports a language map covering every supported language', async () => {
  const langs = await judge.languages();
  expect(Object.keys(langs).sort()).toEqual(['c', 'cpp', 'java', 'js', 'py']);
});

test('returns one result per submission, in order', async () => {
  const results = await judge.run([
    { languageId: 63, source: 'echo 1', stdin: 'a' },
    { languageId: 63, source: 'echo 2', stdin: 'b' },
  ]);
  expect(results).toHaveLength(2);
  expect(results[0]!.stdout).toBe('a');
  expect(results[1]!.stdout).toBe('b');
});

test('echoes stdin as stdout with an accepted verdict by default', async () => {
  const [r] = await judge.run([{ languageId: 63, source: 'x', stdin: 'hello' }]);
  expect(r!.verdict).toBe('accepted');
  expect(r!.stdout).toBe('hello');
});

test('a source containing FAIL yields a wrong-answer verdict', async () => {
  const [r] = await judge.run([{ languageId: 63, source: 'FAIL', stdin: 'x' }]);
  expect(r!.verdict).toBe('wrong_answer');
});

test('a source containing TLE yields a time-limit verdict', async () => {
  const [r] = await judge.run([{ languageId: 63, source: 'TLE', stdin: 'x' }]);
  expect(r!.verdict).toBe('time_limit');
});

test('results are deterministic across runs', async () => {
  const subs = [{ languageId: 63, source: 'x', stdin: 'y' }];
  expect(await judge.run(subs)).toEqual(await judge.run(subs));
});

test('an aborted signal rejects', async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(
    judge.run([{ languageId: 63, source: 'x', stdin: 'y' }], controller.signal),
  ).rejects.toThrow(/abort/i);
});
