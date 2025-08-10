import type { Vec3 } from '../core/types';
import type { BrownianOffsets } from '../utils';

export interface Line {
  a: number;
  b: number;
  strength: number;
}

export interface RenderConfig {
  width: number;
  height: number;
  scale: number;
  centerX: number;
  centerY: number;
  modelCenterX: number;
  modelCenterY: number;
  nodeColor: string;
  lineColor: string;
  isDark: boolean;
  particleSizes: number[];
  brownianOffsets: BrownianOffsets;
  pointOpacity?: number;
  edgeOpacity?: number;
  showGrid?: boolean;
  panOffset?: { x: number; y: number };
}

export interface IRenderer {
  initialize(canvas: HTMLCanvasElement, width: number, height: number): void;
  render(
    particlePositions: Vec3[],
    lines: Line[],
    config: RenderConfig
  ): void;
  resize(width: number, height: number): void;
  dispose(): void;
  isWebGL(): boolean;
  setRotation?(rotationX: number, rotationY: number): void;
}