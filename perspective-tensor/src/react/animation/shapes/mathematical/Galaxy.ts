import type { Shape3D, Vec3 } from '../../core/types';

// ═══════════════════════════════════════════════════════════════
// GALAXY - SPIRAL DISK STRUCTURE
// ═══════════════════════════════════════════════════════════════

// Elegant mathematical notation
export const EQUATION = "r(θ) = θ^½ e^{iωθ}";
export const EQUATION_LATEX = "r(\\theta) = \\sqrt{\\theta} \\cdot e^{i\\omega\\theta}";
export const DESCRIPTION = "Flat spiral galaxy with logarithmic arms";

export function generateGalaxy(pointCount: number): Shape3D {
  // Random parameters for variety
  const arms = Math.floor(2 + Math.random() * 3); // 2-4 spiral arms
  const spiralTightness = 0.3 + Math.random() * 0.4; // How tight the spiral is
  const gapGradient = 0.1 + Math.random() * 0.15; // Gap between arms
  const centralBulge = 0.2 + Math.random() * 0.1; // Central bulge size
  
  const positions: Vec3[] = [];
  const edges: [number, number][] = [];
  
  // Generate spiral galaxy points
  for (let i = 0; i < pointCount; i++) {
    const t = i / pointCount;
    
    // Choose arm
    const armIndex = i % arms;
    const armOffset = (armIndex * 2 * Math.PI) / arms;
    
    // Logarithmic spiral with sqrt growth
    const r = Math.sqrt(t) * 10; // Radius grows with sqrt
    const θ = t * 4 * Math.PI * spiralTightness + armOffset;
    
    // Add some radial spread within arms
    const spread = (Math.random() - 0.5) * (1 - t) * 2; // More spread at center
    const finalR = r + spread;
    
    // Convert to Cartesian
    const x = finalR * Math.cos(θ);
    const y = finalR * Math.sin(θ);
    
    // Add vertical variation (disk thickness)
    const z = (Math.random() - 0.5) * Math.exp(-finalR / 5) * 2; // Thicker at center
    
    // Add central bulge effect
    const bulgeFactor = Math.exp(-finalR * centralBulge);
    const finalZ = z * (1 + bulgeFactor * 2);
    
    positions.push([x, y, finalZ]);
  }
  
  // Create edges connecting nearby points in same arm
  const pointsPerArm = Math.floor(pointCount / arms);
  for (let arm = 0; arm < arms; arm++) {
    for (let i = 0; i < pointsPerArm - 1; i++) {
      const idx = arm + i * arms;
      const nextIdx = arm + (i + 1) * arms;
      if (nextIdx < pointCount) {
        edges.push([idx, nextIdx]);
      }
    }
  }
  
  // Add some cross-connections for structure
  for (let i = 0; i < pointCount - arms; i += arms * 3) {
    for (let arm = 0; arm < arms - 1; arm++) {
      if (i + arm + 1 < pointCount) {
        edges.push([i + arm, i + arm + 1]);
      }
    }
  }
  
  return {
    id: 'galaxy',
    type: 'mathematical',
    positions,
    edges,
    metadata: {
      name: 'Galaxy',
      equation: EQUATION,
      description: DESCRIPTION,
      complexity: 0.7, // Moderate complexity
      optimalPointRange: {
        min: 500,
        max: 2000,
        recommended: 1200
      },
      category: 'cosmic',
      tags: ['spiral', 'astronomical', 'disk', 'logarithmic']
    }
  };
}