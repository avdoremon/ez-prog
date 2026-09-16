import { PerspectiveCamera, Vector3 } from 'three';
import { expect, test } from 'vitest';
import { BAR_CAMERA_FOV, BAR_CAMERA_HEIGHT } from './BarView3D.js';
import { BAR_WIDTH, cameraDistanceFor, layoutBar3D } from './barLayout.js';
import type { Position3D } from './layout.js';

/**
 * .bar-view-3d__canvas-wrap is height: 24rem with a 2px border, same as
 * every other 3D renderer's canvas-wrap -- see hierarchyProjection.test.ts's
 * own CANVAS_HEIGHT comment for the exact 16px-root-font-size /
 * box-sizing:border-box derivation this number restates.
 */
const CANVAS_HEIGHT = 380;
const CANVAS_WIDTH = 716;

/** Minimum acceptable whitespace between two adjacent bars' silhouettes, in CSS px. */
const MIN_GAP_PX = 3;

function shippedCamera(n: number, width = CANVAS_WIDTH, height = CANVAS_HEIGHT): PerspectiveCamera {
  const distance = cameraDistanceFor(n, BAR_CAMERA_FOV, width / height);
  const camera = new PerspectiveCamera(BAR_CAMERA_FOV, width / height, 0.1, 1000);
  camera.position.set(0, BAR_CAMERA_HEIGHT, distance);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  return camera;
}

function toPixels(p: Position3D, camera: PerspectiveCamera, width: number, height: number) {
  const ndc = new Vector3(p.x, p.y, p.z).project(camera);
  return { x: ((ndc.x + 1) / 2) * width, y: ((1 - ndc.y) / 2) * height };
}

/** A box's on-screen half-width: project a point offset along the camera's own right axis. */
function halfWidthPx(p: Position3D, camera: PerspectiveCamera, width: number, height: number): number {
  const centre = toPixels(p, camera, width, height);
  const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
  const offset = new Vector3(p.x, p.y, p.z).addScaledVector(right, BAR_WIDTH / 2);
  const edge = toPixels(offset, camera, width, height);
  return Math.hypot(edge.x - centre.x, edge.y - centre.y);
}

/** The screen-space gap between two adjacent bars' silhouettes. */
function adjacentGapPx(values: number[], width = CANVAS_WIDTH, height = CANVAS_HEIGHT): number {
  const camera = shippedCamera(values.length, width, height);
  const bars = layoutBar3D(values);
  let min = Infinity;
  for (let i = 0; i < values.length - 1; i++) {
    const a = bars.get(i)!;
    const b = bars.get(i + 1)!;
    const gap =
      Math.hypot(
        toPixels(a, camera, width, height).x - toPixels(b, camera, width, height).x,
        toPixels(a, camera, width, height).y - toPixels(b, camera, width, height).y,
      ) - halfWidthPx(a, camera, width, height) - halfWidthPx(b, camera, width, height);
    min = Math.min(min, gap);
  }
  return min;
}

/** Every bar's silhouette stays within the viewport at the camera's own aspect. */
function allBarsOnScreen(values: number[], width = CANVAS_WIDTH, height = CANVAS_HEIGHT): boolean {
  const camera = shippedCamera(values.length, width, height);
  const bars = layoutBar3D(values);
  for (const bar of bars.values()) {
    const centre = toPixels(bar, camera, width, height);
    const half = halfWidthPx(bar, camera, width, height);
    if (centre.x - half < 0 || centre.x + half > width) return false;
  }
  return true;
}

function run(values: number[], label: string) {
  const gap = adjacentGapPx(values);
  // eslint-disable-next-line no-console -- deliberate: read this to pin the toBeCloseTo values below.
  console.log(`${label}: adjacent gap = ${gap.toFixed(2)}px, all on screen = ${allBarsOnScreen(values)}`);
  return gap;
}

test('bubble/insertion/selection-sort worst case (16 bars) stays visibly separated on screen', () => {
  // Measured: 11.07px -- comfortably clear of the 3px floor.
  const values = Array.from({ length: 16 }, (_, i) => i + 1);
  const gap = run(values, '16 bars');
  expect(gap).toBeGreaterThan(MIN_GAP_PX);
  expect(gap).toBeCloseTo(11.07, 1);
  expect(allBarsOnScreen(values)).toBe(true);
});

test('merge/quick-sort worst case (24 bars) stays visibly separated on screen', () => {
  // Measured: 8.32px -- the tightest of the four cases here (more bars in
  // the same frustum width means a smaller angular slice per bar), but
  // still nearly 3x the 3px floor.
  const values = Array.from({ length: 24 }, (_, i) => i + 1);
  const gap = run(values, '24 bars');
  expect(gap).toBeGreaterThan(MIN_GAP_PX);
  expect(gap).toBeCloseTo(8.32, 1);
  expect(allBarsOnScreen(values)).toBe(true);
});

test("every sort lesson's defaultInput (6 or 8 values) stays visibly separated on screen", () => {
  // Measured: 18.88px / 18.28px. At this few bars the horizontal fit
  // alone would dolly the camera in closer, but cameraDistanceFor takes
  // the LARGER of the horizontal and vertical fits (see its own doc
  // comment) -- the vertical fit (fitting the tallest bar's full height)
  // dominates here, which is why these two numbers sit close together
  // instead of scaling down with n the way the 16/24-bar cases above do.
  const gap6 = run([5, 2, 9, 1, 7, 3], '6-bar defaultInput');
  const gap8 = run([5, 2, 9, 1, 7, 3, 8, 4], '8-bar defaultInput');
  expect(gap6).toBeGreaterThan(MIN_GAP_PX);
  expect(gap6).toBeCloseTo(18.88, 1);
  expect(gap8).toBeGreaterThan(MIN_GAP_PX);
  expect(gap8).toBeCloseTo(18.28, 1);
});

test('a single bar does not throw and sits on screen', () => {
  expect(allBarsOnScreen([42])).toBe(true);
});
