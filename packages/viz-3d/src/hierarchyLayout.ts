import type { GraphEdge } from '@cs/viz-core';
import { LEVEL_HEIGHT_STEP, LEVEL_RADIUS_STEP, type Position3D } from './layout.js';

export type { Position3D };

/**
 * This renderer's own bounding radius -- NOT graphLayout.ts's LAYOUT_RADIUS
 * (5), which is calibrated for GraphView3D's force-settled shapes and its
 * own camera distance. At that radius, a chain longer than ~7 nodes
 * crushes below the sphere-diameter floor (0.8) no matter how the layout
 * is shaped -- verified directly, not assumed: for any chain under a
 * rescale-to-fit-the-farthest-node layout, the root-to-first-child gap is
 * independent of LEVEL_RADIUS_STEP/LEVEL_HEIGHT_STEP's actual values and
 * shrinks linearly with chain length (see the design spec's "Why a
 * bigger, renderer-specific bounding radius" section for the full
 * derivation).
 *
 * That derivation also shows a golden-angle spiral does NOT fix the
 * crush -- distance from the origin depends only on radius, never angle.
 * Scope that disproof carefully: it settles the BOUNDING-RADIUS question
 * and nothing else. It says nothing about the separate screen-space
 * problem (a well-spaced 3D arrangement can still project to overlapping
 * pixels when a run of nodes lines up with the camera's view direction --
 * see HierarchyView3D.tsx's camera constants and
 * hierarchyProjection.test.ts), where changing the angular scheme is
 * still an unexplored lever, not a ruled-out one.
 *
 * 15 gives a 16-node chain exactly 1.0 units of spacing (a 25% margin
 * over 0.8) -- that length is this constant's calibration anchor, not any
 * lesson's cap: neither `linked-list` (registry cap 7, rendering at most 8
 * nodes once its generator splices in the inserted one) nor `trie`
 * (registry cap 6 words x 4 chars, 25 nodes) is bound by this 3D floor --
 * both are bound by screen projection, checked in
 * hierarchyProjection.test.ts, which is stricter and catches shapes this
 * 3D check cannot (see that file, or HierarchyView3D.tsx's camera
 * constants, for why 3D distance alone doesn't predict what a learner
 * sees). hierarchyLayout.test.ts still exercises this 3D floor against
 * trie's ORIGINAL, larger worst case (6 words x 8 chars, 49 nodes,
 * settling at 1.5) as a calibration/regression check, even though that
 * shape is no longer reachable through the registry -- it remains a
 * strictly-harder input than anything the schema permits today.
 */
export const HIERARCHY_LAYOUT_RADIUS = 15;

/** The node with no incoming edge. Falls back to index 0 if none or more than one exists. */
function findRoot(nodeCount: number, edges: GraphEdge[]): number {
  const hasParent = new Array<boolean>(nodeCount).fill(false);
  for (const e of edges) hasParent[e.to] = true;
  const roots: number[] = [];
  for (let i = 0; i < nodeCount; i++) if (!hasParent[i]) roots.push(i);
  return roots.length === 1 ? roots[0]! : 0;
}

/** Each node's direct children, in edge-array order (preserves each generator's own insertion order). */
function childrenOf(nodeCount: number, edges: GraphEdge[]): number[][] {
  const children: number[][] = Array.from({ length: nodeCount }, () => []);
  for (const e of edges) children[e.from]!.push(e.to);
  return children;
}

/**
 * Deterministic radial layout for a rooted, singly-parented, acyclic graph
 * (a chain or a tree -- not a general graph with cycles, which
 * GraphView3D's force simulation handles instead). Each node inherits an
 * angular wedge from its parent (root gets the full circle); a node with
 * n children divides its own wedge into n equal sub-wedges, one per
 * child, in edge-array order. Deeper nodes sit lower (more negative y)
 * and farther out (larger radius), matching layoutTree3D's convention.
 * Settled positions are rescaled to HIERARCHY_LAYOUT_RADIUS so any shape
 * fits this renderer's camera regardless of node count.
 */
export function layoutHierarchy3D(
  nodeCount: number,
  edges: GraphEdge[],
): Map<number, Position3D> {
  const positions = new Map<number, Position3D>();
  if (nodeCount === 0) return positions;

  const root = findRoot(nodeCount, edges);
  const children = childrenOf(nodeCount, edges);
  const depth = new Array<number>(nodeCount).fill(0);
  const angleStart = new Array<number>(nodeCount).fill(0);
  const angleEnd = new Array<number>(nodeCount).fill(Math.PI * 2);
  const seen = new Array<boolean>(nodeCount).fill(false);
  seen[root] = true;

  const queue: number[] = [root];
  while (queue.length > 0) {
    const node = queue.shift()!;
    const kids = children[node]!.filter((c) => !seen[c]);
    const span = (angleEnd[node]! - angleStart[node]!) / (kids.length || 1);
    kids.forEach((child, i) => {
      seen[child] = true;
      depth[child] = depth[node]! + 1;
      angleStart[child] = angleStart[node]! + i * span;
      angleEnd[child] = angleStart[node]! + (i + 1) * span;
      queue.push(child);
    });
  }

  for (let i = 0; i < nodeCount; i++) {
    const d = depth[i]!;
    if (d === 0) {
      positions.set(i, { x: 0, y: 0, z: 0 });
    } else {
      const angle = (angleStart[i]! + angleEnd[i]!) / 2;
      const radius = d * LEVEL_RADIUS_STEP;
      positions.set(i, {
        x: radius * Math.cos(angle),
        y: -d * LEVEL_HEIGHT_STEP,
        z: radius * Math.sin(angle),
      });
    }
  }

  const maxRadius = [...positions.values()].reduce(
    (max, p) => Math.max(max, Math.hypot(p.x, p.y, p.z)), 0,
  );
  const scale = maxRadius === 0 ? 1 : HIERARCHY_LAYOUT_RADIUS / maxRadius;
  for (const [i, p] of positions) {
    positions.set(i, { x: p.x * scale, y: p.y * scale, z: p.z * scale });
  }

  return positions;
}
