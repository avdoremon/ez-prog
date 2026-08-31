declare module 'd3-force-3d' {
  export interface SimulationNodeDatum3D {
    index?: number;
    x?: number;
    y?: number;
    z?: number;
    vx?: number;
    vy?: number;
    vz?: number;
    fx?: number | null;
    fy?: number | null;
    fz?: number | null;
  }

  export interface SimulationLinkDatum3D {
    source: number | SimulationNodeDatum3D;
    target: number | SimulationNodeDatum3D;
  }

  export interface Simulation3D<N extends SimulationNodeDatum3D> {
    tick(iterations?: number): Simulation3D<N>;
    stop(): Simulation3D<N>;
    force(name: string, force: unknown): Simulation3D<N>;
  }

  export function forceSimulation<N extends SimulationNodeDatum3D>(
    nodes: N[],
    numDimensions?: number,
  ): Simulation3D<N>;

  export interface ManyBodyForce {
    strength(value: number): ManyBodyForce;
  }
  export function forceManyBody(): ManyBodyForce;

  export interface LinkForce {
    distance(value: number): LinkForce;
  }
  export function forceLink<L extends SimulationLinkDatum3D>(links: L[]): LinkForce;

  export type CenterForce = Record<string, never>;
  export function forceCenter(x?: number, y?: number, z?: number): CenterForce;

  export interface CollideForce {
    strength(value: number): CollideForce;
  }
  export function forceCollide(radius?: number): CollideForce;

  export interface PositioningForce {
    strength(value: number): PositioningForce;
  }
  export function forceX(x?: number): PositioningForce;
  export function forceY(y?: number): PositioningForce;
  export function forceZ(z?: number): PositioningForce;
}
