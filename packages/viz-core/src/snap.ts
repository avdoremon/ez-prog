let freezeEnabled = true;

/** Production builds may disable freezing; correctness never depends on it. */
export function setFreezeSnapshots(on: boolean): void {
  freezeEnabled = on;
}

export function snap<S>(value: S): S {
  const copy = structuredClone(value);
  return freezeEnabled ? deepFreeze(copy) : copy;
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  Object.freeze(value);
  for (const key of Object.keys(value as object)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}
