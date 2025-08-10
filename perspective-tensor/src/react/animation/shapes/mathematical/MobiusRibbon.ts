import type { Shape3D, Vec3 } from '../../core/types';

// ═══════════════════════════════════════════════════════════════
// MÖBIUS RIBBON - NON-ORIENTABLE SURFACE
// ═══════════════════════════════════════════════════════════════

// Elegant mathematical notation
export const EQUATION = "M = {u,v} → ℝ³/~";
export const EQUATION_LATEX = "M = \\{u,v\\} \\to \\mathbb{R}^3/\\sim";
export const DESCRIPTION = "Möbius strip - a surface with only one side";

export function generateMobiusRibbon(pointCount: number, options?: {
  twists?: number;
}): Shape3D {
  // Use provided parameters or fallback to random/default values
  const twists = options?.twists ?? (Math.random() < 0.7 ? 1 : 3); // 70% single twist, 30% triple
  const width = 1.5 + Math.random() * 1.0; // Ribbon width
  const radius = 4 + Math.random() * 2; // Major radius
  const verticalWave = Math.random() * 0.3; // Vertical undulation
  const waveFreq = Math.floor(2 + Math.random() * 3); // Wave frequency
  
  const positions: Vec3[] = [];
  const edges: [number, number][] = [];
  
  // Calculate grid dimensions for roughly square distribution
  const uSteps = Math.ceil(Math.sqrt(pointCount * 3)); // More steps along strip
  const vSteps = Math.ceil(pointCount / uSteps);
  const actualCount = uSteps * vSteps;
  
  // Generate Möbius strip points
  for (let i = 0; i < actualCount && positions.length < pointCount; i++) {
    const ui = i % uSteps;
    const vi = Math.floor(i / uSteps);
    
    // Parameters u ∈ [0, 2π], v ∈ [-width/2, width/2]
    const u = (ui / (uSteps - 1)) * 2 * Math.PI;
    const v = (vi / (vSteps - 1) - 0.5) * width;
    
    // Möbius transformation with twist
    const halfTwist = (twists * u) / 2;
    
    // Position on centerline
    const centerX = radius * Math.cos(u);
    const centerY = radius * Math.sin(u);
    const centerZ = verticalWave * Math.sin(u * waveFreq);
    
    // Ribbon direction (perpendicular to centerline)
    const ribbonX = v * Math.cos(halfTwist) * Math.cos(u);
    const ribbonY = v * Math.cos(halfTwist) * Math.sin(u);
    const ribbonZ = v * Math.sin(halfTwist);
    
    positions.push([
      centerX + ribbonX,
      centerY + ribbonY,
      centerZ + ribbonZ
    ]);
  }
  
  // Create edges forming a mesh
  for (let ui = 0; ui < uSteps; ui++) {
    for (let vi = 0; vi < vSteps; vi++) {
      const idx = ui + vi * uSteps;
      
      // Connect along u direction (with wrapping for Möbius twist)
      const nextU = (ui + 1) % uSteps;
      const nextUIdx = nextU + vi * uSteps;
      if (nextUIdx < positions.length) {
        edges.push([idx, nextUIdx]);
      }
      
      // Connect along v direction
      if (vi < vSteps - 1) {
        const nextVIdx = ui + (vi + 1) * uSteps;
        if (nextVIdx < positions.length) {
          edges.push([idx, nextVIdx]);
        }
      }
    }
  }
  
  // Connect the twist (last u to first u with v-flip for Möbius property)
  for (let vi = 0; vi < vSteps; vi++) {
    const lastU = uSteps - 1;
    const flippedV = vSteps - 1 - vi;
    const idx1 = lastU + vi * uSteps;
    const idx2 = 0 + flippedV * uSteps;
    if (idx1 < positions.length && idx2 < positions.length) {
      edges.push([idx1, idx2]);
    }
  }
  
  return {
    id: 'mobius',
    type: 'mathematical',
    positions,
    edges,
    metadata: {
      name: 'Möbius Ribbon',
      equation: EQUATION,
      description: DESCRIPTION,
      complexity: 0.6, // Moderate complexity
      optimalPointRange: {
        min: 400,
        max: 1200,
        recommended: 800
      },
      category: 'geometric',
      tags: ['topology', 'non-orientable', 'surface', 'ribbon']
    }
  };
}