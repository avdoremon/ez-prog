# RunnableCode Rollout to Remaining 26 Lessons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate every remaining lesson's `## Try it` section from a static
fenced code block to a live `<RunnableCode>` editor, completing the rollout
that `docs/superpowers/plans/2026-08-27-code-runner-tier1.md` deliberately
scoped down to two pilot lessons (`data-structures/array.mdx`,
`algorithms/recursion.mdx`).

**Architecture:** No new engine code. `RunnableCode`
(`apps/web/src/components/RunnableCode.tsx`) and the Web Worker sandbox
(`apps/web/src/lib/runner/`) already exist and are unmodified by this plan —
every task here only touches lesson `.mdx` files (content) and, in the final
task, the e2e suite. Each lesson's existing `## Try it` fenced `js` block
already defines the right function(s); this plan adds one small invocation
beneath each so the runner has something to show (a bare expression for a
`=>` return-value line, or `console.log` calls for output lines — matching
the two styles `array.mdx`/`recursion.mdx` already established), then swaps
the fence for `<RunnableCode lang="js" client:visible source={...} />`.

**Tech Stack:** Astro/MDX, React 19, the existing `RunnableCode` component —
no new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-24-code-runner-design.md` (the
runner itself). `docs/AUTHORING.md` §4.9 documents the `<RunnableCode>`
authoring convention this plan follows exactly — read it before Task 1 if
anything below is ambiguous.

## Global Constraints

- **Every lesson touched here is already at or within ~10 words of the
  700-word `prose-word-limit` budget** (`scripts/lint-content.ts`, `WORD_LIMIT
  = 700`). Measured directly against the current repo on 2026-09-08 (see
  table below). Unlike a triple-backtick fence, a `<RunnableCode
  source={\`...\`}>` template literal is **not** stripped by
  `stripCodeBlocks()` before the word count — every identifier, operator, and
  brace inside it counts as a "word" (`text.split(/\s+/)`). Adding the
  invocation line(s) below the existing function will push essentially every
  lesson in this plan over budget. **This is expected, not a sign something
  is wrong** — `docs/AUTHORING.md` §4.9 calls this out as the normal cost of
  adding a `<RunnableCode>` block, and it is exactly what happened when
  `array.mdx`/`recursion.mdx` were migrated (both landed at 691/611 words,
  under budget only because their prose was already trimmed for this).
- **Fixed per-task word-budget procedure** (do this instead of guessing at
  cuts up front): after Step 2 of each task, run `pnpm lint:content`. If it
  reports `prose-word-limit` for the lesson you just touched, trim words from
  that lesson's **`## Trade-offs` section first** (tighten wordy clauses,
  cut a redundant sentence) — never the `## Check your understanding`
  questions, their answers, or the `## Practice` link, since those are the
  parts most likely to be referenced by a learner mid-quiz. Re-run
  `pnpm lint:content` after each cut until the file passes. If `##
  Trade-offs` alone cannot absorb the cut without gutting its point, trim
  `## How it works` next, using the same rule (tighten, don't delete a whole
  idea).
- Every `<RunnableCode>` tag uses `lang="js" client:visible` — **`client:visible`
  is required**, omitting it silently ships a dead, unhydrated editor (see
  `docs/AUTHORING.md` §4.9 and "Decisions the spec left open" item 3 in the
  Tier 1 plan).
- No file under `packages/` is touched by this plan. No file under
  `apps/web/src/lib/runner/` or `apps/web/src/components/RunnableCode.tsx`
  is touched either — the component and runner are already correct and
  unmodified.
- Import line to add to every file (exactly, right after the existing `Viz`
  import): `import RunnableCode from '../../../components/RunnableCode.tsx';`
- Do not change `## How it works`/`## Trade-offs` prose content beyond the
  word-budget trims above — this plan's job is the `## Try it` migration, not
  a content rewrite.

**Current prose word count per lesson (2026-09-08, `pnpm lint:content`'s own
counting method, code fences excluded), for calibrating trims:**

| Lesson | Words | Lesson | Words |
|---|---|---|---|
| algorithms/binary-search.mdx | 528 | algorithms/insertion-sort.mdx | 698 |
| complexity/big-o.mdx | 590 | algorithms/merge-sort.mdx | 698 |
| algorithms/bubble-sort.mdx | 605 | algorithms/selection-sort.mdx | 699 |
| data-structures/stack.mdx | 630 | algorithms/greedy.mdx | 700 |
| data-structures/trie.mdx | 640 | complexity/amortized-analysis.mdx | 700 |
| algorithms/two-pointer.mdx | 658 | data-structures/bst.mdx | 700 |
| algorithms/dynamic-programming.mdx | 674 | data-structures/hash-table.mdx | 700 |
| data-structures/linked-list.mdx | 674 | data-structures/queue.mdx | 700 |
| algorithms/bfs.mdx | 683 | | |
| data-structures/heap.mdx | 687 | | |
| data-structures/tree.mdx | 687 | | |
| algorithms/dfs.mdx | 689 | | |
| complexity/best-average-worst-case.mdx | 690 | | |
| algorithms/sliding-window.mdx | 691 | | |
| algorithms/linear-search.mdx | 693 | | |
| algorithms/dijkstra.mdx | 694 | | |
| data-structures/graph.mdx | 696 | | |
| algorithms/quick-sort.mdx | 697 | | |

---

### Task 1: Migrate `algorithms/bfs.mdx`

**Files:** Modify `apps/web/src/content/docs/algorithms/bfs.mdx`

- [ ] **Step 1: Add the import**

old_string:
```
import Viz from '../../../components/Viz.astro';
```
new_string:
```
import Viz from '../../../components/Viz.astro';
import RunnableCode from '../../../components/RunnableCode.tsx';
```

- [ ] **Step 2: Replace the Try it block**

old_string:
````
## Try it

```js
function bfs(adj, start) {
  const seen = new Set([start]);
  const queue = [start], order = [];
  while (queue.length > 0) {
    const node = queue.shift();
    order.push(node);
    for (const next of adj[node]) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return order;
}
```
````

new_string:
````
## Try it

<RunnableCode lang="js" client:visible source={`function bfs(adj, start) {
  const seen = new Set([start]);
  const queue = [start], order = [];
  while (queue.length > 0) {
    const node = queue.shift();
    order.push(node);
    for (const next of adj[node]) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return order;
}

const adj = [[1, 2], [0, 3], [0, 3], [1, 2, 4], [3]];
bfs(adj, 0);
`} />
````

- [ ] **Step 3: Verify content lint and trim if needed**

