import type { Shape3D, Vec3 } from '../../core/types';

// ═══════════════════════════════════════════════════════════════
// GALAXY - SPIRAL DISK STRUCTURE
// ═══════════════════════════════════════════════════════════════

// Elegant mathematical notation
export const EQUATION = "r(θ) = θ^½ e^{iωθ}";
export const EQUATION_LATEX = "r(\\theta) = \\sqrt{\\theta} \\cdot e^{i\\omega\\theta}";
export const DESCRIPTION = "Flat spiral galaxy with logarithmic arms";

export function generateGalaxy(pointCount: number): Shape3D {
  const positions: Vec3[] = [];
  const edges: [number, number][] = [];
  
  // Galaxy parameters (like legacy but with more control)
  const spiralTightness = 8 + Math.random() * 8; // Spiral rotations (8-16)
  const scaleLength = 3.0; // Exponential disk scale length
  const maxReasonableU = 0.995; // Avoid mathematical singularity
  
  // Generate galaxy with natural exponential distribution (like legacy)
  for (let i = 0; i < pointCount; i++) {
    // Continuous spiral parameter (this is key - makes continuous spiral)
    const linearT = i / (pointCount - 1); // Uniform distribution [0,1]
    
    // Natural exponential radial distribution for realistic galaxy
    const u = linearT * maxReasonableU;
    const r = -scaleLength * Math.log(1 - u); // Exponential disk profile
    const t = Math.min(r / 20, 1); // Normalize for spiral calculations
    
    // Continuous spiral angle (creates single continuous arm)
    const θ = spiralTightness * Math.PI * t;
    
    // Flat galaxy disk with central thickness
    const baseHeight = 0.3 * (1 - t) * Math.cos(θ); 
    const centerNoise = (Math.random() - 0.5) * 1.2 * (1 - t * 0.7);
    const z = baseHeight + centerNoise;
    
    // Add small jitter for natural appearance
    const ε = () => (Math.random() - 0.5) * 0.1;
    
    positions.push([
      r * Math.cos(θ) + ε(),
      r * Math.sin(θ) + ε(),
      z + ε()
    ]);
  }
  
  // FIRST PRINCIPLE: Spiral arms are continuous flows of matter
  // Connect consecutive points along the single spiral (like legacy)
  for (let i = 0; i < pointCount - 1; i++) {
    edges.push([i, i + 1]);
  }
  
  // Add gravitational connections between nearby points (not in legacy, but physically meaningful)
  const gravityRadius = 2.5; // Maximum gravitational connection distance
  const maxConnections = Math.floor(pointCount * 0.02); // Limit total connections for performance
  let connectionCount = 0;
  
  for (let i = 0; i < pointCount && connectionCount < maxConnections; i += 10) { // Sample every 10th point
    for (let j = i + 10; j < pointCount && connectionCount < maxConnections; j += 10) {
      const dx = positions[i][0] - positions[j][0];
      const dy = positions[i][1] - positions[j][1];
      const dz = positions[i][2] - positions[j][2];
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
      
      if (dist < gravityRadius) {
        edges.push([i, j]);
        connectionCount++;
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