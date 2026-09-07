import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line, OrbitControls, Text } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Quaternion, Vector3 } from 'three';
import type { GraphState, Mark } from '@cs/viz-core';
import { layoutHierarchy3D, type Position3D } from './hierarchyLayout.js';
import { buildGraphSummary } from './graphSummary.js';
import { colorForMarks, INK_COLOR } from './markColors.js';
import {
  describeNeighbors, marksForEdge, marksForNode, neighborsOf,
} from './graphAccessibility.js';

export interface HierarchyView3DProps {
  state: GraphState;
  marks?: Mark[];
  label: string;
}

const NO_MARKS: Mark[] = [];
const NODE_FONT = '/fonts/IBMPlexMono-Regular.ttf';

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

/** Pans OrbitControls' target toward `focus` every frame -- lerp normally, snap when `instant`. */
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

/** A small cone near the target end of a directed edge, oriented along it. */
function ArrowHead({ from, to, color }: { from: Position3D; to: Position3D; color: string }) {
  const dir = new Vector3(to.x - from.x, to.y - from.y, to.z - from.z).normalize();
  const tip = new Vector3(to.x, to.y, to.z).sub(dir.clone().multiplyScalar(0.45));
  const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir);
  return (
    <mesh position={[tip.x, tip.y, tip.z]} quaternion={quaternion}>
      <coneGeometry args={[0.12, 0.3, 8]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

export function HierarchyView3D({ state, marks = NO_MARKS, label }: HierarchyView3DProps) {
  const { values, edges, directed = false } = state;
  // `state` comes from `snap()` (packages/viz-core/src/snap.ts), which deep-clones
  // on every frame -- `values`/`edges` get a fresh object identity each render even
  // when the graph's actual shape hasn't changed. Memoizing on those identities would
  // never hit, so memoize on a structural key instead (same pattern GraphView3D uses).
  const edgeKey = edges.map((e) => `${e.from}-${e.to}`).join(',');
  const positions = useMemo(
    () => layoutHierarchy3D(values.length, edges),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- edgeKey is edges' structural identity; values.length covers node count
    [values.length, edgeKey],
  );
  const summary = useMemo(
    () => buildGraphSummary(values.length, edges.length, directed),
    [values.length, edges.length, directed],
  );
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  if (values.length === 0) {
    return <p className="hierarchy-view-3d hierarchy-view-3d--empty">{label}: empty</p>;
  }

  const hasFocusedNode = focusedIndex !== null && values[focusedIndex] !== undefined;
  const focusedPosition = hasFocusedNode ? (positions.get(focusedIndex!) ?? null) : null;
  const focusedAnnouncement = hasFocusedNode
    ? `Node ${focusedIndex}, value ${values[focusedIndex!]}, ` +
      `${describeNeighbors(neighborsOf(focusedIndex!, values, edges, directed), directed)}.`
    : '';

  return (
    <div className="hierarchy-view-3d viz-3d">
      <div className="hierarchy-view-3d__canvas-wrap" aria-hidden="true">
        <Canvas camera={{ position: [0, 9, 36], fov: 50 }}>
          <ambientLight intensity={0.7} />
          <pointLight position={[8, 10, 8]} />
          <CameraRig focus={focusedPosition} instant={reducedMotion} />
          {edges.map((edge, edgeIndex) => {
            const a = positions.get(edge.from)!;
            const b = positions.get(edge.to)!;
            const color = colorForMarks(marksForEdge(marks, edge.from, edge.to, directed));
            const midpoint: [number, number, number] = [
              (a.x + b.x) / 2,
              (a.y + b.y) / 2,
              (a.z + b.z) / 2,
            ];
            return (
              <group key={`edge-${edgeIndex}`}>
                <Line points={[[a.x, a.y, a.z], [b.x, b.y, b.z]]} color={color} lineWidth={1} />
                {directed && <ArrowHead from={a} to={b} color={color} />}
                {edge.weight !== undefined && (
                  <Text
                    position={midpoint}
                    fontSize={0.28}
                    color={INK_COLOR}
                    anchorX="center"
                    font={NODE_FONT}
                  >
                    {String(edge.weight)}
                  </Text>
                )}
              </group>
            );
          })}
          {values.map((value, i) => {
            const p = positions.get(i)!;
            const color = colorForMarks(marksForNode(marks, i));
            return (
              <group key={i} position={[p.x, p.y, p.z]}>
                <mesh>
                  <sphereGeometry args={[0.4, 24, 24]} />
                  <meshStandardMaterial color={color} />
                </mesh>
                <Text
                  position={[0, 0.65, 0]}
                  fontSize={0.32}
                  color={INK_COLOR}
                  anchorX="center"
                  font={NODE_FONT}
                >
                  {String(value)}
                </Text>
              </group>
            );
          })}
        </Canvas>
      </div>

      <div className="hierarchy-view-3d__nodes" role="group" aria-label={label}>
        {values.map((value, i) => {
          const kinds = marksForNode(marks, i);
          const neighbors = neighborsOf(i, values, edges, directed);
          const kindsText = kinds.length ? `, ${kinds.join(' ')}` : '';
          return (
            <button
              key={i}
              type="button"
              className="hierarchy-view-3d__node-button"
              aria-label={
                `Node ${i}, value ${value}${kindsText}, ` +
                `${describeNeighbors(neighbors, directed)}`
              }
              onFocus={() => setFocusedIndex(i)}
              onBlur={() => setFocusedIndex(null)}
              onClick={() => setFocusedIndex(i)}
            >
              {value}
            </button>
          );
        })}
      </div>

      <p className="hierarchy-view-3d__summary">
        {hasFocusedNode ? focusedAnnouncement : summary}
      </p>
      <p role="status" aria-live="polite" className="hierarchy-view-3d__announcer visually-hidden">
        {focusedAnnouncement}
      </p>
    </div>
  );
}