Run: `pnpm lint:content`
Expected: eventually exits 0 with `Content lint passed.` If it first reports
`prose-word-limit` for `bfs.mdx`, apply the Global Constraints trim procedure
to `bfs.mdx`'s `## Trade-offs` section and re-run until clean.

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/content/docs/algorithms/bfs.mdx
git commit -m "feat: migrate the bfs lesson to RunnableCode"
```

---

### Task 2: Migrate `algorithms/binary-search.mdx`

**Files:** Modify `apps/web/src/content/docs/algorithms/binary-search.mdx`

- [ ] **Step 1: Add the import** (same pattern as Task 1, Step 1, this file)

- [ ] **Step 2: Replace the Try it block**

old_string:
````
## Try it

```js
function binarySearch(arr, target) {
  let lo = 0, hi = arr.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}
```
````

new_string:
````
## Try it

<RunnableCode lang="js" client:visible source={`function binarySearch(arr, target) {
  let lo = 0, hi = arr.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}

binarySearch([3, 7, 7, 7, 12, 19, 25], 19);
`} />
````

- [ ] **Step 3: Verify content lint** — `pnpm lint:content` (this lesson has
  172 words of headroom before Step 2; unlikely to need a trim, but follow
  the Global Constraints procedure if it does).

- [ ] **Step 4: Typecheck** — `pnpm typecheck`, expect exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/content/docs/algorithms/binary-search.mdx
git commit -m "feat: migrate the binary-search lesson to RunnableCode"
```

---

### Task 3: Migrate `algorithms/bubble-sort.mdx`

**Files:** Modify `apps/web/src/content/docs/algorithms/bubble-sort.mdx`

- [ ] **Step 1: Add the import**

- [ ] **Step 2: Replace the Try it block**

old_string:
````
## Try it

```js
function bubbleSort(arr) {
  arr = [...arr];
  for (let i = 0; i < arr.length - 1; i++) {
    let swapped = false;
    for (let j = 0; j < arr.length - 1 - i; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        swapped = true;
      }
    }
    if (!swapped) break;
  }
  return arr;
}
```
````

new_string:
````
## Try it

<RunnableCode lang="js" client:visible source={`function bubbleSort(arr) {
  arr = [...arr];
  for (let i = 0; i < arr.length - 1; i++) {
    let swapped = false;
    for (let j = 0; j < arr.length - 1 - i; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        swapped = true;
      }
    }
    if (!swapped) break;
  }
  return arr;
}

bubbleSort([5, 2, 9, 1, 7, 3]);
`} />
````

- [ ] **Step 3: Verify content lint** — `pnpm lint:content`, trim per Global
  Constraints if needed.

- [ ] **Step 4: Typecheck** — `pnpm typecheck`, expect exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/content/docs/algorithms/bubble-sort.mdx
git commit -m "feat: migrate the bubble-sort lesson to RunnableCode"
```

---

### Task 4: Migrate `algorithms/dfs.mdx`

**Files:** Modify `apps/web/src/content/docs/algorithms/dfs.mdx`

- [ ] **Step 1: Add the import**

- [ ] **Step 2: Replace the Try it block**

old_string:
````
## Try it

```js
function dfs(adj, start) {
  const seen = new Set([start]);
  const stack = [start], order = [];
  while (stack.length > 0) {
    const node = stack.pop();
    order.push(node);
    for (const next of adj[node]) {
      if (seen.has(next)) continue;
      seen.add(next);
      stack.push(next);
    }
  }
  return order;
}
```
````

new_string:
````
## Try it

<RunnableCode lang="js" client:visible source={`function dfs(adj, start) {
  const seen = new Set([start]);
  const stack = [start], order = [];
  while (stack.length > 0) {
    const node = stack.pop();
    order.push(node);
    for (const next of adj[node]) {
      if (seen.has(next)) continue;
      seen.add(next);
      stack.push(next);
    }
  }
  return order;
}

const adj = [[1, 2], [0, 3], [0, 3], [1, 2, 4], [3]];
dfs(adj, 0);
`} />
````

- [ ] **Step 3: Verify content lint** — `pnpm lint:content`, trim per Global
  Constraints if needed.

- [ ] **Step 4: Typecheck** — `pnpm typecheck`, expect exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/content/docs/algorithms/dfs.mdx
git commit -m "feat: migrate the dfs lesson to RunnableCode"
```

---

### Task 5: Migrate `algorithms/dijkstra.mdx`

**Files:** Modify `apps/web/src/content/docs/algorithms/dijkstra.mdx`

- [ ] **Step 1: Add the import**

- [ ] **Step 2: Replace the Try it block**

old_string:
````
## Try it

```js
function dijkstra(adj, start, n) {
  const dist = Array(n).fill(Infinity), settled = new Set();
  dist[start] = 0;
  for (;;) {
    let node = -1;
    for (let i = 0; i < n; i++) {
      if (settled.has(i)) continue;
      if (node < 0 || dist[i] < dist[node]) node = i;
    }
    if (node < 0 || dist[node] === Infinity) break;
    settled.add(node);
    for (const { to, weight } of adj[node]) {
      const via = dist[node] + weight;
      if (settled.has(to) || via >= dist[to]) continue;
      dist[to] = via;
    }
  }
  return dist;
}
```
````

new_string:
````
## Try it

<RunnableCode lang="js" client:visible source={`function dijkstra(adj, start, n) {
  const dist = Array(n).fill(Infinity), settled = new Set();
  dist[start] = 0;
  for (;;) {
    let node = -1;
    for (let i = 0; i < n; i++) {
      if (settled.has(i)) continue;
      if (node < 0 || dist[i] < dist[node]) node = i;
    }
    if (node < 0 || dist[node] === Infinity) break;
    settled.add(node);
    for (const { to, weight } of adj[node]) {
      const via = dist[node] + weight;
      if (settled.has(to) || via >= dist[to]) continue;
      dist[to] = via;
    }
  }
  return dist;
}

const adj = [
  [{ to: 1, weight: 4 }, { to: 2, weight: 1 }],
  [{ to: 3, weight: 1 }],
  [{ to: 1, weight: 2 }, { to: 3, weight: 5 }],
  [],
];
dijkstra(adj, 0, 4);
`} />
````

- [ ] **Step 3: Verify content lint** — `pnpm lint:content`, trim per Global
  Constraints if needed (this lesson starts closest to budget of the graph
  lessons — 6 words of headroom — a trim is likely required).

