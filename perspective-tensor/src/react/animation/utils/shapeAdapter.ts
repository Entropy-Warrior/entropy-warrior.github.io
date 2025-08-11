import type { Shape3D } from '../core/types';
import type { Layout } from './layoutUtils';
import { centerPositionsAndGetBounds } from './layoutUtils';
import { normalizeToUnitCube } from './transforms';

/**
 * Adapter to convert Shape3D format to Layout format for backward compatibility
 * This allows the new shape system to work with the existing animation infrastructure
 */
export function shapeToLayout(shape: Shape3D): Layout {
  // First normalize positions to unit cube for consistent scale
  const normalized = normalizeToUnitCube(shape.positions);
  
  // Then center positions and calculate bounds
  const { centered, bounds } = centerPositionsAndGetBounds(normalized);
  
  // Calculate line brightness based on edge distances
  const lineBrightness: number[] = [];
  
  if (shape.edges) {
    for (const edge of shape.edges) {
      const [a, b] = edge;
      if (a < centered.length && b < centered.length) {
        const dx = centered[a][0] - centered[b][0];
        const dy = centered[a][1] - centered[b][1];
        const dz = centered[a][2] - centered[b][2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        // Normalize brightness inversely proportional to distance
        // Shorter edges are brighter (more important structurally)
        const maxDist = Math.sqrt(
          Math.pow(bounds.maxX - bounds.minX, 2) + 
          Math.pow(bounds.maxY - bounds.minY, 2)
        );
        const brightness = 1.0 - Math.min(dist / maxDist, 1.0);
        lineBrightness.push(brightness);
      } else {
        lineBrightness.push(0.5); // Default brightness for invalid edges
      }
    }
  }
  
  return {
    positions: centered,
    edges: shape.edges || [],
    lineBrightness,
    bounds,
    isClusterEdge: undefined // Not used in mathematical shapes
  };
}

/**
 * Helper to check if a shape needs adaptation
 */
export function isShape3D(obj: any): obj is Shape3D {
  return obj && 
    typeof obj.id === 'string' &&
    typeof obj.type === 'string' &&
    Array.isArray(obj.positions) &&
    obj.metadata !== undefined;
}

/**
 * Smart adapter that handles both Shape3D and Layout formats
 */
export function ensureLayoutFormat(input: Shape3D | Layout): Layout {
  if (isShape3D(input)) {
    return shapeToLayout(input);
  }
  return input;
}