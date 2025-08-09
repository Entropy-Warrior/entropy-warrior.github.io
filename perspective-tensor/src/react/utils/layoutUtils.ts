import { distance3D } from './mathUtils';
import type { Vec3 } from './mathUtils';

// Re-export distance3D for convenience
export { distance3D };

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

// Edge generation utilities
export function connectGridNeighbors(
  grid: number,
  _positions: Vec3[]
): Edge[] {
  const edges: Edge[] = [];
  const gridSq = grid * grid;
  
  for (let z = 0; z < grid; z++) {
    const zOffset = z * gridSq;
    for (let y = 0; y < grid; y++) {
      const yOffset = y * grid;
      const baseIdx = zOffset + yOffset;
      for (let x = 0; x < grid; x++) {
        const idx = baseIdx + x;
        
        // Connect to +x neighbor
        if (x < grid - 1) {
          edges.push([idx, idx + 1]);
        }
        
        // Connect to +y neighbor
        if (y < grid - 1) {
          edges.push([idx, idx + grid]);
        }
        
        // Connect to +z neighbor
        if (z < grid - 1) {
          edges.push([idx, idx + gridSq]);
        }
      }
    }
  }
  
  return edges;
}

export function connectRingNeighbors(
  circularLines: number,
  dotsPerCircle: number,
  totalDots: number
): Edge[] {
  const edges: Edge[] = [];
  let dotIndex = 0;
  
  // Circular connections (rings)
  for (let ring = 0; ring < circularLines; ring++) {
    const dotsInThisRing = ring === circularLines - 1 ? totalDots - dotIndex : dotsPerCircle;
    
    for (let i = 0; i < dotsInThisRing; i++) {
      const currentDot = dotIndex + i;
      const nextDot = dotIndex + ((i + 1) % dotsInThisRing);
      edges.push([currentDot, nextDot]);
    }
    
    dotIndex += dotsInThisRing;
  }
  
  // Meridian connections (between rings)
  dotIndex = 0;
  for (let ring = 0; ring < circularLines - 1; ring++) {
    const dotsInCurrentRing = ring === circularLines - 2 ? 
      totalDots - dotIndex - dotsPerCircle : dotsPerCircle;
    const dotsInNextRing = ring === circularLines - 2 ? 
      totalDots - dotIndex - dotsInCurrentRing : dotsPerCircle;
    
    for (let i = 0; i < Math.min(dotsInCurrentRing, dotsInNextRing); i++) {
      const currentDot = dotIndex + i;
      const nextRingStart = dotIndex + dotsInCurrentRing;
      const correspondingDot = nextRingStart + i;
      
      if (correspondingDot < totalDots) {
        edges.push([currentDot, correspondingDot]);
      }
    }
    
    dotIndex += dotsInCurrentRing;
  }
  
  return edges;
}

// Simple uniform brightness for pre-existing edges
export function createSimpleBrightness(edgeCount: number, brightness: number = 1.0): number[] {
  return new Array(edgeCount).fill(brightness);
}