- [ ] **Step 4: Typecheck** — `pnpm typecheck`, expect exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/content/docs/algorithms/dijkstra.mdx
git commit -m "feat: migrate the dijkstra lesson to RunnableCode"
```

---

### Task 6: Migrate `algorithms/dynamic-programming.mdx`

**Files:** Modify `apps/web/src/content/docs/algorithms/dynamic-programming.mdx`

- [ ] **Step 1: Add the import**

- [ ] **Step 2: Replace the Try it block**

old_string:
````
## Try it

```js
function fib(n) {
  const dp = new Array(n + 1);
  dp[0] = 0;
  if (n >= 1) dp[1] = 1;
  for (let i = 2; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];
  }
  return dp[n];
}
```
````

new_string:
````
## Try it

<RunnableCode lang="js" client:visible source={`function fib(n) {
  const dp = new Array(n + 1);
  dp[0] = 0;
  if (n >= 1) dp[1] = 1;
  for (let i = 2; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2];
  }
  return dp[n];
}

fib(10);
`} />
````

- [ ] **Step 3: Verify content lint** — `pnpm lint:content`, trim per Global
  Constraints if needed.

- [ ] **Step 4: Typecheck** — `pnpm typecheck`, expect exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/content/docs/algorithms/dynamic-programming.mdx
git commit -m "feat: migrate the dynamic-programming lesson to RunnableCode"
```

---

### Task 7: Migrate `algorithms/greedy.mdx`

**Files:** Modify `apps/web/src/content/docs/algorithms/greedy.mdx`

- [ ] **Step 1: Add the import**

- [ ] **Step 2: Replace the Try it block**

old_string:
````
## Try it

```js
function greedyCoins(coins, amount) {
  const sorted = [...coins].sort((a, b) => b - a);
  let remaining = amount, used = 0;
  for (const coin of sorted) {
    while (coin <= remaining) {
      remaining -= coin;
      used++;
    }
  }
  return remaining === 0 ? used : null;
}
```
````

new_string:
````
## Try it

<RunnableCode lang="js" client:visible source={`function greedyCoins(coins, amount) {
  const sorted = [...coins].sort((a, b) => b - a);
  let remaining = amount, used = 0;
  for (const coin of sorted) {
    while (coin <= remaining) {
      remaining -= coin;
      used++;
    }
  }
  return remaining === 0 ? used : null;
}

greedyCoins([25, 10, 5, 1], 41);
`} />
````

- [ ] **Step 3: Verify content lint** — `pnpm lint:content`. This lesson is
  already at the 700-word cap, so a trim to `## Trade-offs` (per Global
  Constraints) is required here.

- [ ] **Step 4: Typecheck** — `pnpm typecheck`, expect exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/content/docs/algorithms/greedy.mdx
git commit -m "feat: migrate the greedy lesson to RunnableCode"
```

---

### Task 8: Migrate `algorithms/insertion-sort.mdx`

**Files:** Modify `apps/web/src/content/docs/algorithms/insertion-sort.mdx`

- [ ] **Step 1: Add the import**

- [ ] **Step 2: Replace the Try it block**

old_string:
````
## Try it

```js
function insertionSort(arr) {
  arr = [...arr];
  for (let i = 1; i < arr.length; i++) {
    const key = arr[i];
    let j = i - 1;
    while (j >= 0 && arr[j] > key) {
      arr[j + 1] = arr[j];
      j--;
    }
    arr[j + 1] = key;
  }
  return arr;
}
```
````

new_string:
````
## Try it

<RunnableCode lang="js" client:visible source={`function insertionSort(arr) {
  arr = [...arr];
  for (let i = 1; i < arr.length; i++) {
    const key = arr[i];
    let j = i - 1;
    while (j >= 0 && arr[j] > key) {
      arr[j + 1] = arr[j];
      j--;
    }
    arr[j + 1] = key;
  }
  return arr;
}

insertionSort([5, 2, 9, 1, 7, 3]);
`} />
````

- [ ] **Step 3: Verify content lint** — `pnpm lint:content`, trim (Global
  Constraints) — this lesson has 2 words of headroom, a trim is required.

- [ ] **Step 4: Typecheck** — `pnpm typecheck`, expect exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/content/docs/algorithms/insertion-sort.mdx
git commit -m "feat: migrate the insertion-sort lesson to RunnableCode"
```

---

### Task 9: Migrate `algorithms/linear-search.mdx`

**Files:** Modify `apps/web/src/content/docs/algorithms/linear-search.mdx`

- [ ] **Step 1: Add the import**

- [ ] **Step 2: Replace the Try it block**

old_string:
````
## Try it

```js
function linearSearch(arr, target) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === target) return i;
  }
  return -1;
}
```
````

new_string:
````
## Try it

<RunnableCode lang="js" client:visible source={`function linearSearch(arr, target) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === target) return i;
  }
  return -1;
}

linearSearch([4, 8, 15, 16, 23, 42], 23);
`} />
````

- [ ] **Step 3: Verify content lint** — `pnpm lint:content`, trim per Global
  Constraints if needed.

- [ ] **Step 4: Typecheck** — `pnpm typecheck`, expect exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/content/docs/algorithms/linear-search.mdx
git commit -m "feat: migrate the linear-search lesson to RunnableCode"
```

---

### Task 10: Migrate `algorithms/merge-sort.mdx`

**Files:** Modify `apps/web/src/content/docs/algorithms/merge-sort.mdx`

- [ ] **Step 1: Add the import**

- [ ] **Step 2: Replace the Try it block**

old_string:
````
## Try it

```js
function mergeSort(arr, lo = 0, hi = arr.length - 1) {
  if (lo >= hi) return arr;
  const mid = (lo + hi) >> 1;
  mergeSort(arr, lo, mid);
  mergeSort(arr, mid + 1, hi);
  const left = arr.slice(lo, mid + 1);
  const right = arr.slice(mid + 1, hi + 1);
  let i = 0, j = 0, k = lo;
  while (i < left.length && j < right.length) {
    arr[k++] = left[i] <= right[j] ? left[i++] : right[j++];
  }
  while (i < left.length) arr[k++] = left[i++];
  while (j < right.length) arr[k++] = right[j++];
  return arr;
}
```
````

new_string:
````
## Try it

<RunnableCode lang="js" client:visible source={`function mergeSort(arr, lo = 0, hi = arr.length - 1) {
  if (lo >= hi) return arr;
  const mid = (lo + hi) >> 1;
  mergeSort(arr, lo, mid);
  mergeSort(arr, mid + 1, hi);
  const left = arr.slice(lo, mid + 1);
  const right = arr.slice(mid + 1, hi + 1);
  let i = 0, j = 0, k = lo;
  while (i < left.length && j < right.length) {
    arr[k++] = left[i] <= right[j] ? left[i++] : right[j++];
  }
  while (i < left.length) arr[k++] = left[i++];
  while (j < right.length) arr[k++] = right[j++];
  return arr;
}

