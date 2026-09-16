import type { Position3D } from './layout.js';

/** Matches the 0.8 sphere-diameter-floor unit scale the other 3D renderers use. */
export const BAR_WIDTH = 0.8;

/** Center-to-center spacing; leaves a 0.4 visible gap between adjacent bars at BAR_WIDTH. */
export const BAR_PITCH = 1.2;

/** The tallest bar's height, at the current run's own largest |value|. */
export const BAR_MAX_HEIGHT = 4;

/** A bar never renders shorter than this, so a zero (or near-zero) value stays visible. */
export const MIN_BAR_HEIGHT = 0.15;

/** Extra half-width, in world units, left on either side of the outermost bars when framing the camera. */
export const CAMERA_MARGIN = 1.5;

/** Camera never dollies in closer than this, however few bars there are. */
export const MIN_CAMERA_DISTANCE = 6;

export interface Bar3D extends Position3D {
  height: number;
  sign: 1 | -1;
}

export function layoutBar3D(values: number[]): Map<number, Bar3D> {
  const bars = new Map<number, Bar3D>();
  const n = values.length;
  if (n === 0) return bars;

  const maxAbs = Math.max(1, ...values.map((v) => Math.abs(v)));
  const scale = BAR_MAX_HEIGHT / maxAbs;

  for (let i = 0; i < n; i++) {
    const value = values[i]!;
    const sign: 1 | -1 = value < 0 ? -1 : 1;
    const height = Math.max(MIN_BAR_HEIGHT, Math.abs(value) * scale);
    const x = (i - (n - 1) / 2) * BAR_PITCH;
    const y = (sign * height) / 2;
    bars.set(i, { x, y, z: 0, height, sign });
  }

  return bars;
}

/**
 * Closed-form horizontal fit: BAR_PITCH is fixed regardless of n (bars
 * never crowd each other as n grows), so the only thing that changes with
 * n is the total row width -- which a perspective camera's horizontal
 * frustum width can fit exactly via trigonometry, without any empirical
 * search.
 *
 * A first version of this function fit ONLY this horizontal width and
 * left the vertical (bar height) fit unaddressed -- a real defect a
 * screenshot check caught (the same "a rendering defect DOM assertions
 * can't see" lesson `graph-intro`'s crowding bug and `dijkstra`'s weight
 * labels already taught this project): the tallest bar clipped through
 * the top of the canvas and showed severe perspective distortion, because
 * distance alone was never large enough to also fit the tallest bar's
 * full vertical extent (0 to BAR_MAX_HEIGHT for a positive value, or 0 to
 * -BAR_MAX_HEIGHT for a negative one) within the camera's own vertical
 * FOV. The fix takes the LARGER of the two distances the horizontal and
 * vertical fits each independently require -- whichever axis is more
 * demanding for the current n wins. See barProjection.test.ts for the
 * real on-screen check both axes are measured against.
 */
export function cameraDistanceFor(n: number, fovDegrees: number, aspect: number): number {
  const halfWidth = n <= 1
    ? BAR_WIDTH / 2 + CAMERA_MARGIN
    : ((n - 1) / 2) * BAR_PITCH + BAR_WIDTH / 2 + CAMERA_MARGIN;
  const vFovRad = (fovDegrees * Math.PI) / 180;
  const hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * aspect);
  const horizontalDistance = halfWidth / Math.tan(hFovRad / 2);

  // Vertical half-extent from the y=0 baseline: a single bar spans [0,
  // height] (positive) or [-height, 0] (negative), so BAR_MAX_HEIGHT is
  // the worst-case distance from the baseline to either a bar's top or
  // bottom -- covering the case where the current run's tallest positive
  // AND most negative values are both at their max magnitude.
  const verticalHalfExtent = BAR_MAX_HEIGHT + CAMERA_MARGIN;
  const verticalDistance = verticalHalfExtent / Math.tan(vFovRad / 2);

  return Math.max(MIN_CAMERA_DISTANCE, horizontalDistance, verticalDistance);
}
