import type { Shape3D, Vec3 } from '../../core/types';

// ═══════════════════════════════════════════════════════════════
// KLEIN BOTTLE - NON-ORIENTABLE SURFACE
// ═══════════════════════════════════════════════════════════════

// Elegant mathematical notation
export const EQUATION = "K = ℝP² # ℝP²";
export const EQUATION_LATEX = "K = \\mathbb{R}P^2 \\# \\mathbb{R}P^2";
export const DESCRIPTION = "Klein bottle - a surface with no inside or outside";

export function generateKleinBottle(pointCount: number): Shape3D {
  // Random parameters for variety
  const scale = 3 + Math.random() * 2;
  const bottleRadius = 2 + Math.random() * 1;
  const neckRadius = 0.5 + Math.random() * 0.3;
  const twist = Math.random() * 0.5;
  
  const positions: Vec3[] = [];
  const edges: [number, number][] = [];
  
  // Calculate grid dimensions
  const uSteps = Math.ceil(Math.sqrt(pointCount * 1.5));
  const vSteps = Math.ceil(pointCount / uSteps);
  
  // Generate Klein bottle surface (immersed in 3D, figure-8 form)
  for (let i = 0; i < uSteps * vSteps && positions.length < pointCount; i++) {
    const ui = i % uSteps;
    const vi = Math.floor(i / uSteps);
    
    const u = (ui / (uSteps - 1)) * 2 * Math.PI;
    const v = (vi / (vSteps - 1)) * 2 * Math.PI;
    
    // Klein bottle parametric equations (figure-8 immersion)
    let x: number, y: number, z: number;
    
    const cu = Math.cos(u);
    const su = Math.sin(u);
    const cv = Math.cos(v);
    const sv = Math.sin(v);
    
    // Modified Klein bottle equation for better 3D visualization
    const r = bottleRadius * (1 - cu / 2);
    
    if (u < Math.PI) {
      x = 3 * cu * (1 + su) + r * cu * cv;
      y = 8 * su + r * su * cv;
    } else {
      x = 3 * cu * (1 + su) + r * Math.cos(v + Math.PI);
      y = 8 * su;
    }
    
    z = r * sv;
    
    // Apply scale and twist
    const twistedX = scale * (x * Math.cos(twist * v) - y * Math.sin(twist * v));
    const twistedY = scale * (x * Math.sin(twist * v) + y * Math.cos(twist * v));
    const scaledZ = scale * z;
    
    // Add slight noise for organic feel
    const noise = 0.05;
    const nx = (Math.random() - 0.5) * noise;
    const ny = (Math.random() - 0.5) * noise;
    const nz = (Math.random() - 0.5) * noise;
    
    positions.push([
      twistedX / 3 + nx,
      twistedY / 3 + ny,
      scaledZ / 3 + nz
    ]);
  }
  
  // Create edges forming the mesh
  for (let ui = 0; ui < uSteps; ui++) {
    for (let vi = 0; vi < vSteps; vi++) {
      const idx = ui + vi * uSteps;
      
      // Connect in u direction
      const nextU = (ui + 1) % uSteps;
      const nextUIdx = nextU + vi * uSteps;
      if (nextUIdx < positions.length) {
        edges.push([idx, nextUIdx]);
      }
      
      // Connect in v direction
      const nextV = (vi + 1) % vSteps;
      const nextVIdx = ui + nextV * uSteps;
      if (nextVIdx < positions.length) {
        edges.push([idx, nextVIdx]);
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
      complexity: 0.8, // High complexity
      optimalPointRange: {
        min: 800,
        max: 2000,
        recommended: 1400
      },
      category: 'geometric',
      tags: ['topology', 'non-orientable', 'surface', 'immersion']
    }
  };
}