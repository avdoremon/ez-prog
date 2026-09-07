import { PerspectiveCamera, Vector3 } from 'three';
import { expect, test } from 'vitest';
import {
  HIERARCHY_CAMERA_FOV, HIERARCHY_CAMERA_POSITION,
} from './HierarchyView3D.js';
import { layoutHierarchy3D } from './hierarchyLayout.js';
import type { Position3D } from './layout.js';

/*
 * hierarchyLayout.test.ts asserts 3D Euclidean distance, which is the right
 * check for the layout's own math but is NOT the property a learner sees.
 * Two nodes can sit a healthy 3.75 units apart in 3D and still land on top
 * of each other on screen if the line between them happens to point at the
 * camera -- exactly the defect that shipped in this renderer's first
 * default camera, and exactly why the unit suite never caught it.
 *
 * These tests measure the property that actually matters: the distance in
 * SCREEN PIXELS between the silhouettes of two spheres, through a real
 * THREE.PerspectiveCamera built from the component's own exported camera
 * constants. `.project()` is pure matrix math -- no WebGL, no jsdom, no
 * renderer -- so this runs in plain Node alongside the other unit tests.
 */

/**
 * The canvas's real height in CSS pixels. `.hierarchy-view-3d__canvas-wrap`
 * is `height: 24rem` (apps/web/src/styles/viz.css) with a 2px border, under
 * the project's unmodified 16px root font size (tokens.css sets --step-0 in
 * rem and never touches html/:root font-size) and a global `box-sizing:
 * border-box` -- so the CONTENT box react-three-fiber measures and hands to
 * three's setSize() is 24 * 16 - 2 - 2 = 380, not 384. Verified by
 * measuring the live production build in Chromium at three viewport widths.
 */
const CANVAS_HEIGHT = 380;

/**
 * Any width: the result is provably width-independent. A perspective
 * projection's NDC x carries a 1/aspect factor, and converting NDC to
 * pixels multiplies by width/2, so the width cancels and BOTH pixel axes
 * scale with height alone. Asserted directly in the first test below
 * rather than left as an argument on paper.
 */
const CANVAS_WIDTH = 716;

/** Matches <sphereGeometry args={[0.4, 24, 24]} /> in HierarchyView3D.tsx. */
const SPHERE_RADIUS = 0.4;

/**
 * Minimum acceptable whitespace between two adjacent spheres, in CSS px.
 *
 * Deliberately NOT `> 0`. This number is calibrated against a real human
 * verdict rather than picked for roundness: trie's default input under the
 * ORIGINAL [0, 9, 36] camera -- the rendering a screenshot review rejected
 * as "nearly on top of each other", which is why the camera was rotated at
 * all -- measures +2.47px by this same method. A positive gap is therefore
 * demonstrably not sufficient for legibility, so the bar sits above that
 * failed configuration. At the shipped canvas height a sphere is only
 * ~7px across, so 3px is a little under half a node of clear space.
 */
const MIN_GAP_PX = 3;

interface Edge { from: number; to: number }

/** Built exactly as <Canvas camera={{ position, fov }}> builds it: r3f uses near 0.1 / far 1000 and calls lookAt(0,0,0). */
function shippedCamera(width = CANVAS_WIDTH, height = CANVAS_HEIGHT): PerspectiveCamera {
  const camera = new PerspectiveCamera(HIERARCHY_CAMERA_FOV, width / height, 0.1, 1000);
  camera.position.set(...HIERARCHY_CAMERA_POSITION);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  return camera;
}

function toPixels(
  p: Position3D, camera: PerspectiveCamera, width: number, height: number,
): { x: number; y: number } {
  const ndc = new Vector3(p.x, p.y, p.z).project(camera);
  return { x: ((ndc.x + 1) / 2) * width, y: ((1 - ndc.y) / 2) * height };
}

/** A sphere's on-screen radius: project a point offset along the camera's own right axis, which is always perpendicular to the view ray. */
function silhouetteRadiusPx(
  p: Position3D, camera: PerspectiveCamera, width: number, height: number,
): number {
  const centre = toPixels(p, camera, width, height);
  const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
  const offset = new Vector3(p.x, p.y, p.z).addScaledVector(right, SPHERE_RADIUS);
  const edge = toPixels(offset, camera, width, height);
  return Math.hypot(edge.x - centre.x, edge.y - centre.y);
}

/**
 * The smallest screen-space gap between the silhouettes of any two nodes
 * joined by an edge. Parent-child pairs are the only ones this layout can
 * ever place adjacent -- every node sits on its own angular wedge at its
 * own depth, so non-adjacent pairs are strictly farther apart.
 */
function minEdgeGapPx(
  nodeCount: number, edges: Edge[], width = CANVAS_WIDTH, height = CANVAS_HEIGHT,
): number {
  const camera = shippedCamera(width, height);
  const positions = layoutHierarchy3D(nodeCount, edges);
  let min = Infinity;
  for (const edge of edges) {
    const a = positions.get(edge.from)!;
    const b = positions.get(edge.to)!;
    const pa = toPixels(a, camera, width, height);
    const pb = toPixels(b, camera, width, height);
    const gap =
      Math.hypot(pa.x - pb.x, pa.y - pb.y) -
      silhouetteRadiusPx(a, camera, width, height) -
      silhouetteRadiusPx(b, camera, width, height);
    min = Math.min(min, gap);
  }
  return min;
}

