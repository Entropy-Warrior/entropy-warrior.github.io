import type { Vec3 } from '../core/types';
import { distance3D } from './mathUtils';

// Re-export distance3D for convenience
export { distance3D } from './mathUtils';

export type Edge = [number, number];

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface Layout {
  positions: Vec3[];
  edges: Edge[];
  lineBrightness: number[];
  bounds: Bounds;
  isClusterEdge?: boolean[];
}

// Common layout utilities
export function centerPositionsAndGetBounds(
  positions: Vec3[], 
  shiftLeft: number = 0
): { centered: Vec3[]; bounds: Bounds } {
  let sumX = 0, sumY = 0;
  for (let i = 0; i < positions.length; i++) {
    sumX += positions[i][0];
    sumY += positions[i][1];
  }
  const cx = sumX / Math.max(1, positions.length) - shiftLeft;
  const cy = sumY / Math.max(1, positions.length);

  const centered: Vec3[] = new Array(positions.length);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  
  for (let i = 0; i < positions.length; i++) {
    const x = positions[i][0] - cx;
    const y = positions[i][1] - cy;
    const z = positions[i][2];
    centered[i] = [x, y, z];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  
  return { centered, bounds: { minX, maxX, minY, maxY } };
}

// Simple uniform brightness for pre-existing edges
export function createSimpleBrightness(edgeCount: number, brightness: number = 1.0): number[] {
  return new Array(edgeCount).fill(brightness);
}