mergeSort([5, 2, 9, 1, 7, 3]);
`} />
````

- [ ] **Step 3: Verify content lint** — `pnpm lint:content`, trim (Global
  Constraints) — this lesson has 2 words of headroom, a trim is required.

- [ ] **Step 4: Typecheck** — `pnpm typecheck`, expect exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/content/docs/algorithms/merge-sort.mdx
git commit -m "feat: migrate the merge-sort lesson to RunnableCode"
```

---

### Task 11: Migrate `algorithms/quick-sort.mdx`

**Files:** Modify `apps/web/src/content/docs/algorithms/quick-sort.mdx`

- [ ] **Step 1: Add the import**

- [ ] **Step 2: Replace the Try it block**

old_string:
````
## Try it

```js
function quickSort(arr, lo = 0, hi = arr.length - 1) {
  if (lo >= hi) return arr;
  const pivot = arr[hi];
  let small = lo;
  for (let i = lo; i < hi; i++) {
    if (arr[i] < pivot) {
      [arr[small], arr[i]] = [arr[i], arr[small]];
      small++;
    }
  }
  [arr[small], arr[hi]] = [arr[hi], arr[small]];
  quickSort(arr, lo, small - 1);
  quickSort(arr, small + 1, hi);
  return arr;
}
```
````

new_string:
````
## Try it

<RunnableCode lang="js" client:visible source={`function quickSort(arr, lo = 0, hi = arr.length - 1) {
  if (lo >= hi) return arr;
  const pivot = arr[hi];
  let small = lo;
  for (let i = lo; i < hi; i++) {
    if (arr[i] < pivot) {
      [arr[small], arr[i]] = [arr[i], arr[small]];
      small++;
    }
  }
  [arr[small], arr[hi]] = [arr[hi], arr[small]];
  quickSort(arr, lo, small - 1);
  quickSort(arr, small + 1, hi);
  return arr;
}

quickSort([5, 2, 9, 1, 7, 3]);
`} />
````

- [ ] **Step 3: Verify content lint** — `pnpm lint:content`, trim (Global
  Constraints) — this lesson has 3 words of headroom, a trim is required.

- [ ] **Step 4: Typecheck** — `pnpm typecheck`, expect exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/content/docs/algorithms/quick-sort.mdx
git commit -m "feat: migrate the quick-sort lesson to RunnableCode"
```

---

### Task 12: Migrate `algorithms/selection-sort.mdx`

**Files:** Modify `apps/web/src/content/docs/algorithms/selection-sort.mdx`

- [ ] **Step 1: Add the import**

- [ ] **Step 2: Replace the Try it block**

old_string:
````
## Try it

```js
function selectionSort(arr) {
  arr = [...arr];
  for (let i = 0; i < arr.length - 1; i++) {
    let min = i;
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[j] < arr[min]) min = j;
    }
    if (min !== i) [arr[i], arr[min]] = [arr[min], arr[i]];
  }
  return arr;
}
```
````

new_string:
````
## Try it

<RunnableCode lang="js" client:visible source={`function selectionSort(arr) {
  arr = [...arr];
  for (let i = 0; i < arr.length - 1; i++) {
    let min = i;
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[j] < arr[min]) min = j;
    }
    if (min !== i) [arr[i], arr[min]] = [arr[min], arr[i]];
  }
  return arr;
}

selectionSort([5, 2, 9, 1, 7, 3]);
`} />
````

- [ ] **Step 3: Verify content lint** — `pnpm lint:content`, trim (Global
  Constraints) — this lesson has 1 word of headroom, a trim is required.

- [ ] **Step 4: Typecheck** — `pnpm typecheck`, expect exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/content/docs/algorithms/selection-sort.mdx
git commit -m "feat: migrate the selection-sort lesson to RunnableCode"
```

---

### Task 13: Migrate `algorithms/sliding-window.mdx`

**Files:** Modify `apps/web/src/content/docs/algorithms/sliding-window.mdx`

- [ ] **Step 1: Add the import**

- [ ] **Step 2: Replace the Try it block**

old_string:
````
## Try it

```js
function maxWindowSum(arr, k) {
  let sum = 0;
  for (let i = 0; i < k; i++) sum += arr[i];
  let best = sum, bestStart = 0;
  for (let i = k; i < arr.length; i++) {
    sum += arr[i] - arr[i - k];
    if (sum > best) {
      best = sum;
      bestStart = i - k + 1;
    }
  }
  return { best, bestStart };
}
```
````

new_string:
````
## Try it

<RunnableCode lang="js" client:visible source={`function maxWindowSum(arr, k) {
  let sum = 0;
  for (let i = 0; i < k; i++) sum += arr[i];
  let best = sum, bestStart = 0;
  for (let i = k; i < arr.length; i++) {
    sum += arr[i] - arr[i - k];
    if (sum > best) {
      best = sum;
      bestStart = i - k + 1;
    }
  }
  return { best, bestStart };
}

maxWindowSum([2, 1, 5, 1, 3, 2], 3);
`} />
````

- [ ] **Step 3: Verify content lint** — `pnpm lint:content`, trim per Global
  Constraints if needed.

- [ ] **Step 4: Typecheck** — `pnpm typecheck`, expect exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/content/docs/algorithms/sliding-window.mdx
git commit -m "feat: migrate the sliding-window lesson to RunnableCode"
```

---

### Task 14: Migrate `algorithms/two-pointer.mdx`

**Files:** Modify `apps/web/src/content/docs/algorithms/two-pointer.mdx`

- [ ] **Step 1: Add the import**

- [ ] **Step 2: Replace the Try it block**

old_string:
````
## Try it

```js
function twoSumSorted(arr, target) {
  let lo = 0, hi = arr.length - 1;
  while (lo < hi) {
    const sum = arr[lo] + arr[hi];
    if (sum === target) return [lo, hi];
    if (sum < target) lo++;
    else hi--;
  }
  return null;
}
```
````

new_string:
````
## Try it

<RunnableCode lang="js" client:visible source={`function twoSumSorted(arr, target) {
  let lo = 0, hi = arr.length - 1;
  while (lo < hi) {
    const sum = arr[lo] + arr[hi];
    if (sum === target) return [lo, hi];
    if (sum < target) lo++;
    else hi--;
  }
  return null;
}

twoSumSorted([2, 4, 7, 11, 15], 15);
`} />
````

- [ ] **Step 3: Verify content lint** — `pnpm lint:content`, trim per Global
  Constraints if needed.

- [ ] **Step 4: Typecheck** — `pnpm typecheck`, expect exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/content/docs/algorithms/two-pointer.mdx
git commit -m "feat: migrate the two-pointer lesson to RunnableCode"
```

