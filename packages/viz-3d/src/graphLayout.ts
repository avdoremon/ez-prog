import {
  forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation,
} from 'd3-force-3d';
import type { SimulationNodeDatum3D } from 'd3-force-3d';
import type { Position3D } from './layout.js';

export type { Position3D };

/**
 * Matches d3-force-3d's own default convergence point: with the
 * library's default alphaDecay (alphaMin ** (1/300)), alpha crosses
 * alphaMin at ~300 ticks of its normal async stepping. This is that
 * same point, just stepped synchronously instead.
 */
const SETTLE_TICKS = 300;

/** Repulsion between every pair of nodes (negative = push apart). */
const CHARGE_STRENGTH = -60;

/** Target rest length for an edge once settled. */
const LINK_DISTANCE = 3;

/**
 * Minimum center-to-center distance between two node spheres (radius 0.4
 * each, matching TreeView3D's node size, plus a visible gap).
 */
const COLLIDE_RADIUS = 1;

/**
 * Deterministic force-directed layout: same graph in, same settled
 * positions out, every time. d3-force-3d seeds its internal randomness
 * with a fixed constant and assigns un-set starting positions from each
 * node's array index alone, so nothing here needs its own seeding.
 * Runs to completion synchronously -- `.stop()` cancels the library's own
 * auto-started async timer immediately, then SETTLE_TICKS manual
 * `.tick()` calls step the simulation by hand before positions are read
 * -- no timers, no waiting, safe to call from a plain function.
 */
export function layoutGraph3D(
  nodeCount: number,
  edges: { from: number; to: number }[],
): Map<number, Position3D> {
  const nodes: SimulationNodeDatum3D[] = Array.from({ length: nodeCount }, () => ({}));
  const links = edges.map((e) => ({ source: e.from, target: e.to }));

  const simulation = forceSimulation(nodes, 3)
    .force('charge', forceManyBody().strength(CHARGE_STRENGTH))
    .force('link', forceLink(links).distance(LINK_DISTANCE))
    .force('center', forceCenter())
    .force('collide', forceCollide(COLLIDE_RADIUS))
    .stop();

  for (let i = 0; i < SETTLE_TICKS; i++) simulation.tick();

  const positions = new Map<number, Position3D>();
  nodes.forEach((n, i) => {
    positions.set(i, { x: n.x ?? 0, y: n.y ?? 0, z: n.z ?? 0 });
  });
  return positions;
}
