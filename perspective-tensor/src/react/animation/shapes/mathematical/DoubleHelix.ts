import type { Shape3D, Vec3 } from '../../core/types';

// ═══════════════════════════════════════════════════════════════
// DOUBLE HELIX - DNA STRUCTURE
// ═══════════════════════════════════════════════════════════════

// Elegant mathematical notation
export const EQUATION = "h(t) = r·e^{iωt} + ẑt";
export const EQUATION_LATEX = "h(t) = r \\cdot e^{i\\omega t} + \\hat{z}t";
export const DESCRIPTION = "DNA double helix with base pair connections";

export function generateDoubleHelix(pointCount: number): Shape3D {
  // Random parameters for variety
  const radius = 2 + Math.random() * 1; // Helix radius
  const radiusVariation = Math.random() * 0.3; // Radius variation
  const turns = 3 + Math.random() * 2; // Number of complete turns
  const height = 10 + Math.random() * 5; // Total height
  const phase = Math.PI; // Phase difference between strands
  const basePairDensity = 0.15 + Math.random() * 0.1; // Density of base pairs
  
  const positions: Vec3[] = [];
  const edges: [number, number][] = [];
  
  // Points per strand
  const pointsPerStrand = Math.floor(pointCount / 2);
  
  // Generate first helix strand
  const strand1Indices: number[] = [];
  for (let i = 0; i < pointsPerStrand; i++) {
    const t = i / (pointsPerStrand - 1);
    const θ = t * turns * 2 * Math.PI;
    const z = t * height - height / 2;
    
    // Vary radius slightly along the helix
    const r = radius * (1 + Math.sin(θ * 2) * radiusVariation);
    
    const x = r * Math.cos(θ);
    const y = r * Math.sin(θ);
    
    positions.push([x, y, z]);
    strand1Indices.push(positions.length - 1);
  }
  
  // Generate second helix strand (phase shifted)
  const strand2Indices: number[] = [];
  for (let i = 0; i < pointsPerStrand; i++) {
    const t = i / (pointsPerStrand - 1);
    const θ = t * turns * 2 * Math.PI + phase;
    const z = t * height - height / 2;
    
    // Vary radius slightly along the helix
    const r = radius * (1 + Math.sin(θ * 2) * radiusVariation);
    
    const x = r * Math.cos(θ);
    const y = r * Math.sin(θ);
    
    positions.push([x, y, z]);
    strand2Indices.push(positions.length - 1);
  }
  
  // Create edges along each strand
  for (let i = 0; i < pointsPerStrand - 1; i++) {
    edges.push([strand1Indices[i], strand1Indices[i + 1]]);
    edges.push([strand2Indices[i], strand2Indices[i + 1]]);
  }
  
  // Create base pair connections between strands
  const basePairStep = Math.max(1, Math.floor(1 / basePairDensity));
  for (let i = 0; i < pointsPerStrand; i += basePairStep) {
    edges.push([strand1Indices[i], strand2Indices[i]]);
    
    // Add diagonal supports for structural interest
    if (i > 0 && i < pointsPerStrand - 1 && Math.random() > 0.5) {
      edges.push([strand1Indices[i], strand2Indices[i - 1]]);
      edges.push([strand2Indices[i], strand1Indices[i - 1]]);
    }
  }
  
  return {
    id: 'helix',
    type: 'mathematical',
    positions,
    edges,
    metadata: {
      name: 'Double Helix',
      equation: EQUATION,
      description: DESCRIPTION,
      complexity: 0.5, // Moderate complexity
      optimalPointRange: {
        min: 400,
        max: 1200,
        recommended: 800
      },
      category: 'organic',
      tags: ['DNA', 'biological', 'spiral', 'molecular']
    }
  };
}