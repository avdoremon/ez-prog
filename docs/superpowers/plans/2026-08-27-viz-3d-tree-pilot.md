# 3D Tree Visualization Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 2D `TreeView` renderer with a camera-controllable 3D
view (`TreeView3D`) on exactly one lesson — `data-structures/tree.mdx` — as
a pilot proving the pattern works, including accessibility, before any
other lesson is touched.

**Architecture:** A new workspace package, `packages/viz-3d`, wraps
`@react-three/fiber`/`drei`/`three` behind one component, `TreeView3D`,
that consumes the exact same `Frame<number[]>`/`Mark` data `TreeView`
already consumes — zero changes to `packages/viz-core` or the
`tree-traversal` algorithm. It plugs into the existing
`VizIsland`/`Viz.astro` dispatch mechanism as a fourth renderer option,
loaded via a targeted dynamic `import()` so the ~250KB+ Three.js stack is
never fetched by the other 27 lessons.

**Tech Stack:** `three@0.185.1`, `@react-three/fiber@9.7.0`,
`@react-three/drei@10.7.8`, React 19, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-27-viz-3d-tree-pilot-design.md`
(this plan implements it in full; deviations are recorded below with
rationale — read both).

---

## Decisions the spec left open (refinements made while writing this plan)

The spec sketched several pieces at a level that left concrete
implementation choices for the plan to pin down. Each keeps the spec's
actual requirement while choosing the simpler, more robust, or more
consistent-with-the-codebase option:

1. **A visible "jump to node" button strip below the canvas, not
   screen-position-tracked overlay buttons.** The spec's prose described
   buttons "positioned over that node's projected 2D screen coordinate."
   Implementing that precisely needs `@react-three/drei`'s `<Html>` helper
   tracking camera-relative screen position every frame — real complexity
   (projection edge cases, occlusion, z-fighting with the canvas) for a
   benefit (visual alignment with the node) that the camera-pan-on-focus
   behavior (§4.2 of the spec) already delivers: focusing a node's button
   moves the camera to center it, which is the actual "show me where I am"
   feedback a sighted keyboard user needs. The simpler design — a flat,
   **visible** row of small labeled buttons (each showing the node's
   value, doubling as a mouse-clickable "jump to node" shortcut) — is not
   the "hidden text equivalent" the user explicitly rejected during
   brainstorming (that option was about invisibly carrying forward
   `TreeView`'s old DOM structure); it is a new, visible, 3D-native
   navigation aid tied to the camera, which is what was actually approved.
2. **Tab order follows index (breadth-first) order, not pre-order.** The
   spec said Tab order should match "the tree's pre-order traversal," by
   analogy with `TreeView`'s DOM nesting. But `layoutTree3D` (Task 1)
   arranges each depth as a ring, and index order (`0, 1, 2, 3, ...`) *is*
   breadth-first for a complete-binary-tree-shaped array — visiting ring by
   ring, outward, which matches what the camera visually reveals as you
   tab through. Pre-order would jump between rings unpredictably. Index
   order is both simpler to implement (`state.map` in order, no separate
   traversal function) and a better match for this specific radial layout.
3. **No separate `Viz3D.astro`/`TreeView3DIsland.tsx` — `TreeView3D` plugs
   into the existing `VizIsland`/`Viz.astro` dispatch mechanism as a fourth
   renderer.** The spec sketched a parallel wrapper pair mirroring
   `Viz.astro`/`VizIsland`. But `VizIsland` already dispatches to whichever
   renderer a viz entry names (`ArrayView`/`TreeView`/`GraphView`, via a
   `RENDERERS` lookup keyed on `entry.renderer`) — the exact
   id-validation and `<noscript>` fallback the spec wanted from a new
   wrapper are what `Viz.astro` (unchanged) already provides today, for
   every renderer including this one. The ONE genuinely new problem —
   keeping the ~250KB+ Three.js stack out of every lesson that isn't
   `tree-traversal` — is solved by making the renderer lookup a *dynamic*
   `import()` for `'TreeView3D'` specifically (Task 3), instead of the
   static top-level imports the other three renderers use. This is a
   smaller diff (four edited files, zero new `.astro`/`.tsx` wrapper
   files) that satisfies the same requirement the spec named.
4. **A fixed-height canvas container, not a measure-then-reserve
   `min-height` estimate.** `RunnableCode`'s CLS reservation (a different,
   already-shipped feature) had to guess a `min-height` because CodeMirror
   grows from an empty mount point to its real size. `TreeView3D`'s canvas
   container doesn't have that problem: give it a fixed, unconditional CSS
   `height` from the start (Task 3) and its box never changes size between
   server-render and hydration — only its *contents* do — so there is
   nothing to reserve space for. Task 4 still adds a real, measured e2e CLS
   test proving this, rather than asserting it without checking (the
   Code Runner plan's final review specifically flagged an unverified CLS
   claim as a defect; this plan does not repeat that mistake).

## Global Constraints

- Package location: `packages/viz-3d` (new workspace package), not folded
  into `packages/viz-react`.
- Exact dependency pins, no `^`/`~`: `three@0.185.1`,
  `@react-three/fiber@9.7.0`, `@react-three/drei@10.7.8`,
  `@types/three@0.185.4` — verified against the npm registry and against
  the packages' own shipped `.d.ts` files on 2026-08-27.
- **No change to `packages/viz-core`.** `TreeView3D` consumes the exact
  same `Frame<number[]>`/`Mark`/`Target` shape `TreeView` already consumes.
  If a task seems to need a `viz-core` change, stop and report per
  `docs/AUTHORING.md` §0 rather than making it.
- Scope: `data-structures/tree.mdx` (`tree-traversal` viz entry) only. No
  other lesson, no `GraphView`, no force-directed layout.
- The canvas element (or its wrapping container) carries `aria-hidden`;
  all accessible interaction lives in ordinary, visible, focusable DOM
  alongside it (the button strip and the live-region summary) — never
  inside the WebGL scene itself.
- `prefers-reduced-motion` governs camera *transitions* only (snap instead
  of tween); manual drag/orbit is direct user input and is never
  restricted by it.
- Mark-kind colors mirror `apps/web/src/styles/tokens.css` exactly:
  `cursor`/`compare`/`swap` → `#B58415` (`--signal`), `done` → `#369E71`
  (`--commit`), `visited`/`active` → `#2F93E2` (`--probe`), `discard` →
  `#E5654B` (`--discard`), unmarked → `#7A8493` (`--muted`).