---

### Task 15: Migrate `data-structures/bst.mdx`

**Files:** Modify `apps/web/src/content/docs/data-structures/bst.mdx`

- [ ] **Step 1: Add the import**

- [ ] **Step 2: Replace the Try it block**

old_string:
````
## Try it

```js
function bstSearch(tree, target) {
  let i = 0;
  while (i < tree.length) {
    if (target === tree[i]) return i;
    i = target < tree[i] ? 2 * i + 1 : 2 * i + 2;
  }
  return -1;
}
```
````

new_string:
````
## Try it

<RunnableCode lang="js" client:visible source={`function bstSearch(tree, target) {
  let i = 0;
  while (i < tree.length) {
    if (target === tree[i]) return i;
    i = target < tree[i] ? 2 * i + 1 : 2 * i + 2;
  }
  return -1;
}

bstSearch([8, 3, 10, 1, 6, 9, 14], 6);
`} />
````

- [ ] **Step 3: Verify content lint** — `pnpm lint:content`. This lesson is
  already at the 700-word cap, so a trim to `## Trade-offs` (per Global
  Constraints) is required here.

- [ ] **Step 4: Typecheck** — `pnpm typecheck`, expect exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/content/docs/data-structures/bst.mdx
git commit -m "feat: migrate the bst lesson to RunnableCode"
```

---

### Task 16: Migrate `data-structures/graph.mdx`

**Files:** Modify `apps/web/src/content/docs/data-structures/graph.mdx`

- [ ] **Step 1: Add the import**

- [ ] **Step 2: Replace the Try it block**

old_string:
````
## Try it

```js
function describe(values, edges, directed) {
  const adj = values.map(() => []);
  for (const { from, to } of edges) {
    adj[from].push(to);
    if (!directed) adj[to].push(from);
  }
  return { adj, degrees: adj.map((a) => a.length) };
}
```
````

new_string:
````
## Try it

<RunnableCode lang="js" client:visible source={`function describe(values, edges, directed) {
  const adj = values.map(() => []);
  for (const { from, to } of edges) {
    adj[from].push(to);
    if (!directed) adj[to].push(from);
  }
  return { adj, degrees: adj.map((a) => a.length) };
}

const edges = [{ from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 3, to: 0 }];
describe(['a', 'b', 'c', 'd'], edges, false);
`} />
````

- [ ] **Step 3: Verify content lint** — `pnpm lint:content`, trim per Global
  Constraints if needed.

- [ ] **Step 4: Typecheck** — `pnpm typecheck`, expect exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/content/docs/data-structures/graph.mdx
git commit -m "feat: migrate the graph lesson to RunnableCode"
```

---

### Task 17: Migrate `data-structures/hash-table.mdx`

**Files:** Modify `apps/web/src/content/docs/data-structures/hash-table.mdx`

**Note:** unlike every other lesson in this plan, this file's `## Try it`
fence shows two **class method bodies** (`insert(key) { ... }` and `has(key)
{ ... }`) referencing `this.capacity`/`this.slots` — not valid standalone JS.
Wrap them in the `class HashTable` they clearly belong to (implied by `##
How it works`'s description of the same structure), so the runnable version
is self-contained.

- [ ] **Step 1: Add the import**

- [ ] **Step 2: Replace the Try it block**

old_string:
````
## Try it

```js
insert(key) {
  let i = key % this.capacity;
  for (let n = 0; n < this.capacity; n++) {
    if (this.slots[i] === null) {
      this.slots[i] = key;
      return true;
    }
    if (this.slots[i] === key) return true;
    i = (i + 1) % this.capacity;
  }
  return false;
}

has(key) {
  let i = key % this.capacity;
  for (let n = 0; n < this.capacity; n++) {
    if (this.slots[i] === key) return true;
    if (this.slots[i] === null) return false;
    i = (i + 1) % this.capacity;
  }
  return false;
}
```
````

new_string:
````
## Try it

<RunnableCode lang="js" client:visible source={`class HashTable {
  constructor(capacity) {
    this.capacity = capacity;
    this.slots = new Array(capacity).fill(null);
  }

  insert(key) {
    let i = key % this.capacity;
    for (let n = 0; n < this.capacity; n++) {
      if (this.slots[i] === null) {
        this.slots[i] = key;
        return true;
      }
      if (this.slots[i] === key) return true;
      i = (i + 1) % this.capacity;
    }
    return false;
  }

  has(key) {
    let i = key % this.capacity;
    for (let n = 0; n < this.capacity; n++) {
      if (this.slots[i] === key) return true;
      if (this.slots[i] === null) return false;
      i = (i + 1) % this.capacity;
    }
    return false;
  }
}

const table = new HashTable(7);
for (const key of [12, 19, 26]) table.insert(key);
console.log('slots', table.slots);
console.log('has 19', table.has(19));
console.log('has 20', table.has(20));
`} />
````

- [ ] **Step 3: Verify content lint** — `pnpm lint:content`. This lesson is
  already at the 700-word cap and the `class` wrapper adds real words, so a
  trim to `## Trade-offs` (per Global Constraints) is required here.

- [ ] **Step 4: Typecheck** — `pnpm typecheck`, expect exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/content/docs/data-structures/hash-table.mdx
git commit -m "feat: migrate the hash-table lesson to RunnableCode"
```

---

### Task 18: Migrate `data-structures/heap.mdx`

**Files:** Modify `apps/web/src/content/docs/data-structures/heap.mdx`

- [ ] **Step 1: Add the import**

- [ ] **Step 2: Replace the Try it block**

old_string:
````
## Try it

```js
function heapInsert(heap, value) {
  heap.push(value);
  let i = heap.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (heap[p] >= heap[i]) break;
    [heap[p], heap[i]] = [heap[i], heap[p]];
    i = p;
  }
  return heap;
}
```
````

new_string:
````
## Try it

<RunnableCode lang="js" client:visible source={`function heapInsert(heap, value) {
  heap.push(value);
  let i = heap.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (heap[p] >= heap[i]) break;
    [heap[p], heap[i]] = [heap[i], heap[p]];
    i = p;
  }
  return heap;
}

heapInsert([9, 5, 6, 2, 3], 8);
`} />
````

- [ ] **Step 3: Verify content lint** — `pnpm lint:content`, trim per Global
  Constraints if needed.

- [ ] **Step 4: Typecheck** — `pnpm typecheck`, expect exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/content/docs/data-structures/heap.mdx
git commit -m "feat: migrate the heap lesson to RunnableCode"
```

---

