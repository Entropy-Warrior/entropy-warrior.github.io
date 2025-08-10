import type { Shape3D, Vec3 } from '../../core/types';

// ═══════════════════════════════════════════════════════════════
// TORUS KNOT - KNOT WRAPPED AROUND TORUS
// ═══════════════════════════════════════════════════════════════

// Elegant mathematical notation
export const EQUATION = "T² = S¹ × S¹";
export const EQUATION_LATEX = "T^2 = S^1 \\times S^1";
export const DESCRIPTION = "(p,q)-torus knot wrapping around a torus";

export function generateTorusKnot(pointCount: number): Shape3D {
  // Random parameters for variety - choose coprime p,q for true knots
  const knots = [
    { p: 2, q: 3, name: 'Trefoil' },
    { p: 3, q: 2, name: 'Trefoil Mirror' },
    { p: 3, q: 4, name: 'Complex' },
    { p: 3, q: 5, name: 'Three-Five' },
    { p: 2, q: 5, name: 'Solomon' }
  ];
  const knot = knots[Math.floor(Math.random() * knots.length)];
  
  const majorRadius = 4 + Math.random() * 2; // Torus major radius
  const minorRadius = 1 + Math.random() * 0.5; // Torus minor radius
  const thickness = 0.1 + Math.random() * 0.1; // Knot thickness variation
  
  const positions: Vec3[] = [];
  const edges: [number, number][] = [];
  
  // Generate torus knot points
  for (let i = 0; i < pointCount; i++) {
    const t = (i / pointCount) * 2 * Math.PI;
    
    // (p,q)-torus knot parametric equations
    const r = majorRadius + minorRadius * Math.cos(knot.q * t);
    const x = r * Math.cos(knot.p * t);
    const y = r * Math.sin(knot.p * t);
    const z = minorRadius * Math.sin(knot.q * t);
    
    // Add slight thickness variation for visual interest
    const thicknessVar = thickness * Math.sin(t * 10);
    const nx = thicknessVar * Math.cos(t * 7);
    const ny = thicknessVar * Math.sin(t * 7);
    const nz = thicknessVar * Math.cos(t * 13);
    
    positions.push([x + nx, y + ny, z + nz]);
  }
  
  // Create edges connecting sequential points
  for (let i = 0; i < pointCount; i++) {
    const next = (i + 1) % pointCount; // Wrap around to close the knot
    edges.push([i, next]);
    
    // Add some longer-range connections for visual density
    if (i % 5 === 0) {
      const skip = (i + 3) % pointCount;
      edges.push([i, skip]);
    }
  }
  
  return {
    id: 'torusknot',
    type: 'mathematical',
    positions,
    edges,
    metadata: {
      name: `Torus Knot (${knot.p},${knot.q})`,
      equation: EQUATION,
      description: `${DESCRIPTION} - ${knot.name} knot`,
      complexity: 0.6, // Moderate complexity
      optimalPointRange: {
        min: 500,
        max: 1500,
        recommended: 1000
      },
      category: 'geometric',
      tags: ['topology', 'knot', 'torus', knot.name.toLowerCase()]
    }
  };
}