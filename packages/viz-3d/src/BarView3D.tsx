import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Vector3 } from 'three';
import type { Mark } from '@cs/viz-core';
import { BAR_PITCH, BAR_WIDTH, cameraDistanceFor, layoutBar3D, type Bar3D } from './barLayout.js';
import { buildBarSummary, resolveBarMarks } from './barSummary.js';
import { colorForMarks, INK_COLOR } from './markColors.js';

export interface BarView3DProps {
  state: (number | null)[];
  marks?: Mark[];
  label: string;
}

const NO_MARKS: Mark[] = [];

export const BAR_CAMERA_FOV = 50;

/** Fixed height above the baseline plane the camera sits at, angled down at the row. */
export const BAR_CAMERA_HEIGHT = 6;

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

function CameraRig({ focus, instant }: { focus: Bar3D | null; instant: boolean }) {
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

/**
 * Recomputes the camera's distance whenever the canvas's own aspect ratio
 * settles (react-three-fiber resizes the canvas to its CSS box after
 * mount), so the row fits the actual rendered aspect, not a guessed one.
 * Runs inside <Canvas> because it needs useThree for the live camera/size.
 */
function CameraDistanceRig({ n }: { n: number }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const distance = cameraDistanceFor(n, BAR_CAMERA_FOV, size.width / size.height);
    camera.position.set(0, BAR_CAMERA_HEIGHT, distance);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [n, size.width, size.height, camera]);
  return null;
}

export function BarView3D({ state, marks = NO_MARKS, label }: BarView3DProps) {
  const bars = useMemo(() => layoutBar3D(state), [state]);
  const resolved = useMemo(() => resolveBarMarks(marks, state.length), [marks, state.length]);
  const summary = useMemo(() => buildBarSummary(state, marks), [state, marks]);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  // Unlike TreeView3D/HierarchyView3D (whose graphs are fixed for a whole
  // lesson run and never legitimately empty, since every schema requires
  // at least one value), a plain array CAN legitimately be empty on some
  // frames of a single run -- heap's generator starts from an empty heap
  // and grows it one insert at a time. An early "nothing to ever show"
  // return here (as those two renderers have) would replace the entire
  // canvas/button-strip with a static placeholder on heap's very first
  // frame, breaking the whole page rather than just showing zero bars.
  // No special-casing is needed below: every computation already handles
  // state.length === 0 correctly (an empty bars map, a zero-item render
  // loop, buildBarSummary's own "Empty array." text).

  const hasFocusedBar = focusedIndex !== null && state[focusedIndex] !== undefined;
  const focusedBar = hasFocusedBar ? (bars.get(focusedIndex!) ?? null) : null;
  const focusedKinds = hasFocusedBar ? (resolved.get(focusedIndex!) ?? []) : [];
  const focusedValue = hasFocusedBar ? state[focusedIndex!] : null;
  const focusedAnnouncement = hasFocusedBar
    ? `Slot ${focusedIndex}, ${focusedValue === null ? 'empty' : `value ${focusedValue}`}` +
      `${focusedKinds.length ? `, ${focusedKinds.join(' ')}` : ''}.`
    : null;
  const displayed = focusedAnnouncement ?? summary;

  const halfRowWidth = state.length <= 1
    ? BAR_WIDTH
    : ((state.length - 1) / 2) * BAR_PITCH + BAR_WIDTH;

  return (
    <div className="bar-view-3d viz-3d">
      <div className="bar-view-3d__canvas-wrap" aria-hidden="true">
        <Canvas camera={{ position: [0, BAR_CAMERA_HEIGHT, 20], fov: BAR_CAMERA_FOV }}>
          <ambientLight intensity={0.7} />
          <pointLight position={[8, 10, 8]} />
          <CameraDistanceRig n={state.length} />
          <CameraRig focus={focusedBar} instant={reducedMotion} />
          <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[halfRowWidth * 2, 4]} />
            <meshStandardMaterial color="#2A313B" />
          </mesh>
          {state.map((value, i) => {
            const bar = bars.get(i)!;
            const color = colorForMarks(resolved.get(i) ?? []);
            return (
              <group key={i} position={[bar.x, bar.y, bar.z]}>
                <mesh>
                  <boxGeometry args={[BAR_WIDTH, bar.height, BAR_WIDTH]} />
                  {bar.isEmpty ? (
                    <meshStandardMaterial color={color} wireframe />
                  ) : (
                    <meshStandardMaterial color={color} />
                  )}
                </mesh>
                {!bar.isEmpty && (
                  <Text
                    position={[0, (bar.sign * bar.height) / 2 + bar.sign * 0.35, 0]}
                    fontSize={0.32}
                    color={INK_COLOR}
                    anchorX="center"
                    font="/fonts/IBMPlexMono-Regular.ttf"
                  >
                    {String(value)}
                  </Text>
                )}
              </group>
            );
          })}
        </Canvas>
      </div>

      <div className="bar-view-3d__bars" role="group" aria-label={label}>
        {state.map((value, i) => {
          const kinds = resolved.get(i) ?? [];
          const described = value === null ? 'empty' : `value ${value}`;
          return (
            <button
              key={i}
              type="button"
              className="bar-view-3d__bar-button"
              aria-label={`Slot ${i}, ${described}${kinds.length ? `, ${kinds.join(' ')}` : ''}`}
              onFocus={() => setFocusedIndex(i)}
              onBlur={() => setFocusedIndex(null)}
              onClick={() => setFocusedIndex(i)}
            >
              {value === null ? '·' : value}
            </button>
          );
        })}
      </div>

      <p className="bar-view-3d__summary">{displayed}</p>

      <p role="status" aria-live="polite" className="bar-view-3d__announcer visually-hidden">
        {focusedAnnouncement ?? ''}
      </p>
    </div>
  );
}