### Task 19: Migrate `data-structures/linked-list.mdx`

**Files:** Modify `apps/web/src/content/docs/data-structures/linked-list.mdx`

**Note:** the existing function returns `{ found, head }`, where `head` is a
linked node chain — logging the whole chain via a bare `=>` return value
would `JSON.stringify` a deeply nested object and read poorly. Add two small
helpers (`makeList`, `toArray`) and finish with `console.log` calls instead,
matching `recursion.mdx`'s console-output style.

- [ ] **Step 1: Add the import**

- [ ] **Step 2: Replace the Try it block**

old_string:
````
## Try it

```js
function readThenInsert(head, readIndex, insertAt, value) {
  let node = head;
  for (let i = 0; i < readIndex; i++) node = node.next;
  const found = node.value;

  let prev = null;
  let cur = head;
  for (let i = 0; i < insertAt; i++) {
    prev = cur;
    cur = cur.next;
  }
  const fresh = { value, next: cur };
  if (prev) prev.next = fresh;
  else head = fresh;

  return { found, head };
}
```
````

new_string:
````
## Try it

<RunnableCode lang="js" client:visible source={`function readThenInsert(head, readIndex, insertAt, value) {
  let node = head;
  for (let i = 0; i < readIndex; i++) node = node.next;
  const found = node.value;

  let prev = null;
  let cur = head;
  for (let i = 0; i < insertAt; i++) {
    prev = cur;
    cur = cur.next;
  }
  const fresh = { value, next: cur };
  if (prev) prev.next = fresh;
  else head = fresh;

  return { found, head };
}

function makeList(values) {
  let head = null;
  for (let i = values.length - 1; i >= 0; i--) head = { value: values[i], next: head };
  return head;
}

function toArray(head) {
  const out = [];
  for (let node = head; node; node = node.next) out.push(node.value);
  return out;
}

const list = makeList([4, 8, 15, 16, 23]);
const result = readThenInsert(list, 2, 1, 99);
console.log('found', result.found);
console.log('list now', toArray(result.head));
`} />
````

- [ ] **Step 3: Verify content lint** — `pnpm lint:content`, trim per Global
  Constraints if needed (the helpers add real words; a trim is likely).

- [ ] **Step 4: Typecheck** — `pnpm typecheck`, expect exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/content/docs/data-structures/linked-list.mdx
git commit -m "feat: migrate the linked-list lesson to RunnableCode"
```

---

### Task 20: Migrate `data-structures/queue.mdx`

**Files:** Modify `apps/web/src/content/docs/data-structures/queue.mdx`

- [ ] **Step 1: Add the import**

- [ ] **Step 2: Replace the Try it block**

old_string:
````
## Try it

```js
function runQueue(ops) {
  const queue = [];
  let head = 0;
  for (const op of ops) {
    if (op !== null) queue.push(op);
    else if (head < queue.length) head++;
  }
  return queue.slice(head);
}
```
````

new_string:
````
## Try it

<RunnableCode lang="js" client:visible source={`function runQueue(ops) {
  const queue = [];
  let head = 0;
  for (const op of ops) {
    if (op !== null) queue.push(op);
    else if (head < queue.length) head++;
  }
  return queue.slice(head);
}

runQueue([1, 2, 3, null, 4]);
`} />
````

- [ ] **Step 3: Verify content lint** — `pnpm lint:content`. This lesson is
  already at the 700-word cap, so a trim to `## Trade-offs` (per Global
  Constraints) is required here.

- [ ] **Step 4: Typecheck** — `pnpm typecheck`, expect exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/content/docs/data-structures/queue.mdx
git commit -m "feat: migrate the queue lesson to RunnableCode"
```

---

### Task 21: Migrate `data-structures/stack.mdx`

**Files:** Modify `apps/web/src/content/docs/data-structures/stack.mdx`

- [ ] **Step 1: Add the import**

- [ ] **Step 2: Replace the Try it block**

old_string:
````
## Try it

```js
function runStack(ops) {
  const stack = [];
  for (const op of ops) {
    if (op !== null) stack.push(op);
    else if (stack.length > 0) stack.pop();
  }
  return stack;
}
```
````

new_string:
````
## Try it

<RunnableCode lang="js" client:visible source={`function runStack(ops) {
  const stack = [];
  for (const op of ops) {
    if (op !== null) stack.push(op);
    else if (stack.length > 0) stack.pop();
  }
  return stack;
}

runStack([4, 8, 15, null, 16]);
`} />
````

- [ ] **Step 3: Verify content lint** — `pnpm lint:content`, trim per Global
  Constraints if needed.

- [ ] **Step 4: Typecheck** — `pnpm typecheck`, expect exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/content/docs/data-structures/stack.mdx
git commit -m "feat: migrate the stack lesson to RunnableCode"
```

---

### Task 22: Migrate `data-structures/tree.mdx`

**Files:** Modify `apps/web/src/content/docs/data-structures/tree.mdx`

- [ ] **Step 1: Add the import**

- [ ] **Step 2: Replace the Try it block**

old_string:
````
## Try it

```js
function traverse(tree, order, i = 0, out = []) {
  if (i >= tree.length) return out;
  if (order === 'pre') out.push(tree[i]);
  traverse(tree, order, 2 * i + 1, out);
  if (order === 'in') out.push(tree[i]);
  traverse(tree, order, 2 * i + 2, out);
  if (order === 'post') out.push(tree[i]);
  return out;
}
```
````

new_string:
````
## Try it

<RunnableCode lang="js" client:visible source={`function traverse(tree, order, i = 0, out = []) {
  if (i >= tree.length) return out;
  if (order === 'pre') out.push(tree[i]);
  traverse(tree, order, 2 * i + 1, out);
  if (order === 'in') out.push(tree[i]);
  traverse(tree, order, 2 * i + 2, out);
  if (order === 'post') out.push(tree[i]);
  return out;
}

traverse([8, 3, 10, 1, 6, 9, 14], 'in');
`} />
````

- [ ] **Step 3: Verify content lint** — `pnpm lint:content`, trim per Global
  Constraints if needed.

- [ ] **Step 4: Typecheck** — `pnpm typecheck`, expect exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/content/docs/data-structures/tree.mdx
git commit -m "feat: migrate the tree lesson to RunnableCode"
```

---

### Task 23: Migrate `data-structures/trie.mdx`

**Files:** Modify `apps/web/src/content/docs/data-structures/trie.mdx`

**Note:** the existing function only inserts; add a `newNode`/`search` pair
so the runnable version can demonstrate the lesson's own headline claim
("searching `ca` does not return found" for a trie holding cat/car/cart).

- [ ] **Step 1: Add the import**

- [ ] **Step 2: Replace the Try it block**

old_string:
````
## Try it

```js
function insert(root, word) {
  let node = root;
  for (const ch of word) {
    if (!node.children.has(ch)) {
      node.children.set(ch, newNode());
    }
    node = node.children.get(ch);
  }
  node.isWord = true;
}
```
````

new_string:
````
## Try it

<RunnableCode lang="js" client:visible source={`function newNode() {
  return { children: new Map(), isWord: false };
}

