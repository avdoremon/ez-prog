import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line, OrbitControls, Text } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Vector3 } from 'three';
import type { Mark, MarkKind } from '@cs/viz-core';
import { layoutTree3D, type Position3D } from './layout.js';
import { buildSceneSummary } from './sceneSummary.js';
import { colorForMarks, DEFAULT_COLOR, INK_COLOR } from './markColors.js';

export interface TreeView3DProps {
  state: number[];
  marks?: Mark[];
  label: string;
}

/**
 * A stable empty-array reference for the `marks` default parameter. A fresh
 * `[]` literal used as a default is a new object identity on every render,
 * which would defeat the `useMemo([state, marks])` below whenever a caller
 * omits `marks` entirely.
 */
const NO_MARKS: Mark[] = [];

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

export function TreeView3D({ state, marks = NO_MARKS, label }: TreeView3DProps) {
  const positions = useMemo(() => layoutTree3D(state), [state]);
  const edges = useMemo(() => edgesFor(state.length), [state.length]);
  const summary = useMemo(() => buildSceneSummary(state, marks), [state, marks]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  if (state.length === 0) {
    return <p className="tree-view-3d tree-view-3d--empty">{label}: empty</p>;
  }

  // Guards against a stale focusedIndex pointing past the end of a shrunk
  // `state` array. In practice Player remounts on every run (key={runId}),
  // resetting focusedIndex along with it, but this keeps the render safe
  // even if that ever changes.
  const hasFocusedNode = focusedIndex !== null && state[focusedIndex] !== undefined;
  const focusedPosition = hasFocusedNode ? (positions.get(focusedIndex!) ?? null) : null;
  const focusedKinds = hasFocusedNode ? marksForIndex(marks, focusedIndex!) : [];
  const focusedAnnouncement = hasFocusedNode
    ? `Node ${focusedIndex}, value ${state[focusedIndex!]}` +
      `${focusedKinds.length ? `, ${focusedKinds.join(' ')}` : ''}.`
    : null;
  // The text shown below the button strip: the focused node's detail while
  // a node is focused, the resting scene summary otherwise.
  const displayed = focusedAnnouncement ?? summary;

  return (
    <div className="tree-view-3d viz-3d">
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
                color={DEFAULT_COLOR}
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
                <Text
                  position={[0, 0.65, 0]}
                  fontSize={0.32}
                  color={INK_COLOR}
                  anchorX="center"
                  font="/fonts/IBMPlexMono-Regular.ttf"
                >
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
              onClick={() => setFocusedIndex(i)}
            >
              {value}
            </button>
          );
        })}
      </div>

      {/*
       * Visible, but deliberately not aria-live: Player's own aria-live
       * note region (packages/viz-react/src/Player.tsx) already announces
       * one sentence per frame regardless of which renderer is active. If
       * this element were also aria-live, its invariant "Binary tree, N
       * nodes, M levels." prefix would re-announce on every autoplay frame
       * alongside Player's note -- redundant noise, not new information.
       * Sighted users still see it update live (it's plain visible text);
       * screen-reader users get the one genuinely NEW piece of information
       * -- which node currently has keyboard focus -- from the hidden
       * live region below instead.
       */}
      <p className="tree-view-3d__summary">{displayed}</p>

      <p role="status" aria-live="polite" className="tree-view-3d__announcer visually-hidden">
        {focusedAnnouncement ?? ''}
      </p>
    </div>
  );
}
