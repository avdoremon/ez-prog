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
      y: depth === 0 ? 0 : -depth * LEVEL_HEIGHT_STEP,
      z: radius * Math.sin(angle),
    });
  }
  return positions;
}