function insert(root, word) {
  let node = root;
  for (const ch of word) {
    if (!node.children.has(ch)) {
      node.children.set(ch, newNode());
    }
    node = node.children.get(ch);
  }
  node.isWord = true;
}

function search(root, word) {
  let node = root;
  for (const ch of word) {
    if (!node.children.has(ch)) return false;
    node = node.children.get(ch);
  }
  return node.isWord;
}

const root = newNode();
for (const word of ['cat', 'car', 'cart']) insert(root, word);
console.log('cat', search(root, 'cat'));
console.log('ca', search(root, 'ca'));
console.log('cart', search(root, 'cart'));
`} />
````

- [ ] **Step 3: Verify content lint** — `pnpm lint:content`, trim per Global
  Constraints if needed (`search`/`newNode` add real words; a trim is
  likely).

- [ ] **Step 4: Typecheck** — `pnpm typecheck`, expect exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/content/docs/data-structures/trie.mdx
git commit -m "feat: migrate the trie lesson to RunnableCode"
```

---

### Task 24: Migrate `complexity/amortized-analysis.mdx`

**Files:** Modify `apps/web/src/content/docs/complexity/amortized-analysis.mdx`

- [ ] **Step 1: Add the import**

- [ ] **Step 2: Replace the Try it block**

old_string:
````
## Try it

```js
function push(arr, value) {
  if (arr.size === arr.capacity) {
    const bigger = new Array(arr.capacity * 2);
    for (let i = 0; i < arr.size; i++) bigger[i] = arr.data[i];
    arr.data = bigger;
    arr.capacity *= 2;
  }
  arr.data[arr.size++] = value;
  return arr;
}
```
````

new_string:
````
## Try it

<RunnableCode lang="js" client:visible source={`function push(arr, value) {
  if (arr.size === arr.capacity) {
    const bigger = new Array(arr.capacity * 2);
    for (let i = 0; i < arr.size; i++) bigger[i] = arr.data[i];
    arr.data = bigger;
    arr.capacity *= 2;
  }
  arr.data[arr.size++] = value;
  return arr;
}

const arr = { data: new Array(2), size: 0, capacity: 2 };
for (const value of [1, 2, 3, 4, 5]) push(arr, value);
arr.data.slice(0, arr.size);
`} />
````

- [ ] **Step 3: Verify content lint** — `pnpm lint:content`. This lesson is
  already at the 700-word cap, so a trim to `## Trade-offs` (per Global
  Constraints) is required here.

- [ ] **Step 4: Typecheck** — `pnpm typecheck`, expect exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/content/docs/complexity/amortized-analysis.mdx
git commit -m "feat: migrate the amortized-analysis lesson to RunnableCode"
```

---

### Task 25: Migrate `complexity/best-average-worst-case.mdx`

**Files:** Modify `apps/web/src/content/docs/complexity/best-average-worst-case.mdx`

**Note:** this lesson's existing `## Try it` fence already ends with real
invocations and `console.log` calls (unlike every other lesson in this
plan) — no new invocation line is needed, only the fence-to-component swap.

- [ ] **Step 1: Add the import**

- [ ] **Step 2: Replace the Try it block**

old_string:
````
## Try it

```js
function checksToFind(arr, target) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === target) return i + 1;
  }
  return arr.length;
}

const arr = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91];
const each = arr.map((v) => checksToFind(arr, v));
const total = each.reduce((a, b) => a + b, 0);

console.log('best   ', Math.min(...each));      // 1
console.log('worst  ', checksToFind(arr, 100)); // 10
console.log('average', total / each.length);    // 5.5
```
````

new_string:
````
## Try it

<RunnableCode lang="js" client:visible source={`function checksToFind(arr, target) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === target) return i + 1;
  }
  return arr.length;
}

const arr = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91];
const each = arr.map((v) => checksToFind(arr, v));
const total = each.reduce((a, b) => a + b, 0);

console.log('best', Math.min(...each));
console.log('worst', checksToFind(arr, 100));
console.log('average', total / each.length);
`} />
````

- [ ] **Step 3: Verify content lint** — `pnpm lint:content`, trim per Global
  Constraints if needed (this is the smallest change in the plan; unlikely
  to need one, but follow the procedure if it does).

- [ ] **Step 4: Typecheck** — `pnpm typecheck`, expect exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/content/docs/complexity/best-average-worst-case.mdx
git commit -m "feat: migrate the best-average-worst-case lesson to RunnableCode"
```

---

### Task 26: Migrate `complexity/big-o.mdx`

**Files:** Modify `apps/web/src/content/docs/complexity/big-o.mdx`

- [ ] **Step 1: Add the import**

- [ ] **Step 2: Replace the Try it block**

old_string:
````
## Try it

```js
function countedLinearSearch(arr, target) {
  let checked = 0;
  for (const value of arr) {
    checked++;
    if (value === target) return checked;
  }
  return checked;
}

