import { snap } from '../snap.js';
import type { Frame, Mark, VizAlgorithm } from '../types.js';

export interface HashTableInput {
  /** Keys to insert, in order. */
  keys: number[];
  /** Fixed number of slots. The hash is `key % capacity`. */
  capacity: number;
  /** Key to look up once every insert is done. */
  lookup: number;
}

/**
 * A hash table using open addressing with linear probing.
 *
 * Open addressing, not separate chaining, because the table *is* the array:
 * every key lives in a slot, so the whole structure fits ArrayView and a
 * probe is a cursor walking cells the learner can already read. Chaining
 * would need a bucket-of-lists renderer, and would hide the thing worth
 * seeing — that a collision is resolved by looking at the next slot along.
 *
 * `null` is an empty slot, which is why ArrayView had to learn to draw one.
 * A sentinel number could not do it: 0 is a perfectly good key.
 */
export const hashTable: VizAlgorithm<HashTableInput, (number | null)[]> =
function* ({ keys, capacity, lookup }): Generator<Frame<(number | null)[]>> {
  const slots: (number | null)[] = Array.from({ length: capacity }, () => null);
  let filled = 0;
  let probes = 0;

  const loadFactor = () => (filled / capacity).toFixed(2);
  const occupied = (): Mark[] =>
    slots.flatMap((v, i) =>
      v === null ? [] : [{ kind: 'visited' as const, at: { t: 'index' as const, i } }],
    );

  yield {
    state: snap(slots), line: 'INIT',
    vars: { capacity, filled, load: loadFactor() },
    note: `${capacity} empty slots. A key's slot is decided by arithmetic, not by searching.`,
  };

  for (const key of keys) {
    const home = ((key % capacity) + capacity) % capacity;

    yield {
      state: snap(slots), line: 'HASH',
      vars: { key, hash: `${key} % ${capacity} = ${home}`, filled, load: loadFactor() },
      marks: [...occupied(), { kind: 'cursor', at: { t: 'index', i: home } }],
      note: `${key} hashes to slot ${home}. That is one calculation — no scan of the table.`,
    };

    // Walk before deciding anything. Checking "is the table full?" up front
    // would answer a full table with FULL even when the key is already in it,
    // which is a lie: re-inserting a key a full table already holds is a
    // no-op, not a failure. Bounded by `capacity`, so a full table terminates.
    let i = home;
    let step = 0;
    let free = -1;
    let alreadyPresent = false;

    for (let n = 0; n < capacity; n++) {
      if (slots[i] === null) {
        free = i;
        break;
      }

      // A table holds a set of keys, not a bag. Without this, inserting the
      // same key twice walks past the copy already there and stores a second
      // one, and the table would show the key twice.
      if (slots[i] === key) {
        alreadyPresent = true;
        yield {
          state: snap(slots), line: 'EXISTS',
          vars: { key, slot: i, filled, load: loadFactor() },
          marks: [...occupied(), { kind: 'done', at: { t: 'index', i } }],
          note: `${key} is already in slot ${i}. Nothing to do — a table holds a key once.`,
        };
        break;
      }

      probes++;
      step++;

      yield {
        state: snap(slots), line: 'PROBE',
        vars: { key, slot: i, occupiedBy: slots[i]!, probes, load: loadFactor() },
        marks: [
          ...occupied(),
          { kind: 'compare', at: { t: 'index', i } },
        ],
        note: `Slot ${i} already holds ${slots[i]} — a collision. Try the next slot along.`,
      };

      i = (i + 1) % capacity;
    }

    if (alreadyPresent) continue;

    if (free === -1) {
      yield {
        state: snap(slots), line: 'FULL', vars: { key, filled, load: loadFactor() },
        marks: occupied(),
        note: `Every slot is taken, so ${key} has nowhere to go. A real table resizes long before this.`,
      };
      continue;
    }

    slots[free] = key;
    filled++;

    yield {
      state: snap(slots), line: 'PLACE',
      vars: { key, slot: free, probes, filled, load: loadFactor() },
      marks: [...occupied(), { kind: 'active', at: { t: 'index', i: free } }],
      note: step === 0
        ? `Slot ${home} was free, so ${key} lands there directly — one step, no searching.`
        : `First free slot is ${free}, ${step} along from ${home}. ${key} goes there.`,
    };
  }

  // Lookup repeats the insert's walk exactly. It has to: a key displaced by a
  // collision is not at its hash, and the only way to find it again is to
  // retrace the same path.
  const home = ((lookup % capacity) + capacity) % capacity;

  yield {
    state: snap(slots), line: 'HASH',
    vars: { key: lookup, hash: `${lookup} % ${capacity} = ${home}`, load: loadFactor() },
    marks: [...occupied(), { kind: 'cursor', at: { t: 'index', i: home } }],
    note: `Now find ${lookup}. Hash it the same way: slot ${home}. Start looking there.`,
  };

  let i = home;
  let looked = 0;

  while (looked < capacity) {
    if (slots[i] === lookup) {
      yield {
        state: snap(slots), line: 'DONE',
        vars: { key: lookup, slot: i, checked: looked + 1, load: loadFactor() },
        marks: [...occupied(), { kind: 'done', at: { t: 'index', i } }],
        note: `Found ${lookup} in slot ${i} after ${looked + 1} ${looked === 0 ? 'look' : 'looks'} — not a scan of all ${capacity}.`,
      };
      return;
    }

    if (slots[i] === null) {
      yield {
        state: snap(slots), line: 'MISS',
        vars: { key: lookup, slot: i, checked: looked + 1, load: loadFactor() },
        marks: [...occupied(), { kind: 'discard', at: { t: 'index', i } }],
        note: `Slot ${i} is empty, so ${lookup} cannot be anywhere further along — the insert would have stopped here too. Not present.`,
      };
      return;
    }

    yield {
      state: snap(slots), line: 'PROBE',
      vars: { key: lookup, slot: i, occupiedBy: slots[i]!, checked: looked + 1, load: loadFactor() },
      marks: [...occupied(), { kind: 'compare', at: { t: 'index', i } }],
      note: `Slot ${i} holds ${slots[i]}, not ${lookup}. Keep walking, exactly as the insert did.`,
    };

    i = (i + 1) % capacity;
    looked++;
  }

  yield {
    state: snap(slots), line: 'MISS',
    vars: { key: lookup, checked: capacity, load: loadFactor() },
    marks: occupied(),
    note: `Walked every slot without finding ${lookup} or an empty one. In a full table a miss costs a whole lap.`,
  };
};