function chain(n: number): Edge[] {
  const edges: Edge[] = [];
  for (let i = 0; i < n - 1; i++) edges.push({ from: i, to: i + 1 });
  return edges;
}

/**
 * trie's shipped defaultInput, words ['cat', 'car', 'cart']: values
 * ['•','c','a','t','r','t'] -- root -> c -> a, then 'a' branches to 't'
 * (cat) and 'r' (car), and 'r' carries 'cart''s final 't'. Six nodes, five
 * edges, the shape apps/web/e2e/lesson.spec.ts asserts on that lesson's
 * last frame. Copied from a real run of packages/viz-core's `trie`
 * generator on that exact defaultInput, not hand-derived.
 */
const TRIE_DEFAULT_EDGES: Edge[] = [
  { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 2, to: 4 },
  { from: 4, to: 5 },
];

test('pixel gaps are canvas-width independent, so only the fixed 24rem height matters', () => {
  // The horizontal 1/aspect factor cancels against the NDC-to-pixel width
  // multiply. Checked on a chain (pairs separated mostly horizontally) AND
  // on trie's branch (a pair separated vertically too), since the cancelling
  // argument has to hold for both axes, not just the horizontal one.
  const widths = [464, 632, 716, 1200, 4000];
  const chainGaps = widths.map((w) => minEdgeGapPx(8, chain(8), w));
  const trieGaps = widths.map((w) => minEdgeGapPx(6, TRIE_DEFAULT_EDGES, w));
  for (const gap of chainGaps) expect(gap).toBeCloseTo(chainGaps[0]!, 10);
  for (const gap of trieGaps) expect(gap).toBeCloseTo(trieGaps[0]!, 10);
});

test("linked-list's default input (6-node chain) stays visibly separated on screen", () => {
  // defaultInput.arr is [4, 8, 15, 16, 23, 42] -- six nodes before the
  // insertion frames. Measured: 8.10px between the tightest pair.
  const gap = minEdgeGapPx(6, chain(6));
  expect(gap).toBeGreaterThan(MIN_GAP_PX);
  expect(gap).toBeCloseTo(8.1, 1);
});

test("linked-list's worst case at its registry cap (8-node chain) stays visibly separated on screen", () => {
  // apps/web/src/viz/registry.ts caps `arr` at 7, and the generator
  // splices in one inserted node, so 8 is the longest chain this lesson
  // can ever render. This assertion is what sets that cap: 8 nodes measure
  // 3.69px, but 9 fall to 2.34px -- below the 2.47px configuration a human
  // already rejected on screenshot (see MIN_GAP_PX) -- 11 reach 0.46px and
  // 12 go negative. So 8 is the longest chain that stays on the right side
  // of a bound anchored in real visual judgement, not in arithmetic taste.
  const gap = minEdgeGapPx(8, chain(8));
  expect(gap).toBeGreaterThan(MIN_GAP_PX);
  expect(gap).toBeCloseTo(3.69, 1);
});

test("trie's default input ('cat', 'car', 'cart') stays visibly separated on screen", () => {
  // The case the [25.5, 9, 25.5] camera was chosen to fix. The tightest
  // pair is 4-5 ('r' and 'cart''s final 't'); under the original
  // [0, 9, 36] camera it measured a hairline 2.47px, which is what the
  // screenshot review rejected. Measured now: 12.05px, a 4.9x improvement.
  const gap = minEdgeGapPx(6, TRIE_DEFAULT_EDGES);
  expect(gap).toBeGreaterThan(MIN_GAP_PX);
  expect(gap).toBeCloseTo(12.05, 1);
});

/*
 * KNOWN FAILING CASE -- deliberately a todo, not an assertion, and not
 * omitted. trie's registry schema permits 6 words of 8 characters; with no
 * shared prefix that is 49 nodes, and projecting them through the shipped
 * camera gives -1.44px between an adjacent parent/child pair (and -7.03px
 * between the closest pair overall) -- i.e. real overlap.
 *
 * This is PRE-EXISTING, not a regression: it measures negative under the
 * original [0, 9, 36] camera too, and the design spec's §5.2 claim that
 * this case "settles at 1.5 units, comfortably clear" was only ever a
 * 3D-distance claim (hierarchyLayout.test.ts still checks it, and it still
 * holds) -- never a screen-projection one. Resolving it needs a decision
 * this fix pass was explicitly scoped out of: shrink trie's schema
 * (against spec §5.2), scale sphere radius with node count, or accept and
 * document it. A camera-hemisphere sweep found no single position that
 * fixes it. Parked for a human in the final-review section of
 * .superpowers/sdd/2026-08-31-hierarchyview-3d/progress.md.
 */
test.todo(
  "trie's worst case (6 words x 8 chars, no shared prefix, 49 nodes) " +
  'projects to overlapping spheres -- known, parked, see progress.md',
);