---

### Task 1: `packages/viz-3d` — pure layout, color, and narration functions

**Files:**
- Create: `packages/viz-3d/package.json`
- Create: `packages/viz-3d/tsconfig.json`
- Create: `packages/viz-3d/src/layout.ts`
- Create: `packages/viz-3d/src/layout.test.ts`
- Create: `packages/viz-3d/src/markColors.ts`
- Create: `packages/viz-3d/src/markColors.test.ts`
- Create: `packages/viz-3d/src/sceneSummary.ts`
- Create: `packages/viz-3d/src/sceneSummary.test.ts`
- Modify: `tsconfig.json:11-14` (root project-reference aggregator — add
  `{ "path": "./packages/viz-3d" }`)

**Interfaces:**
- Produces: `export interface Position3D { x: number; y: number; z: number }`
  and `export function layoutTree3D(state: number[]): Map<number, Position3D>`
  (from `layout.ts`); `export function colorForMarks(kinds: MarkKind[]): string`
  (from `markColors.ts`); `export function buildSceneSummary(state: number[],
  marks?: Mark[]): string` (from `sceneSummary.ts`) — all three consumed by
  Task 2's `TreeView3D` component by exact name.

- [ ] **Step 1: Scaffold the package**

```json
// packages/viz-3d/package.json
{
  "name": "@cs/viz-3d",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "dependencies": {
    "@cs/viz-core": "workspace:*",
    "@react-three/drei": "10.7.8",
    "@react-three/fiber": "9.7.0",
    "three": "0.185.1"
  },
  "peerDependencies": {
    "react": "19.2.8",
    "react-dom": "19.2.8"
  },
  "devDependencies": {
    "@types/react": "19.2.18",
    "@types/react-dom": "19.2.4",
    "@types/three": "0.185.4",
    "react": "19.2.8",
    "react-dom": "19.2.8"
  }
}
```

```json
// packages/viz-3d/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "rootDir": "./src",
    "outDir": "./.tsc-out"
  },
  "include": ["src/**/*"]
}
```

Add `{ "path": "./packages/viz-3d" }` to the root `tsconfig.json`'s
`"references"` array (alongside the existing `viz-core`/`viz-react`
entries).

Run: `pnpm install`
Expected: exits 0; `packages/viz-3d` appears as a workspace package (the
`packages/*` glob in `pnpm-workspace.yaml` picks it up automatically, no
change needed there).

- [ ] **Step 2: Write the failing tests for `layoutTree3D`**

