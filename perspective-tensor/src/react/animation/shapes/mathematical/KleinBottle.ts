import * as THREE from 'three';
import type { Shape3D, Vec3 } from '../../core/types';

// ═══════════════════════════════════════════════════════════════
// KLEIN BOTTLE - NON-ORIENTABLE SURFACE
// ═══════════════════════════════════════════════════════════════

// Elegant mathematical notation
export const EQUATION = "K = ℝP² # ℝP²";
export const EQUATION_LATEX = "K = \\mathbb{R}P^2 \\# \\mathbb{R}P^2";
export const DESCRIPTION = "Klein bottle - a surface with no inside or outside";

// Three.js standard Klein bottle parametric function (from ParametricGeometries.js)
function kleinBottleFunction(u: number, v: number, target: THREE.Vector3) {
  u *= Math.PI;
  v *= 2 * Math.PI;
  u = u * 2; // Critical: u needs to be doubled for proper Klein bottle shape
  
  let x, y, z;
  
  if (u < Math.PI) {
    x = 3 * Math.cos(u) * (1 + Math.sin(u)) + (2 * (1 - Math.cos(u) / 2)) * Math.cos(u) * Math.cos(v);
    z = -8 * Math.sin(u) - 2 * (1 - Math.cos(u) / 2) * Math.sin(u) * Math.cos(v);
  } else {
    x = 3 * Math.cos(u) * (1 + Math.sin(u)) + (2 * (1 - Math.cos(u) / 2)) * Math.cos(v + Math.PI);
    z = -8 * Math.sin(u);
  }
  
  y = -2 * (1 - Math.cos(u) / 2) * Math.sin(v);
  
  // Return the Klein bottle coordinates
  target.set(x, y, z);
}

export function generateKleinBottle(pointCount: number, options?: {
  twist?: number;
  noise?: number;
}): Shape3D {
  const positions: Vec3[] = [];
  const edges: [number, number][] = [];
  
  console.log('🍶 KLEIN BOTTLE REGENERATED: Using Three.js parametric approach');
  
  // Calculate grid dimensions
  const uSteps = Math.floor(Math.sqrt(pointCount * 2)); // More steps in u for bottle shape
  const vSteps = Math.floor(pointCount / uSteps);
  
  // Generate Klein bottle using Three.js parametric approach
  const target = new THREE.Vector3();
  
  for (let vIndex = 0; vIndex < vSteps; vIndex++) {
    for (let uIndex = 0; uIndex < uSteps; uIndex++) {
      // Normalized parameters [0, 1] - include the full range to close the bottle
      const u = uIndex / (uSteps - 1);  // Changed to include 1.0
      const v = vIndex / (vSteps - 1);
      
      // Use Three.js Klein bottle function
      kleinBottleFunction(u, v, target);
      
      // Extract position
      const x = target.x;
      const y = target.y;
      const z = target.z;
      
      // Add controlled noise for organic appearance
      const noise = options?.noise ?? 0.05;
      const ε = () => (Math.random() - 0.5) * noise;
      
      positions.push([x + ε(), y + ε(), z + ε()]);
    }
  }
  
  // Helper to calculate distance
  const dist = (p1: Vec3, p2: Vec3): number => {
    const dx = p1[0] - p2[0];
    const dy = p1[1] - p2[1];
    const dz = p1[2] - p2[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  };
  
  // Calculate typical edge length by sampling middle of surface
  let avgEdge = 0;
  let sampleCount = 0;
  const midV = Math.floor(vSteps / 2);
  for (let u = 0; u < Math.min(5, uSteps - 1); u++) {
    const idx1 = midV * uSteps + u;
    const idx2 = midV * uSteps + u + 1;
    if (idx1 < positions.length && idx2 < positions.length) {
      avgEdge += dist(positions[idx1], positions[idx2]);
      sampleCount++;
    }
  }
  avgEdge = sampleCount > 0 ? avgEdge / sampleCount : 1;
  const maxEdge = avgEdge * 3; // Allow some variation but not huge jumps
  
  // Create surface mesh - complete grid with wrap-around
  for (let vIndex = 0; vIndex < vSteps; vIndex++) {
    for (let uIndex = 0; uIndex < uSteps; uIndex++) {
      const i = vIndex * uSteps + uIndex;
      
      // Connect to next point in u direction
      if (uIndex < uSteps - 1) {
        const nextU = vIndex * uSteps + (uIndex + 1);
        if (nextU < positions.length) {
          edges.push([i, nextU]);
        }
      } else {
        // Wrap around: connect last to first in each row to close the loop
        const firstInRow = vIndex * uSteps;
        if (firstInRow < positions.length) {
          // Skip this edge connection - don't connect the ends
          // This prevents the twisted lines while keeping the shape complete
        }
      }
      
      // Connect to next point in v direction
      if (vIndex < vSteps - 1) {
        const nextV = (vIndex + 1) * uSteps + uIndex;
        if (nextV < positions.length) {
          edges.push([i, nextV]);
        }
      }
    }
  }
  
  return {
    id: 'klein',
    type: 'mathematical',
    positions,
    edges,
    metadata: {
      name: 'Klein Bottle',
      equation: EQUATION,
      description: DESCRIPTION,
      complexity: 0.8, // High complexity due to self-intersection
      optimalPointRange: {
        min: 800,
        max: 2000,
        recommended: 1500
      },
      category: 'geometric',
      tags: ['topology', 'non-orientable', 'surface', 'immersion', 'self-intersecting']
    }
  };
}