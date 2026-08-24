import { z } from 'zod';
import type { VizEntry } from './types.js';

const registry = {
  'binary-search': {
    renderer: 'ArrayView',
    label: 'Sorted array being searched',
    defaultInput: { arr: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91], target: 23 },
    inputSchema: z.object({
      arr: z.array(z.number()).min(1).max(64),
      target: z.number(),
    }),
    load: () =>
      import('@cs/viz-core/algorithms/binary-search').then((m) => ({
        default: m.binarySearch,
      })),
    code: () => import('./code/binary-search/index.js'),
  },
  'bubble-sort': {
    renderer: 'ArrayView',
    label: 'Array being sorted by repeated swaps',
    defaultInput: { arr: [5, 2, 9, 1, 7, 3] },
    // Quadratic — tighter than the global MAX_FRAMES budget.
    maxFrames: 400,
    // 16, matching the other two quadratic sorts. At the previous bound of 24
    // a reversed array needed 577 frames and truncated against the cap above,
    // stranding the learner mid-sort. The three sorts also share a
    // defaultInput so they can be compared directly, which is a poor argument
    // for letting them disagree about how much input they accept.
    // frame-budget.test.ts pins this for every entry.
    inputSchema: z.object({
      arr: z.array(z.number()).min(1).max(16),
    }),
    load: () =>
      import('@cs/viz-core/algorithms/bubble-sort').then((m) => ({
        default: m.bubbleSort,
      })),
    code: () => import('./code/bubble-sort/index.js'),
  },
  'selection-sort': {
    renderer: 'ArrayView',
    label: 'Array being sorted by selecting the smallest remaining value',
    // Deliberately the same six values as the 'bubble-sort' and
    // 'insertion-sort' entries, so the three quadratic sorts can be compared
    // on identical input. This array also exercises both branches of the
    // guarded swap: passes 0 and 2 swap, passes 1, 3 and 4 find the value
    // already in place and settle without a write.
    defaultInput: { arr: [5, 2, 9, 1, 7, 3] },
    // Quadratic — tighter than the global MAX_FRAMES budget.
    maxFrames: 400,
    // 16, not the 24 its sibling sorts allow. This generator emits a frame per
    // comparison AND a frame per new minimum, so 24 reversed values need 468
    // frames and truncate against the cap above — cutting the run off before
    // DONE, which is the frame carrying the final swap count the lesson is
    // built on. At 16 the theoretical worst case is 272, so every input the
    // editor accepts runs to completion. See AUTHORING.md §4.6: the schema
    // bound is what keeps learner input inside the frame budget.
    inputSchema: z.object({
      arr: z.array(z.number()).min(1).max(16),
    }),
    load: () =>
      import('@cs/viz-core/algorithms/selection-sort').then((m) => ({
        default: m.selectionSort,
      })),
    code: () => import('./code/selection-sort/index.js'),
  },
  'insertion-sort': {
    renderer: 'ArrayView',
    label: 'Array being sorted by inserting each value into the sorted prefix',
    defaultInput: { arr: [5, 2, 9, 1, 7, 3] },
    // Quadratic — tighter than the global MAX_FRAMES budget.
    maxFrames: 400,
    // 16, for the same reason as bubble-sort above: reversed input at the
    // previous bound of 24 needed 600 frames against this cap — the worst of
    // the three sorts, since it emits a frame per comparison and another per
    // shift. frame-budget.test.ts pins this for every entry.
    inputSchema: z.object({
      arr: z.array(z.number()).min(1).max(16),
    }),
    load: () =>
      import('@cs/viz-core/algorithms/insertion-sort').then((m) => ({
        default: m.insertionSort,
      })),
    code: () => import('./code/insertion-sort/index.js'),
  },
  heap: {
    renderer: 'ArrayView',
    label: 'Binary max-heap stored as a flat array, root at index 0',
    defaultInput: { values: [15, 4, 23, 8, 42, 16], extract: true },
    inputSchema: z.object({
      values: z.array(z.number()).min(1).max(31),
      extract: z.boolean(),
    }),
    load: () =>
      import('@cs/viz-core/algorithms/heap').then((m) => ({ default: m.heap })),
    code: () => import('./code/heap/index.js'),
  },
  'merge-sort': {
    renderer: 'ArrayView',
    label: 'Array being sorted by splitting into runs and merging them back',
    defaultInput: { arr: [5, 2, 9, 1, 7, 3, 8, 4] },
    // Every level of the recursion writes n values, so frames grow as n log n.
    maxFrames: 400,
    inputSchema: z.object({
      arr: z.array(z.number()).min(1).max(24),
    }),
    load: () =>
      import('@cs/viz-core/algorithms/merge-sort').then((m) => ({
        default: m.mergeSort,
      })),
    code: () => import('./code/merge-sort/index.js'),
  },
  'quick-sort': {
    renderer: 'ArrayView',
    label: 'Array being partitioned around a pivot',
    defaultInput: { arr: [5, 2, 9, 1, 7, 3, 8, 4] },
    // Quadratic in the worst case (already-sorted input, with this pivot).
    maxFrames: 400,
    inputSchema: z.object({
      arr: z.array(z.number()).min(1).max(24),
    }),
    load: () =>
      import('@cs/viz-core/algorithms/quick-sort').then((m) => ({
        default: m.quickSort,
      })),
    code: () => import('./code/quick-sort/index.js'),
  },
  'amortized-growth': {
    renderer: 'ArrayView',
    label: 'Dynamic array growing by doubling as values are appended',
    defaultInput: { count: 16, initialCapacity: 1 },
    // Copies during resizes add frames beyond the append count.
    maxFrames: 400,
    inputSchema: z.object({
      count: z.number().int().min(1).max(32),
      initialCapacity: z.number().int().min(1).max(16),
    }),
    load: () =>
      import('@cs/viz-core/algorithms/amortized-growth').then((m) => ({
        default: m.amortizedGrowth,
      })),
    code: () => import('./code/amortized-growth/index.js'),
  },
  'greedy-coins': {
    renderer: 'ArrayView',
    label: 'Coin denominations, largest first, as greedy works through them',
    defaultInput: { coins: [25, 10, 5, 1], amount: 63 },
    inputSchema: z.object({
      coins: z.array(z.number().int().positive()).min(1).max(12),
      amount: z.number().int().positive().max(200),
    }),
    load: () =>
      import('@cs/viz-core/algorithms/greedy-coins').then((m) => ({
        default: m.greedyCoins,
      })),
    code: () => import('./code/greedy-coins/index.js'),
  },
  'tree-traversal': {
    renderer: 'TreeView',
    label: 'Binary tree being walked depth-first',
    // A BST-shaped tree, so in-order comes out sorted — which is the hook for
    // the Binary Search Trees lesson.
    defaultInput: { values: [8, 3, 10, 1, 6, 9, 14], order: 'in' },
    inputSchema: z.object({
      values: z.array(z.number()).min(1).max(31),
      order: z.enum(['pre', 'in', 'post']),
    }),
    load: () =>
      import('@cs/viz-core/algorithms/tree-traversal').then((m) => ({
        default: m.treeTraversal,
      })),
    code: () => import('./code/tree-traversal/index.js'),
  },
  bst: {
    renderer: 'TreeView',
    label: 'Binary search tree being searched, discarded subtrees dimmed',
    defaultInput: { values: [8, 3, 10, 1, 6, 9, 14], target: 6 },
    inputSchema: z.object({
      values: z.array(z.number()).min(1).max(31),
      target: z.number(),
    }),
    load: () =>
      import('@cs/viz-core/algorithms/bst-search').then((m) => ({
        default: m.bstSearch,
      })),
    code: () => import('./code/bst-search/index.js'),
  },
  bfs: {
    renderer: 'GraphView',
    label: 'Graph explored breadth-first from a starting node',
    defaultInput: {
      values: [0, 1, 2, 3, 4, 5],
      edges: [
        { from: 0, to: 1 }, { from: 0, to: 2 }, { from: 1, to: 3 },
        { from: 2, to: 3 }, { from: 3, to: 4 }, { from: 4, to: 5 },
      ],
      start: 0,
    },
    inputSchema: z
      .object({
        values: z.array(z.number()).min(1).max(16),
        edges: z
          .array(z.object({ from: z.number().int(), to: z.number().int() }))
          .max(40),
        start: z.number().int().min(0),
      })
      .refine((v) => v.start < v.values.length, {
        message: 'start must be the index of an existing node.',
      })
      .refine(
        (v) => v.edges.every((e) => e.from < v.values.length && e.to < v.values.length),
        { message: 'every edge must join two existing node indexes.' },
      ),
    load: () =>
      import('@cs/viz-core/algorithms/bfs').then((m) => ({ default: m.bfs })),
    code: () => import('./code/bfs/index.js'),
  },
  dfs: {
    renderer: 'GraphView',
    label: 'Graph explored depth-first from a starting node',
    // Deliberately the same graph as the 'bfs' entry, so the two lessons can
    // be compared directly.
    defaultInput: {
      values: [0, 1, 2, 3, 4, 5],
      edges: [
        { from: 0, to: 1 }, { from: 0, to: 2 }, { from: 1, to: 3 },
        { from: 2, to: 3 }, { from: 3, to: 4 }, { from: 4, to: 5 },
      ],
      start: 0,
    },
    inputSchema: z
      .object({
        values: z.array(z.number()).min(1).max(16),
        edges: z
          .array(z.object({ from: z.number().int(), to: z.number().int() }))
          .max(40),
        start: z.number().int().min(0),
      })
      .refine((v) => v.start < v.values.length, {
        message: 'start must be the index of an existing node.',
      })
      .refine(
        (v) => v.edges.every((e) => e.from < v.values.length && e.to < v.values.length),
        { message: 'every edge must join two existing node indexes.' },
      ),
    load: () =>
      import('@cs/viz-core/algorithms/dfs').then((m) => ({ default: m.dfs })),
    code: () => import('./code/dfs/index.js'),
  },
  dijkstra: {
    renderer: 'GraphView',
    label: 'Weighted graph with the cheapest known cost to reach each node',
    // The same six nodes as the 'bfs' and 'dfs' entries, now carrying weights,
    // so the three lessons can be compared directly. Edge 0-4 is deliberately
    // one expensive hop: BFS calls node 4 a single step away, while Dijkstra
    // finds a three-edge route that costs less. That disagreement is the lesson.
    defaultInput: {
      values: [0, 1, 2, 3, 4, 5],
      edges: [
        { from: 0, to: 1, weight: 2 }, { from: 0, to: 2, weight: 1 },
        { from: 0, to: 4, weight: 9 }, { from: 1, to: 3, weight: 1 },
        { from: 2, to: 3, weight: 5 }, { from: 3, to: 4, weight: 3 },
        { from: 4, to: 5, weight: 2 },
      ],
      start: 0,
    },
    inputSchema: z
      .object({
        values: z.array(z.number()).min(1).max(16),
        edges: z
          .array(
            z.object({
              from: z.number().int(),
              to: z.number().int(),
              // Non-negative is a precondition of the algorithm, not a taste:
              // a negative edge can make an already-settled distance wrong,
              // and Dijkstra never revisits a settled node to find out.
              weight: z
                .number()
                .min(0, 'Dijkstra requires non-negative edge weights.'),
            }),
          )
          .max(40),
        start: z.number().int().min(0),
      })
      .refine((v) => v.start < v.values.length, {
        message: 'start must be the index of an existing node.',
      })
      .refine(
        (v) => v.edges.every((e) => e.from < v.values.length && e.to < v.values.length),
        { message: 'every edge must join two existing node indexes.' },
      ),
    load: () =>
      import('@cs/viz-core/algorithms/dijkstra').then((m) => ({
        default: m.dijkstra,
      })),
    code: () => import('./code/dijkstra/index.js'),
  },
  'graph-intro': {
    renderer: 'GraphView',
    label: 'Graph tour: each node with its neighbours and degree',
    defaultInput: {
      values: [0, 1, 2, 3, 4],
      edges: [
        { from: 0, to: 1 }, { from: 0, to: 2 }, { from: 1, to: 2 }, { from: 2, to: 3 },
      ],
      directed: false,
    },
    inputSchema: z
      .object({
        values: z.array(z.number()).min(1).max(16),
        edges: z
          .array(z.object({ from: z.number().int(), to: z.number().int() }))
          .max(40),
        directed: z.boolean(),
      })
      .refine(
        (v) => v.edges.every((e) => e.from < v.values.length && e.to < v.values.length),
        { message: 'every edge must join two existing node indexes.' },
      ),
    load: () =>
      import('@cs/viz-core/algorithms/graph-intro').then((m) => ({
        default: m.graphIntro,
      })),
    code: () => import('./code/graph-intro/index.js'),
  },
  'hash-table': {
    renderer: 'ArrayView',
    label: 'Hash table slots, empty ones shown as gaps, with the key being placed',
    // Chosen so the run shows all three cases in order: four keys landing
    // directly in a free slot, then 19 colliding at slot 5 and probing 5 -> 6
    // -> 0, which also demonstrates the wrap around the end of the table.
    // The lookup of 19 then retraces exactly that walk, which is the point
    // the lesson turns on — a displaced key is not at its own hash.
    defaultInput: { keys: [12, 25, 37, 6, 19], capacity: 7, lookup: 19 },
    maxFrames: 400,
    inputSchema: z
      .object({
        keys: z.array(z.number().int()).min(1).max(16),
        // At least 2 so a collision has somewhere to probe to; the modulo
        // would also be meaningless at 0.
        capacity: z.number().int().min(2).max(16),
        lookup: z.number().int(),
      }),
    load: () =>
      import('@cs/viz-core/algorithms/hash-table').then((m) => ({
        default: m.hashTable,
      })),
    code: () => import('./code/hash-table/index.js'),
  },
  queue: {
    renderer: 'ArrayView',
    label: 'Queue contents, front at the left and back at the right',
    // A number enqueues it; null dequeues. Interleaved so FIFO order shows.
    defaultInput: { ops: [4, 8, 15, null, 16, null, 23] },
    inputSchema: z.object({
      ops: z.array(z.union([z.number(), z.null()])).min(1).max(24),
    }),
    // Each dequeue costs a shift per remaining value, so frames grow faster
    // than the op count.
    maxFrames: 400,
    load: () =>
      import('@cs/viz-core/algorithms/queue').then((m) => ({ default: m.queue })),
    code: () => import('./code/queue/index.js'),
  },
  stack: {
    renderer: 'ArrayView',
    label: 'Stack contents, with the top at the right',
    // A number pushes it; null pops. Interleaved so the LIFO order is visible
    // rather than just "fill up, then drain".
    defaultInput: { ops: [4, 8, 15, null, 16, null, null, 23] },
    inputSchema: z.object({
      ops: z.array(z.union([z.number(), z.null()])).min(1).max(40),
    }),
    load: () =>
      import('@cs/viz-core/algorithms/stack').then((m) => ({ default: m.stack })),
    code: () => import('./code/stack/index.js'),
  },
  'array-basics': {
    renderer: 'ArrayView',
    label: 'Array being read by index and then inserted into',
    defaultInput: { arr: [4, 8, 15, 16, 23, 42], readIndex: 3, insertAt: 1, value: 9 },
    inputSchema: z
      .object({
        arr: z.array(z.number()).min(1).max(32),
        readIndex: z.number().int().min(0),
        insertAt: z.number().int().min(0),
        value: z.number(),
      })
      .refine((v) => v.readIndex < v.arr.length, {
        message: 'readIndex must point at an existing element.',
      })
      .refine((v) => v.insertAt <= v.arr.length, {
        message: 'insertAt may be at most the array length (appending at the end).',
      }),
    load: () =>
      import('@cs/viz-core/algorithms/array-basics').then((m) => ({
        default: m.arrayBasics,
      })),
    code: () => import('./code/array-basics/index.js'),
  },
  'dp-fibonacci': {
    renderer: 'ArrayView',
    label: 'Fibonacci table, filled in bottom-up, one cell at a time',
    // n = 5 gives the table [0, 1, 1, 2, 3, 5]: two base cases plus three
    // computed cells, small enough to read at a glance.
    defaultInput: { n: 5 },
    inputSchema: z.object({
      // Capped at 15 so every cell's value stays a small, legible number
      // (fib(15) = 610); frame count is linear in n regardless, so this is
      // a pedagogy bound, not a frame-budget one.
      n: z.number().int().min(0).max(15),
    }),
    load: () =>
      import('@cs/viz-core/algorithms/dp-fibonacci').then((m) => ({
        default: m.dpFibonacci,
      })),
    code: () => import('./code/dp-fibonacci/index.js'),
  },
  recursion: {
    renderer: 'ArrayView',
    label: 'Call stack for factorial(n), one frame per pending call',
    // Small enough that every frame's value stays a few digits, large enough
    // that the stack visibly grows before it drains: 4 calls, a base case,
    // 5 returns.
    defaultInput: { n: 5 },
    inputSchema: z.object({
      // Capped at 10 (10! = 3628800) so every frame's value stays readable
      // at a glance; the frame count is linear in n regardless, so this is
      // a pedagogy bound, not a frame-budget one.
      n: z.number().int().min(0).max(10),
    }),
    load: () =>
      import('@cs/viz-core/algorithms/recursion').then((m) => ({
        default: m.recursion,
      })),
    code: () => import('./code/recursion/index.js'),
  },
  'linked-list': {
    renderer: 'GraphView',
    label: 'Singly linked list, one arrow per node pointing at the next',
    // Deliberately the same values and readIndex/insertAt/value as the
    // 'array-basics' entry, so the two lessons can be compared directly on
    // identical input — one pays for reading, the other pays for inserting.
    defaultInput: { arr: [4, 8, 15, 16, 23, 42], readIndex: 3, insertAt: 1, value: 9 },
    inputSchema: z
      .object({
        arr: z.array(z.number()).min(1).max(32),
        readIndex: z.number().int().min(0),
        insertAt: z.number().int().min(0),
        value: z.number(),
      })
      .refine((v) => v.readIndex < v.arr.length, {
        message: 'readIndex must point at an existing node.',
      })
      .refine((v) => v.insertAt <= v.arr.length, {
        message: 'insertAt may be at most the list length (appending at the tail).',
      }),
    load: () =>
      import('@cs/viz-core/algorithms/linked-list').then((m) => ({
        default: m.linkedList,
      })),
    code: () => import('./code/linked-list/index.js'),
  },
  'sliding-window': {
    renderer: 'ArrayView',
    label: 'Array with a fixed-width window sliding across it',
    defaultInput: { arr: [3, -1, 4, 8, 2, -5, 7, 1], k: 3 },
    inputSchema: z
      .object({
        arr: z.array(z.number()).min(1).max(64),
        k: z.number().int().min(1).max(64),
      })
      // Cross-field: a window wider than the array has no valid position.
      .refine((v) => v.k <= v.arr.length, {
        message: 'k must not be larger than the number of values in arr.',
      }),
    load: () =>
      import('@cs/viz-core/algorithms/sliding-window').then((m) => ({
        default: m.slidingWindow,
      })),
    code: () => import('./code/sliding-window/index.js'),
  },
  'two-pointer': {
    renderer: 'ArrayView',
    label: 'Sorted array with a pointer converging from each end',
    defaultInput: { arr: [1, 3, 4, 6, 8, 11, 15], target: 14 },
    inputSchema: z.object({
      arr: z.array(z.number()).min(2).max(64),
      target: z.number(),
    }),
    load: () =>
      import('@cs/viz-core/algorithms/two-pointer').then((m) => ({
        default: m.twoPointer,
      })),
    code: () => import('./code/two-pointer/index.js'),
  },
  'linear-search': {
    renderer: 'ArrayView',
    label: 'Array scanned one value at a time',
    defaultInput: { arr: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91], target: 23 },
    inputSchema: z.object({
      arr: z.array(z.number()).min(1).max(64),
      target: z.number(),
    }),
    load: () =>
      import('@cs/viz-core/algorithms/linear-search').then((m) => ({
        default: m.linearSearch,
      })),
    code: () => import('./code/linear-search/index.js'),
  },
} satisfies Record<string, VizEntry<any, any>>;

export type VizId = keyof typeof registry;

// Widened to the full VizEntry shape (including optional fields such as
// `maxFrames`) so consumers can access any VizEntry member on any id.
// `satisfies` above only validates `registry`; it does not widen its type,
// so a bare `export const VIZ = {...} satisfies ...` would make omitted
// optional fields (like `maxFrames`) absent from the value type entirely.
export const VIZ: Record<VizId, VizEntry<any, any>> = registry;
