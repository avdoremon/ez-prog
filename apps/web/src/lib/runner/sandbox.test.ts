import { expect, test } from 'vitest';
import { buildSandboxedSource } from './sandbox.js';

interface SandboxOutcome {
  output: string[];
  returnValue?: string;
  error?: string;
}

function run(userSource: string): SandboxOutcome {
  // eslint-disable-next-line no-eval -- exercising the generated sandbox directly.
  return eval(buildSandboxedSource(userSource)) as SandboxOutcome;
}

test('captures console.log/warn/error calls in call order', () => {
  const result = run("console.log(1); console.warn('two'); console.error(3);");
  expect(result.output).toEqual(['1', 'two', '3']);
});

test('joins multiple arguments to one console call with a space', () => {
  const result = run("console.log('a', 1, [1, 2]);");
  expect(result.output).toEqual(['a 1 [1,2]']);
});

test('captures the last top-level expression as returnValue, JSON-stringified', () => {
  expect(run('40 + 2;').returnValue).toBe('42');
  expect(run('[1, 2, 3];').returnValue).toBe('[1,2,3]');
});

test('returns a bare string return value unquoted', () => {
  expect(run("'hello';").returnValue).toBe('hello');
});

test('has no returnValue when the last statement produces no value', () => {
  const result = run('var x = 5;');
  expect(result.returnValue).toBeUndefined();
});

test('a function call as the last statement returns its value, not console output', () => {
  const result = run('function double(n) { return n * 2; } double(21);');
  expect(result.returnValue).toBe('42');
  expect(result.output).toEqual([]);
});

test('a runtime error keeps whatever output was produced before the throw', () => {
  const result = run("console.log('before'); throw new Error('boom');");
  expect(result.output).toEqual(['before']);
  expect(result.error).toBe('boom');
});

test('a syntax error is returned as an error, not thrown', () => {
  expect(() => run('this is ) not valid js')).not.toThrow();
  const result = run('this is ) not valid js');
  expect(result.output).toEqual([]);
  expect(result.error).toBeTruthy();
});

test('console.log(undefined) shows the literal word "undefined", not a blank line', () => {
  const result = run('console.log(undefined);');
  expect(result.output).toEqual(['undefined']);
});

test('console.log(NaN) shows "NaN", not the misleading "null" JSON.stringify would give', () => {
  const result = run('console.log(NaN);');
  expect(result.output).toEqual(['NaN']);
});
