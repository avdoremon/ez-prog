import {
  forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation,
  forceX, forceY, forceZ,
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

/**
 * Influences edge length relative to other forces -- NOT a literal target
 * distance once charge/collide are also in play; the post-simulation
 * rescale (LAYOUT_RADIUS) is what actually bounds the final scale.
 */
const LINK_DISTANCE = 3;

/**
 * Passed to forceCollide as each node's own collision radius; in practice,
 * at this graph's charge/link scale, repulsion already keeps nodes farther
 * apart than this constraint would require on its own.
 */
const COLLIDE_RADIUS = 1;

/**
 * Weak pull toward the origin on every axis, on top of forceCenter's mere
 * recentering. Without this, a node with no edges at all (graph-intro's
 * default input has one) has nothing to check forceManyBody's repulsion --
 * it drifts arbitrarily far from every connected node before the
 * simulation cools. The post-simulation rescale then fits the camera to
 * that one outlier, uniformly shrinking the actually-connected cluster
 * along with it -- confirmed by reproducing graph-intro's exact shape: at
 * gravity 0 the cluster's closest pair settled 0.552 apart post-rescale,
 * under the 0.8 sphere-diameter floor the connected-graph shapes (bfs,
 * dijkstra) never violated. 0.08 was chosen empirically: the smallest of
 * {0.05, 0.08, 0.1} tested that leaves a comfortable margin above 0.8 for
 * graph-intro's isolated-node shape (1.520) while barely perturbing the
 * already-shipped, already-visually-verified bfs/dijkstra layouts (their
 * own minimum pairwise distance moves from ~1.9-2.6 to ~2.0-2.7, not a
 * visible change in spread).
 */
const GRAVITY_STRENGTH = 0.08;

/**
 * Settled layouts are rescaled to this radius (about the origin, which
 * forceCenter already keeps as the layout's centroid) so any graph fits
 * the camera regardless of node count -- the force constants set
 * relative structure (which nodes are close/far), not absolute scale.
 * Matches layoutTree3D's own ~6-unit extent, the scale TreeView3D's
 * camera was calibrated against.
 */
export const LAYOUT_RADIUS = 5;

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
    .force('x', forceX(0).strength(GRAVITY_STRENGTH))
    .force('y', forceY(0).strength(GRAVITY_STRENGTH))
    .force('z', forceZ(0).strength(GRAVITY_STRENGTH))
    .stop();

  for (let i = 0; i < SETTLE_TICKS; i++) simulation.tick();

  const maxRadius = nodes.reduce(
    (max, n) => Math.max(max, Math.hypot(n.x ?? 0, n.y ?? 0, n.z ?? 0)),
    0,
  );
  const scale = maxRadius === 0 ? 1 : LAYOUT_RADIUS / maxRadius;

  const positions = new Map<number, Position3D>();
  nodes.forEach((n, i) => {
    positions.set(i, {
      x: (n.x ?? 0) * scale,
      y: (n.y ?? 0) * scale,
      z: (n.z ?? 0) * scale,
    });
  });
  return positions;
}
