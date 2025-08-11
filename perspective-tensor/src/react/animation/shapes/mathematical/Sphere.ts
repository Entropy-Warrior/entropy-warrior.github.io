import type { Shape3D, Vec3 } from '../../core/types';

// ═══════════════════════════════════════════════════════════════
// SPHERE - SPHERICAL HARMONICS
// ═══════════════════════════════════════════════════════════════

// Elegant mathematical notation
export const EQUATION = "S² = {x ∈ ℝ³ : |x| = 1}";
export const EQUATION_LATEX = "S^2 = \\{x \\in \\mathbb{R}^3 : |x| = 1\\}";
export const DESCRIPTION = "Unit sphere with spherical harmonic modulation";

export function generateSphere(pointCount: number): Shape3D {
  const positions: Vec3[] = [];
  const edges: [number, number][] = [];
  
  // Random spherical harmonic parameters (like legacy)
  const l = 3 + Math.floor(Math.random() * 3); // Degree (3-5)  
  const m = Math.floor(Math.random() * (l + 1)); // Order (0 to l)
  const amplitude = 0.3 + Math.random() * 0.3; // Amplitude (0.3-0.6)
  const baseRadius = 10; // Base radius
  
  // FIRST PRINCIPLE: Sphere should show latitude/longitude coordinate system
  // Create regular grid in spherical coordinates (like legacy)
  const gridSize = 27; // 27x27 grid for nice distribution
  const actualRows = Math.ceil(pointCount / gridSize);
  
  for (let i = 0; i < pointCount; i++) {
    const row = Math.floor(i / gridSize);
    const col = i % gridSize;
    
    // Even distribution using cosine mapping (avoids pole clustering)
    const v = row / (actualRows - 1);
    const u = col / (gridSize - 1);
    
    // Spherical coordinates with even area distribution
    const θ = Math.acos(1 - 2 * v); // Polar angle (even area distribution)
    const φ = 2 * Math.PI * u;      // Azimuthal angle
    
    // Spherical harmonic modulation (like legacy)
    const harmonic = Math.sin(l * θ) * Math.cos(m * φ);
    const r = baseRadius * (1 + amplitude * harmonic);
    
    // Convert to Cartesian
    const x = r * Math.sin(θ) * Math.cos(φ);
    const y = r * Math.sin(θ) * Math.sin(φ);
    const z = r * Math.cos(θ);
    
    // Add tiny noise like legacy
    const ε = () => (Math.random() - 0.5) * 0.15;
    positions.push([x + ε(), y + ε(), z + ε()]);
  }
  
  // FIRST PRINCIPLE: Show latitude and longitude grid lines
  // Create proper spherical mesh grid (like legacy)
  for (let i = 0; i < pointCount; i++) {
    const row = Math.floor(i / gridSize);
    const col = i % gridSize;
    
    // Connect to right neighbor (longitude lines)
    if (col < gridSize - 1) {
      edges.push([i, i + 1]);
    } else {
      // Wrap around longitude (connect last column to first)
      const wrapIndex = row * gridSize;
      if (wrapIndex < pointCount) {
        edges.push([i, wrapIndex]);
      }
    }
    
    // Connect to bottom neighbor (latitude lines)
    if (row < actualRows - 1 && i + gridSize < pointCount) {
      edges.push([i, i + gridSize]);
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
      tags: ['sphere', 'harmonic', 'surface', 'latitude', 'longitude']
    }
  };
}