```ts
// packages/viz-3d/src/layout.test.ts
import { expect, test } from 'vitest';
import { layoutTree3D } from './layout.js';

test('root sits at the origin', () => {
  const positions = layoutTree3D([8, 3, 10]);
  expect(positions.get(0)).toEqual({ x: 0, y: 0, z: 0 });
});

test('same-depth siblings sit at the same radius from the vertical axis', () => {
  const positions = layoutTree3D([8, 3, 10, 1, 6, 9, 14]);
  const p1 = positions.get(1)!;
  const p2 = positions.get(2)!;
  expect(Math.hypot(p1.x, p1.z)).toBeCloseTo(Math.hypot(p2.x, p2.z));
});

test('deeper nodes sit lower (more negative y) than their parent', () => {
  const positions = layoutTree3D([8, 3, 10, 1, 6, 9, 14]);
  expect(positions.get(1)!.y).toBeLessThan(positions.get(0)!.y);
  expect(positions.get(3)!.y).toBeLessThan(positions.get(1)!.y);
});

test('layout is deterministic', () => {
  const state = [8, 3, 10, 1, 6, 9, 14];
  expect([...layoutTree3D(state).entries()]).toEqual([...layoutTree3D(state).entries()]);
});

test('an empty tree produces no positions', () => {
  expect(layoutTree3D([]).size).toBe(0);
});

test('a single node sits at the origin', () => {
  const positions = layoutTree3D([42]);
  expect(positions.size).toBe(1);
  expect(positions.get(0)).toEqual({ x: 0, y: 0, z: 0 });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm vitest run packages/viz-3d/src/layout.test.ts`