function countedBinarySearch(arr, target) {
  let lo = 0, hi = arr.length - 1, checked = 0;
  while (lo <= hi) {
    checked++;
    const mid = (lo + hi) >> 1;
    if (arr[mid] === target) return checked;
    if (arr[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return checked;
}
```
````

new_string:
````
## Try it

<RunnableCode lang="js" client:visible source={`function countedLinearSearch(arr, target) {
  let checked = 0;
  for (const value of arr) {
    checked++;
    if (value === target) return checked;
  }
  return checked;
}

function countedBinarySearch(arr, target) {
  let lo = 0, hi = arr.length - 1, checked = 0;
  while (lo <= hi) {
    checked++;
    const mid = (lo + hi) >> 1;
    if (arr[mid] === target) return checked;
    if (arr[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return checked;
}

const arr = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91];
console.log('linear', countedLinearSearch(arr, 91));
console.log('binary', countedBinarySearch(arr, 91));
`} />
````

- [ ] **Step 3: Verify content lint** — `pnpm lint:content`, trim per Global
  Constraints if needed.

- [ ] **Step 4: Typecheck** — `pnpm typecheck`, expect exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/content/docs/complexity/big-o.mdx
git commit -m "feat: migrate the big-o lesson to RunnableCode"
```

---

### Task 27: E2E coverage for all 26 newly-migrated lessons, docs, full gate

**Files:**
- Modify: `apps/web/e2e/lesson.spec.ts`
- Modify: `docs/AUTHORING.md`

**Interfaces:**
- Consumes: `RUNNABLE_LESSONS`, `waitForRunnableCodeHydrated` (already
  defined in `lesson.spec.ts`, from the Tier 1 plan) — this task only
  extends the `RUNNABLE_LESSONS` array, which four existing `for` loops
  already iterate (Run/Reset output, axe-once-hydrated, CLS-once-hydrated).
  No new test loop is written; extending the array is sufficient.

- [ ] **Step 1: Extend `RUNNABLE_LESSONS` with all 26 migrated lessons**

old_string:
```ts
const RUNNABLE_LESSONS: { path: string; expectedText: string }[] = [
  { path: '/data-structures/array/', expectedText: '=> [4,9,8,15,16,23,42]' },
  { path: '/algorithms/recursion/', expectedText: '120' },
];
```

new_string:
```ts
const RUNNABLE_LESSONS: { path: string; expectedText: string }[] = [
  { path: '/data-structures/array/', expectedText: '=> [4,9,8,15,16,23,42]' },
  { path: '/algorithms/recursion/', expectedText: '120' },
  { path: '/algorithms/bfs/', expectedText: '=> [0,1,2,3,4]' },
  { path: '/algorithms/binary-search/', expectedText: '=> 5' },
  { path: '/algorithms/bubble-sort/', expectedText: '=> [1,2,3,5,7,9]' },
  { path: '/algorithms/dfs/', expectedText: '=> [0,2,3,4,1]' },
  { path: '/algorithms/dijkstra/', expectedText: '=> [0,3,1,4]' },
  { path: '/algorithms/dynamic-programming/', expectedText: '=> 55' },
  { path: '/algorithms/greedy/', expectedText: '=> 4' },
  { path: '/algorithms/insertion-sort/', expectedText: '=> [1,2,3,5,7,9]' },
  { path: '/algorithms/linear-search/', expectedText: '=> 4' },
  { path: '/algorithms/merge-sort/', expectedText: '=> [1,2,3,5,7,9]' },
  { path: '/algorithms/quick-sort/', expectedText: '=> [1,2,3,5,7,9]' },
  { path: '/algorithms/selection-sort/', expectedText: '=> [1,2,3,5,7,9]' },
  { path: '/algorithms/sliding-window/', expectedText: '"best":9' },
  { path: '/algorithms/two-pointer/', expectedText: '=> [1,3]' },
  { path: '/data-structures/bst/', expectedText: '=> 4' },
  { path: '/data-structures/graph/', expectedText: '"degrees":[2,2,2,2]' },
  { path: '/data-structures/hash-table/', expectedText: 'has 19 true' },
  { path: '/data-structures/heap/', expectedText: '=> [9,5,8,2,3,6]' },
  { path: '/data-structures/linked-list/', expectedText: 'list now [4,99,8,15,16,23]' },
  { path: '/data-structures/queue/', expectedText: '=> [2,3,4]' },
  { path: '/data-structures/stack/', expectedText: '=> [4,8,16]' },
  { path: '/data-structures/tree/', expectedText: '=> [1,3,6,8,9,10,14]' },
  { path: '/data-structures/trie/', expectedText: 'ca false' },
  { path: '/complexity/amortized-analysis/', expectedText: '=> [1,2,3,4,5]' },
  { path: '/complexity/best-average-worst-case/', expectedText: '5.5' },
  { path: '/complexity/big-o/', expectedText: 'binary 4' },
];
```

- [ ] **Step 2: Run the e2e suite**

Run: `pnpm build && pnpm test:e2e`
Expected: all tests pass, including the now 28-entry `RUNNABLE_LESSONS`
loops (Run/Reset, axe, CLS) plus the pre-existing `ALL_LESSONS` loops. If
any lesson's `expectedText` does not appear, re-derive it by hand-tracing
that lesson's Try it source (each was computed by hand above; a transcription
slip in the plan's exact numbers is more likely than a runner bug — cross
check against the pilot lessons' pattern before suspecting `RunnableCode`
itself) and fix the array entry, not the lesson's algorithm.

- [ ] **Step 3: Note the completed rollout in AUTHORING.md**

`docs/AUTHORING.md` §4.9 already documents the `<RunnableCode>` convention
generically (written when only the two pilots existed) — no convention text
needs to change. Add one sentence at the end of §4.9 recording that the
rollout is complete, so a future reader does not go looking for lessons
still on a static fence.

old_string (the last paragraph of §4.9, ending the section):
```
**Accessibility, non-negotiable if you touch this component:** the output
panel is `role="status"` `aria-live="polite"` — the same "announce a result
without the user having to go looking for it" pattern the `Player` note
region and §4.7's input-editor error region already use.
```

new_string:
```
**Accessibility, non-negotiable if you touch this component:** the output
panel is `role="status"` `aria-live="polite"` — the same "announce a result
without the user having to go looking for it" pattern the `Player` note
region and §4.7's input-editor error region already use.

All 28 lessons use `<RunnableCode>` as of the
`2026-09-08-runnable-code-rollout` plan — there is no longer a lesson on a
static fenced `## Try it` block to use as a counter-example.
```

- [ ] **Step 4: Full gate run**

Run, in order:
`pnpm lint:content && pnpm typecheck && pnpm test && pnpm build && pnpm check:offline && pnpm test:e2e`
Expected: all exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/e2e/lesson.spec.ts docs/AUTHORING.md
git commit -m "test: extend RunnableCode e2e coverage to all 28 lessons"
```

---

## Definition of Done

- [ ] All 26 remaining lessons (Tasks 1–26) import `RunnableCode` and render
      `<RunnableCode lang="js" client:visible source={...} />` in place of
      their static `## Try it` fence.
- [ ] Every migrated lesson passes `pnpm lint:content` (700-word budget
      included) after any needed `## Trade-offs`/`## How it works` trim.
- [ ] `RUNNABLE_LESSONS` in `apps/web/e2e/lesson.spec.ts` lists all 28
      lessons; `pnpm test:e2e` passes for all of them (Run/Reset output,
      axe, CLS).
- [ ] `docs/AUTHORING.md` §4.9 notes the rollout is complete.
- [ ] `pnpm lint:content`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
      `pnpm check:offline`, `pnpm test:e2e` all exit 0 (Task 27, Step 4).
- [ ] No file under `packages/` was edited; `RunnableCode.tsx` and
      `apps/web/src/lib/runner/` were not edited.
