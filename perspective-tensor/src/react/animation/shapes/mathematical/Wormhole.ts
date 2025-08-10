import type { Shape3D, Vec3 } from '../../core/types';

// ═══════════════════════════════════════════════════════════════
// WORMHOLE - HYPERBOLOID WITH TWIST
// ═══════════════════════════════════════════════════════════════

// Elegant mathematical notation
export const EQUATION = "W = ℍ × S¹";
export const EQUATION_LATEX = "W = \\mathbb{H} \\times S^1";
export const DESCRIPTION = "Hyperboloid × Circle - spacetime bridge";

export function generateWormhole(pointCount: number, options?: {
  twist?: number;
  noise?: number;
}): Shape3D {
  // Use provided parameters or fallback to random/default values
  const throatRadius = 0.8 + Math.random() * 0.6; // Minimum radius at throat
  const flareRate = 1.5 + Math.random() * 1.0; // How quickly it flares out
  const twist = options?.twist ?? (Math.random() * 0.5); // Twist factor
  const asymmetry = 0.8 + Math.random() * 0.4; // Asymmetry between ends
  const heightScale = 5 + Math.random() * 3; // Overall height
  
  const positions: Vec3[] = [];
  const edges: [number, number][] = [];
  
  // Calculate grid dimensions
  const uSteps = Math.ceil(Math.sqrt(pointCount * 2)); // Angular steps
  const vSteps = Math.ceil(pointCount / uSteps); // Height steps
  
  // Generate hyperboloid points
  for (let i = 0; i < uSteps * vSteps && positions.length < pointCount; i++) {
    const ui = i % uSteps;
    const vi = Math.floor(i / uSteps);
    
    // Parameters
    const u = (ui / (uSteps - 1)) * 2 * Math.PI; // Angle around
    const v = (vi / (vSteps - 1) - 0.5) * 2; // Height parameter [-1, 1]
    
    // Hyperboloid equation: x² + y² - z² = r₀²
    // Parametric form with twist
    const z = v * heightScale;
    const r = throatRadius * Math.sqrt(1 + Math.pow(v * flareRate, 2));
    
    // Apply asymmetry
    const asymFactor = v > 0 ? asymmetry : 1 / asymmetry;
    const finalR = r * asymFactor;
    
    // Add twist that varies with height
    const θ = u + twist * v * Math.PI;
    
    // Convert to Cartesian
    const x = finalR * Math.cos(θ);
    const y = finalR * Math.sin(θ);
    
    // Add some perturbation for organic feel
    const noise = options?.noise ?? 0.1;
    const nx = (Math.random() - 0.5) * noise;
    const ny = (Math.random() - 0.5) * noise;
    const nz = (Math.random() - 0.5) * noise;
    
    positions.push([x + nx, y + ny, z + nz]);
  }
  
  // Create edges forming the mesh
  for (let ui = 0; ui < uSteps; ui++) {
    for (let vi = 0; vi < vSteps; vi++) {
      const idx = ui + vi * uSteps;
      
      // Connect around circumference
      const nextU = (ui + 1) % uSteps;
      const nextUIdx = nextU + vi * uSteps;
      if (nextUIdx < positions.length) {
        edges.push([idx, nextUIdx]);
      }
      
      // Connect along height
      if (vi < vSteps - 1) {
        const nextVIdx = ui + (vi + 1) * uSteps;
        if (nextVIdx < positions.length) {
          edges.push([idx, nextVIdx]);
        }
        
        // Diagonal connections for stability
        const diagIdx = nextU + (vi + 1) * uSteps;
        if (diagIdx < positions.length && Math.random() > 0.5) {
          edges.push([idx, diagIdx]);
        }
      }
    }
  }
  
  return {
    id: 'wormhole',
    type: 'mathematical',
    positions,
    edges,
    metadata: {
      name: 'Wormhole',
      equation: EQUATION,
      description: DESCRIPTION,
      complexity: 0.7, // Moderate to high complexity
      optimalPointRange: {
        min: 600,
        max: 1500,
        recommended: 1000
      },
      category: 'cosmic',
      tags: ['spacetime', 'hyperboloid', 'bridge', 'relativistic']
    }
  };
}