Expected: FAIL — `./layout.js` cannot be resolved (module doesn't exist yet).

- [ ] **Step 4: Implement `layout.ts`**

```ts
// packages/viz-3d/src/layout.ts
export interface Position3D {
  x: number;
  y: number;
  z: number;
}

const LEVEL_RADIUS_STEP = 2.4;
const LEVEL_HEIGHT_STEP = 1.8;

function depthOf(index: number): number {
  return Math.floor(Math.log2(index + 1));
}

/**
 * Deterministic radial layout for a complete-binary-tree-shaped array
 * (index i's children are 2i+1 and 2i+2 -- the same mapping TreeView
 * already uses). Each depth is a ring: nodes spread evenly around a full
 * circle at that depth's radius, and deeper rings sit lower (more
 * negative y) and wider (larger radius). Root sits at the origin. Same
 * input always produces the same output -- no physics simulation, no
 * settling jitter, nothing to explain to a learner about why a rerun
 * looks different.
 */
export function layoutTree3D(state: number[]): Map<number, Position3D> {
  const positions = new Map<number, Position3D>();
  for (let i = 0; i < state.length; i++) {
    const depth = depthOf(i);
    const levelStart = 2 ** depth - 1;
    const indexInLevel = i - levelStart;
    const levelWidth = 2 ** depth;
    const radius = depth * LEVEL_RADIUS_STEP;
    const angle = levelWidth > 1 ? (indexInLevel / levelWidth) * Math.PI * 2 : 0;
    positions.set(i, {
      x: radius * Math.cos(angle),
      y: -depth * LEVEL_HEIGHT_STEP,
      z: radius * Math.sin(angle),
    });
  }
  return positions;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run packages/viz-3d/src/layout.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Write the failing tests for `colorForMarks`**

```ts
// packages/viz-3d/src/markColors.test.ts
import { expect, test } from 'vitest';
import { colorForMarks } from './markColors.js';

test('returns the default muted color for no marks', () => {
  expect(colorForMarks([])).toBe('#7A8493');
});

test('maps cursor to the signal color', () => {
  expect(colorForMarks(['cursor'])).toBe('#B58415');
});

test('maps done to the commit color', () => {
  expect(colorForMarks(['done'])).toBe('#369E71');
});

test('maps discard to the discard color', () => {
  expect(colorForMarks(['discard'])).toBe('#E5654B');
});

test('returns the first matching mark color when multiple marks are present', () => {
  expect(colorForMarks(['visited', 'done'])).toBe('#2F93E2');
});
```

- [ ] **Step 7: Run the tests to verify they fail**

Run: `pnpm vitest run packages/viz-3d/src/markColors.test.ts`
Expected: FAIL — `./markColors.js` cannot be resolved.

- [ ] **Step 8: Implement `markColors.ts`**

```ts
// packages/viz-3d/src/markColors.ts
import type { MarkKind } from '@cs/viz-core';

/**
 * Mirrors the palette apps/web/src/styles/tokens.css defines for the 2D
 * renderers (cursor/compare/swap -> --signal, done -> --commit,
 * visited/active -> --probe, discard -> --discard) -- kept in sync by
 * hand, since a WebGL material needs a real hex value, not a CSS custom
 * property.
 */
const MARK_COLORS: Partial<Record<MarkKind, string>> = {
  cursor: '#B58415',
  compare: '#B58415',
  swap: '#B58415',
  done: '#369E71',
  visited: '#2F93E2',
  active: '#2F93E2',
  discard: '#E5654B',
};

/** tokens.css's --muted -- the default, unmarked node color. */
const DEFAULT_COLOR = '#7A8493';

export function colorForMarks(kinds: MarkKind[]): string {
  for (const kind of kinds) {
    const color = MARK_COLORS[kind];
    if (color) return color;
  }
  return DEFAULT_COLOR;
}
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `pnpm vitest run packages/viz-3d/src/markColors.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 10: Write the failing tests for `buildSceneSummary`**

```ts
// packages/viz-3d/src/sceneSummary.test.ts
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
```

- [ ] **Step 11: Run the tests to verify they fail**

Run: `pnpm vitest run packages/viz-3d/src/sceneSummary.test.ts`
Expected: FAIL — `./sceneSummary.js` cannot be resolved.

- [ ] **Step 12: Implement `sceneSummary.ts`**

```ts
// packages/viz-3d/src/sceneSummary.ts
import type { Mark } from '@cs/viz-core';

function depthOf(index: number): number {
  return Math.floor(Math.log2(index + 1));
}

function treeLevels(size: number): number {
  return size === 0 ? 0 : depthOf(size - 1) + 1;
}

/**
 * The live-region text a screen reader (or anyone glancing at the page)
 * gets for the current frame -- TreeView3D has no DOM tree structure the
 * way TreeView's role="tree"/treeitem nesting gives for free, so this is
 * the replacement summary. A pure function of state+marks, so it is
 * testable without touching the renderer at all.
 */
export function buildSceneSummary(state: number[], marks: Mark[] = []): string {
  if (state.length === 0) return 'Empty tree.';

  const levels = treeLevels(state.length);
  const base =
    `Binary tree, ${state.length} node${state.length === 1 ? '' : 's'}, ` +
    `${levels} level${levels === 1 ? '' : 's'}.`;

  const parts: string[] = [];
  for (const mark of marks) {
    if (mark.at.t === 'index') {
      parts.push(`Node ${mark.at.i} (value ${state[mark.at.i]}) is ${mark.kind}.`);
    } else if (mark.at.t === 'range') {
      const count = mark.at.to - mark.at.from + 1;
      parts.push(`${count} node${count === 1 ? '' : 's'} ${mark.kind}.`);
    }
  }

  return parts.length > 0 ? `${base} ${parts.join(' ')}` : base;
}
```

- [ ] **Step 13: Run the tests to verify they pass**

Run: `pnpm vitest run packages/viz-3d/src/sceneSummary.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 14: Typecheck**

Run: `pnpm typecheck`
Expected: exits 0.

- [ ] **Step 15: Commit**

```bash
git add packages/viz-3d tsconfig.json pnpm-lock.yaml
git commit -m "feat: add viz-3d's pure layout, color, and narration functions"
```

---

### Task 2: `TreeView3D` component

**Files:**
- Create: `packages/viz-3d/src/TreeView3D.tsx`
- Create: `packages/viz-3d/src/index.ts`

**Interfaces:**
- Consumes: `layoutTree3D`, `Position3D` (from `layout.js`); `colorForMarks`
  (from `markColors.js`); `buildSceneSummary` (from `sceneSummary.js`) —
  all from Task 1.
- Produces: `export interface TreeView3DProps { state: number[]; marks?:
  Mark[]; label: string }` and `export function TreeView3D(props:
  TreeView3DProps): JSX.Element` — this is exactly the shape Task 3's
  `VizIsland` integration renders via the site's existing `Renderer<S>`
  type (`(props: {state: S; marks?: Mark[]; label: string}) =>
  React.ReactNode`), so no adapter is needed.

No dedicated test file for this task. jsdom has no real WebGL context, so
mounting a real `<Canvas>` in Vitest would not exercise anything
meaningful — same reasoning, same precedent as the Code Runner plan's
`worker.ts`/`index.ts` (no unit test; verified by Playwright in Task 4
instead). `layoutTree3D`/`colorForMarks`/`buildSceneSummary`, the actual
logic worth unit-testing, are already fully covered by Task 1.

- [ ] **Step 1: Implement `TreeView3D.tsx`**

```tsx
// packages/viz-3d/src/TreeView3D.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line, OrbitControls, Text } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Vector3 } from 'three';
import type { Mark, MarkKind } from '@cs/viz-core';
import { layoutTree3D, type Position3D } from './layout.js';
import { buildSceneSummary } from './sceneSummary.js';
import { colorForMarks } from './markColors.js';

export interface TreeView3DProps {
  state: number[];
  marks?: Mark[];
  label: string;
}

function marksForIndex(marks: Mark[], i: number): MarkKind[] {
  return marks.filter((m) => m.at.t === 'index' && m.at.i === i).map((m) => m.kind);
}

/** Parent-to-child edges: index i to 2i+1 and 2i+2, matching TreeView's mapping. */
function edgesFor(size: number): [number, number][] {
  const edges: [number, number][] = [];
  for (let i = 0; i < size; i++) {
    if (2 * i + 1 < size) edges.push([i, 2 * i + 1]);
    if (2 * i + 2 < size) edges.push([i, 2 * i + 2]);
  }
  return edges;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/**
 * Pans OrbitControls' target toward `focus` every frame -- a lerp
 * normally, or an instant snap when `instant` (prefers-reduced-motion) is
 * true. Lives inside the Canvas because it needs useFrame and the
 * OrbitControls ref.
 */
function CameraRig({ focus, instant }: { focus: Position3D | null; instant: boolean }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const targetVec = useRef(new Vector3());

  useFrame(() => {
    if (!focus || !controls.current) return;
    targetVec.current.set(focus.x, focus.y, focus.z);
    if (instant) {
      controls.current.target.copy(targetVec.current);
    } else {
      controls.current.target.lerp(targetVec.current, 0.15);
    }
    controls.current.update();
  });

  return <OrbitControls ref={controls} makeDefault />;
}

export function TreeView3D({ state, marks = [], label }: TreeView3DProps) {
  const positions = useMemo(() => layoutTree3D(state), [state]);
  const edges = useMemo(() => edgesFor(state.length), [state.length]);
  const summary = useMemo(() => buildSceneSummary(state, marks), [state, marks]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  if (state.length === 0) {
    return <p className="tree-view-3d tree-view-3d--empty">{label}: empty</p>;
  }

  const focusedPosition = focusedIndex !== null ? (positions.get(focusedIndex) ?? null) : null;
  const focusedKinds = focusedIndex !== null ? marksForIndex(marks, focusedIndex) : [];
  const announced =
    focusedIndex !== null
      ? `Node ${focusedIndex}, value ${state[focusedIndex]}` +
        `${focusedKinds.length ? `, ${focusedKinds.join(' ')}` : ''}.`
      : summary;

  return (
    <div className="tree-view-3d">
      <div className="tree-view-3d__canvas-wrap" aria-hidden="true">
        <Canvas camera={{ position: [0, 3, 10], fov: 50 }}>
          <ambientLight intensity={0.7} />
          <pointLight position={[8, 10, 8]} />
          <CameraRig focus={focusedPosition} instant={reducedMotion} />
          {edges.map(([from, to]) => {
            const a = positions.get(from)!;
            const b = positions.get(to)!;
            return (
              <Line
                key={`${from}-${to}`}
                points={[
                  [a.x, a.y, a.z],
                  [b.x, b.y, b.z],
                ]}
                color="#7A8493"
                lineWidth={1}
              />
            );
          })}
          {state.map((value, i) => {
            const p = positions.get(i)!;
            const color = colorForMarks(marksForIndex(marks, i));
            return (
              <group key={i} position={[p.x, p.y, p.z]}>
                <mesh>
                  <sphereGeometry args={[0.4, 24, 24]} />
                  <meshStandardMaterial color={color} />
                </mesh>
                <Text position={[0, 0.65, 0]} fontSize={0.32} color="#12161C" anchorX="center">
                  {String(value)}
                </Text>
              </group>
            );
          })}
        </Canvas>
      </div>

      <div className="tree-view-3d__nodes" role="group" aria-label={label}>
        {state.map((value, i) => {
          const kinds = marksForIndex(marks, i);
          return (
            <button
              key={i}
              type="button"
              className="tree-view-3d__node-button"
              aria-label={`Node ${i}, value ${value}${kinds.length ? `, ${kinds.join(' ')}` : ''}`}
              onFocus={() => setFocusedIndex(i)}
              onBlur={() => setFocusedIndex(null)}
            >
              {value}
            </button>
          );
        })}
      </div>

      <p role="status" aria-live="polite" className="tree-view-3d__summary">
        {announced}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Export it**

```ts
// packages/viz-3d/src/index.ts
export { TreeView3D, type TreeView3DProps } from './TreeView3D.js';
export { layoutTree3D, type Position3D } from './layout.js';
export { buildSceneSummary } from './sceneSummary.js';
export { colorForMarks } from './markColors.js';
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: exits 0. If TypeScript reports a type mismatch on `<Line>`,
`<Text>`, `<OrbitControls>`, or `<Canvas>` props, check the actual
installed `.d.ts` under `node_modules/@react-three/drei` /
`node_modules/@react-three/fiber` rather than guessing — these libraries'
prop shapes were verified against `@react-three/drei@10.7.8` /
`@react-three/fiber@9.7.0`'s real type definitions when this plan was
written, but pin drift between writing and execution is always possible.

- [ ] **Step 4: Commit**

```bash
git add packages/viz-3d/src/TreeView3D.tsx packages/viz-3d/src/index.ts
git commit -m "feat: add the TreeView3D component"
```

---

### Task 3: Wire `TreeView3D` into the site

**Files:**
- Modify: `apps/web/src/viz/types.ts:6` (widen the `renderer` union)
- Modify: `apps/web/src/viz/registry.ts:159` (the `tree-traversal` entry's
  `renderer` field)
- Modify: `apps/web/src/components/VizIsland.tsx` (dynamic-load
  `TreeView3D` only when needed)
- Modify: `apps/web/package.json` (add `@cs/viz-3d` dependency)
- Modify: `apps/web/src/styles/viz.css` (append `.tree-view-3d*` rules)

**Interfaces:**
- Consumes: `TreeView3D` from `@cs/viz-3d` (Task 2).
- Produces: nothing new for later tasks — this is the integration point.

- [ ] **Step 1: Add the `@cs/viz-3d` dependency**

Edit `apps/web/package.json`'s `"dependencies"` block to add, alphabetically:

```json
    "@cs/viz-3d": "workspace:*",
```

Run: `pnpm install`
Expected: exits 0.

- [ ] **Step 2: Widen the renderer union**

```ts
// apps/web/src/viz/types.ts:6
  renderer: 'ArrayView' | 'TreeView' | 'GraphView' | 'TreeView3D';
```

(Only this one line changes in the file — the rest of `VizEntry` is
untouched.)

- [ ] **Step 3: Point `tree-traversal` at the new renderer**

```ts
// apps/web/src/viz/registry.ts:159
  'tree-traversal': {
    renderer: 'TreeView3D',
```

(Only the `renderer` value changes — every other field of the
`tree-traversal` entry, including `defaultInput`, `inputSchema`, `load`,
and `code`, stays exactly as it is today.)

- [ ] **Step 4: Load `TreeView3D` dynamically in `VizIsland.tsx`**

Add, near the top of `apps/web/src/components/VizIsland.tsx` (after the
existing imports, before the `RENDERERS` map):

```tsx
import type { VizEntry } from '../viz/types.js';
```

Replace the existing `RENDERERS` map's surrounding code with:

```tsx
const RENDERERS: Record<'ArrayView' | 'TreeView' | 'GraphView', Renderer<never>> = {
  ArrayView: ArrayView as Renderer<never>,
  TreeView: TreeView as Renderer<never>,
  GraphView: GraphView as Renderer<never>,
};

/**
 * TreeView3D pulls in three/@react-three/fiber/@react-three/drei --
 * roughly 250KB+ gzipped, far heavier than every other renderer combined.
 * Loading it only when a viz entry actually asks for it (a dynamic
 * import, not the static RENDERERS map above) keeps that cost off every
 * lesson that doesn't use it.
 */
function loadRenderer(rendererName: VizEntry['renderer']): Promise<Renderer<never>> {
  if (rendererName === 'TreeView3D') {
    return import('@cs/viz-3d').then((m) => m.TreeView3D as Renderer<never>);
  }
  return Promise.resolve(RENDERERS[rendererName]);
}
```

Add a `renderer: Renderer<never>` field to the `RunData` interface:

```tsx
interface RunData {
  frames: Frame<never>[];
  truncated: boolean;
  code: ParsedCode;
  runId: number;
  renderer: Renderer<never>;
}
```

In the `useEffect` that loads a viz entry, change:

```tsx
    Promise.all([entry.load(), entry.code()])
      .then(([algo, codeMod]) => {
        if (cancelled) return;
        const { frames, truncated } = collect(
          algo.default(entry.defaultInput) as Generator<Frame<never>>,
          entry.maxFrames,
        );
        setData({ frames, truncated, code: parseAnchors(codeMod.default.js), runId: 0 });
      })
```

to:

```tsx
    Promise.all([entry.load(), entry.code(), loadRenderer(entry.renderer)])
      .then(([algo, codeMod, renderer]) => {
        if (cancelled) return;
        const { frames, truncated } = collect(
          algo.default(entry.defaultInput) as Generator<Frame<never>>,
          entry.maxFrames,
        );
        setData({
          frames, truncated, code: parseAnchors(codeMod.default.js), runId: 0, renderer,
        });
      })
```

And in the JSX, change:

```tsx
      <Player key={data.runId} frames={data.frames} truncated={data.truncated}
              label={entry.label} code={data.code}
              renderer={RENDERERS[entry.renderer]} />
```

to:

```tsx
      <Player key={data.runId} frames={data.frames} truncated={data.truncated}
              label={entry.label} code={data.code}
              renderer={data.renderer} />
```

- [ ] **Step 5: Typecheck and build**

Run: `pnpm typecheck && pnpm build`
Expected: both exit 0.

- [ ] **Step 6: Add the CSS**

Append to `apps/web/src/styles/viz.css`:

```css
.tree-view-3d {
  margin-top: .5rem;
}

.tree-view-3d--empty {
  padding: 1rem;
  text-align: center;
}

/*
 * A fixed, unconditional height -- unlike RunnableCode's editor (which
 * grows from an empty mount point and needed a measure-then-reserve
 * min-height), this box never changes size between server-render and
 * hydration; only its contents do. Nothing to reserve space for. Task 4's
 * e2e CLS test verifies this claim rather than just asserting it.
 */
.tree-view-3d__canvas-wrap {
  height: 24rem;
  border: 2px solid var(--muted);
}

.tree-view-3d__canvas-wrap canvas {
  display: block;
}

.tree-view-3d__nodes {
  display: flex;
  flex-wrap: wrap;
  gap: .35rem;
  margin-top: .5rem;
}

.tree-view-3d__node-button {
  font-family: var(--font-mono);
  font-size: var(--step-0);
  min-width: 2.5rem;
  min-height: 2.5rem;
  border: 2px solid var(--muted);
  background: var(--paper);
  cursor: pointer;
}

.tree-view-3d__node-button:focus-visible {
  outline: 3px solid var(--signal);
  outline-offset: 2px;
}

.tree-view-3d__summary {
  margin-top: .5rem;
  font-weight: 600;
}

/*
 * Starting estimate for the case where the 3D view's canvas + node strip
 * + summary push the figure past the plain .viz reservation above.
 * Task 4 measures the real hydrated height via e2e and corrects this
 * number -- do not treat it as verified until that test exists and
 * passes.
 */
.js .viz:has(.tree-view-3d) {
  min-height: 60rem;
}
```

- [ ] **Step 7: Manual dev-server check**

Run: `pnpm dev`, open `/data-structures/tree/`. Confirm: a 3D scene
renders inside the canvas area (a small sphere per tree node, connected by
lines); dragging the canvas orbits the camera; scrolling zooms; a row of
small buttons (one per node value) appears below the canvas; clicking or
Tab-focusing one visibly pans the camera toward that node and updates the
text below the button strip. This is also where the "does `client:visible`
actually hydrate this" assumption gets checked, the same way Task 4 of the
Code Runner plan caught a real hydration bug — if nothing renders at all
(not even a loading state resolving), check the browser console for an
import error before assuming the design itself is wrong.

- [ ] **Step 8: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/src/viz/types.ts apps/web/src/viz/registry.ts apps/web/src/components/VizIsland.tsx apps/web/src/styles/viz.css
git commit -m "feat: wire TreeView3D into the tree-traversal lesson"
```

---

### Task 4: Accessibility and e2e coverage, CLS measurement, final gates

**Files:**
- Modify: `apps/web/e2e/lesson.spec.ts`
- Modify: `apps/web/src/styles/viz.css` (only if Step 2 below finds the
  60rem estimate wrong)

**Interfaces:**
- Consumes: the built site (`TreeView3D`-hydrated `/data-structures/tree/`
  page) from Tasks 1–3.

`/data-structures/tree/` is already in `apps/web/e2e/lesson.spec.ts`'s
`ALL_LESSONS`, so it already gets the standard axe/360px/CLS/dark-palette
loops — but (same lesson the Code Runner plan learned) those loops never
scroll, and this component doesn't need scrolling to hydrate (it uses
`client:visible` the same as every other `<Viz>`, and `Viz.astro` already
sits near the top of every lesson, well within a typical viewport, unlike
`RunnableCode`'s below-the-fold placement) — so the existing loops SHOULD
already exercise it correctly. Verify this rather than assume it (Step 1).

- [ ] **Step 1: Confirm the existing `ALL_LESSONS` loops actually see the hydrated 3D view**

Run: `pnpm build && pnpm --filter web exec playwright install --with-deps chromium && pnpm test:e2e`

Expected: all existing tests still pass, including
`/data-structures/tree/ has no accessibility violations` (both light and
dark palette) and the CLS test for the same path. If the axe test fails
with a violation on `.tree-view-3d__node-button` or similar, that is real
signal the component's accessible names (Task 2) need fixing — do not
adjust the test to ignore it.

- [ ] **Step 2: Add a targeted keyboard/live-region e2e test**

Insert into `apps/web/e2e/lesson.spec.ts`, after the existing
`RUNNABLE_LESSONS` block (added by the Code Runner plan) and before the
`forced light palette` `describe`:

```ts
test('the 3D tree view is keyboard-operable and announces the focused node', async ({ page }) => {
  await page.goto('/data-structures/tree/');
  const nodeButtons = page.locator('.tree-view-3d__node-button');
  await expect(nodeButtons.first()).toBeVisible();

  const summary = page.locator('.tree-view-3d__summary');
  const beforeFocus = await summary.textContent();

  await nodeButtons.nth(1).focus();
  await expect(summary).not.toHaveText(beforeFocus ?? '');
  await expect(summary).toContainText(/^Node 1, value/);

  await page.keyboard.press('Tab');
  await expect(summary).toContainText(/^Node 2, value/);
});
```

Run: `pnpm test:e2e -- -g "3D tree view"`
Expected: PASS.

- [ ] **Step 3: Add a real, measured CLS test for the 3D lesson**

Insert immediately after the test from Step 2:

```ts
test('/data-structures/tree/ does not shift layout while the 3D view hydrates', async ({ page }) => {
  await page.goto('/data-structures/tree/');
  const cls = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let total = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as (PerformanceEntry & {
            value: number;
            hadRecentInput: boolean;
          })[]) {
            if (!entry.hadRecentInput) total += entry.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
        setTimeout(() => resolve(total), 1500);
      }),
  );
  expect(cls).toBeLessThan(0.1);
});
```

Run: `pnpm test:e2e -- -g "does not shift layout while the 3D view"`

If it FAILS: measure the real hydrated height —

```ts
// Temporary, in the same test file, to find the real number; delete once done.
const height = await page.evaluate(
  () => document.querySelector('.viz')!.getBoundingClientRect().height,
);
console.log(height);
```

— convert the logged pixel value to rem (this project's `--step-0: 1rem`
is `16px`; check `apps/web/src/styles/tokens.css` if that's changed), add
a small safety margin, and update the `.js .viz:has(.tree-view-3d)`
`min-height` in `apps/web/src/styles/viz.css` (Task 3, Step 6) to the
corrected value. Re-run until the test passes, then remove the temporary
logging line.

- [ ] **Step 4: Add a `prefers-reduced-motion` test**

```ts
test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('focusing a node snaps the camera instead of animating it', async ({ page }) => {
    await page.goto('/data-structures/tree/');
    const nodeButtons = page.locator('.tree-view-3d__node-button');
    await nodeButtons.nth(3).focus();
    // No crash, no console error, and the live region still updates --
    // the actual snap-vs-tween behavior is internal to CameraRig and not
    // independently observable from outside the canvas; this test's job
    // is to prove the reduced-motion path doesn't break anything.
    await expect(page.locator('.tree-view-3d__summary')).toContainText(/^Node 3, value/);
  });
});
```

Run: `pnpm test:e2e -- -g "reduced motion"`
Expected: PASS.

- [ ] **Step 5: Full gate run**

Run, in order:
`pnpm lint:content && pnpm typecheck && pnpm test && pnpm build && pnpm check:offline && pnpm test:e2e`
Expected: all exit 0.

- [ ] **Step 6: Commit**

```bash
git add apps/web/e2e/lesson.spec.ts apps/web/src/styles/viz.css
git commit -m "test: add accessibility, keyboard, and CLS coverage for TreeView3D"
```

---

## Definition of Done

- [ ] `packages/viz-3d` built: `layoutTree3D`, `colorForMarks`,
      `buildSceneSummary`, `TreeView3D` (Tasks 1–2).
- [ ] `data-structures/tree.mdx` renders via `TreeView3D` with no content
      changes needed (Task 3) — confirmed by hand that the existing prose
      still reads sensibly.
- [ ] Camera orbit/zoom works (manual verification, Task 3 Step 7).
- [ ] Keyboard node-focus pans the camera and updates the live-region
      summary, verified by test, not just by hand (Task 4).
- [ ] `prefers-reduced-motion` path verified not to break anything
      (Task 4).
- [ ] CLS budget is a real measured value, not a guess (Task 4).
- [ ] Zero axe violations (wcag2a/wcag2aa, both colour schemes) on
      `/data-structures/tree/` (Task 4, via the existing `ALL_LESSONS`
      loop).
- [ ] `pnpm lint:content`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
      `pnpm check:offline`, `pnpm test:e2e` all exit 0.
- [ ] No file under `packages/viz-core` was edited.
