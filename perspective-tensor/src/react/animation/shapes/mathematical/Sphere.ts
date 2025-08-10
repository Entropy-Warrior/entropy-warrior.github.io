import type { Shape3D, Vec3 } from '../../core/types';

// ═══════════════════════════════════════════════════════════════
// SPHERE - SPHERICAL HARMONICS
// ═══════════════════════════════════════════════════════════════

// Elegant mathematical notation
export const EQUATION = "S² = {x ∈ ℝ³ : |x| = 1}";
export const EQUATION_LATEX = "S^2 = \\{x \\in \\mathbb{R}^3 : |x| = 1\\}";
export const DESCRIPTION = "Unit sphere with spherical harmonic modulation";

export function generateSphere(pointCount: number): Shape3D {
  // Random spherical harmonic parameters
  const l = Math.floor(2 + Math.random() * 4); // Degree (2-5)
  const m = Math.floor(-l + Math.random() * (2 * l + 1)); // Order (-l to l)
  const amplitude = 0.2 + Math.random() * 0.3; // Harmonic amplitude
  const baseRadius = 5 + Math.random() * 2; // Base sphere radius
  
  const positions: Vec3[] = [];
  const edges: [number, number][] = [];
  
  // Use Fibonacci sphere for even distribution
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  
  for (let i = 0; i < pointCount; i++) {
    // Fibonacci sphere distribution
    const θ = 2 * Math.PI * i / goldenRatio; // Azimuthal angle
    const φ = Math.acos(1 - 2 * i / pointCount); // Polar angle
    
    // Spherical harmonic modulation (simplified)
    const harmonic = calculateSphericalHarmonic(l, m, θ, φ) * amplitude;
    const r = baseRadius * (1 + harmonic);
    
    // Convert to Cartesian
    const x = r * Math.sin(φ) * Math.cos(θ);
    const y = r * Math.sin(φ) * Math.sin(θ);
    const z = r * Math.cos(φ);
    
    positions.push([x, y, z]);
  }
  
  // Create edges using Delaunay-like connections for nearby points
  // For efficiency, we'll create a simple nearest-neighbor graph
  const maxEdgesPerPoint = 6;
  const maxDistance = baseRadius * 0.5;
  
  for (let i = 0; i < pointCount; i++) {
    const edgesFromPoint: number[] = [];
    
    // Find nearby points
    for (let j = i + 1; j < Math.min(i + 50, pointCount); j++) {
      const dist = distance(positions[i], positions[j]);
      
      if (dist < maxDistance && edgesFromPoint.length < maxEdgesPerPoint) {
        edges.push([i, j]);
        edgesFromPoint.push(j);
      }
    }
  }
  
  return {
    id: 'sphere',
    type: 'mathematical',
    positions,
    edges,
    metadata: {
      name: 'Sphere',
      equation: EQUATION,
      description: `${DESCRIPTION} Y(${l},${m})`,
      complexity: 0.4, // Moderate complexity
      optimalPointRange: {
        min: 500,
        max: 1500,
        recommended: 1000
      },
      category: 'geometric',
      tags: ['sphere', 'harmonic', 'surface', 'fibonacci']
    }
  };
}

// Simplified spherical harmonic calculation
function calculateSphericalHarmonic(l: number, m: number, θ: number, φ: number): number {
  // Very simplified - real spherical harmonics are more complex
  // This gives visually interesting results
  
  if (l === 0) return 1;
  
  if (l === 1) {
    if (m === -1) return Math.sin(φ) * Math.sin(θ);
    if (m === 0) return Math.cos(φ);
    if (m === 1) return Math.sin(φ) * Math.cos(θ);
  }
  
  if (l === 2) {
    if (m === -2) return Math.sin(φ) * Math.sin(φ) * Math.sin(2 * θ);
    if (m === -1) return Math.sin(φ) * Math.cos(φ) * Math.sin(θ);
    if (m === 0) return (3 * Math.cos(φ) * Math.cos(φ) - 1) / 2;
    if (m === 1) return Math.sin(φ) * Math.cos(φ) * Math.cos(θ);
    if (m === 2) return Math.sin(φ) * Math.sin(φ) * Math.cos(2 * θ);
  }
  
  // Higher orders - simplified patterns
  return Math.cos(l * φ) * Math.cos(m * θ);
}

function distance(a: Vec3, b: Vec3): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}