import type { Shape3D, Vec3 } from '../../core/types';

// ═══════════════════════════════════════════════════════════════
// HYPERCUBE - 4D TESSERACT PROJECTION
// ═══════════════════════════════════════════════════════════════

// Elegant mathematical notation
export const EQUATION = "□⁴ → ℝ³";
export const EQUATION_LATEX = "\\square^4 \\to \\mathbb{R}^3";
export const DESCRIPTION = "4D tesseract projected into 3D space";

export function generateHypercube(pointCount: number): Shape3D {
  const positions: Vec3[] = [];
  const edges: [number, number][] = [];
  
  // Generate the 16 vertices of the tesseract at (±1, ±1, ±1, ±1)
  const vertices4D: [number, number, number, number][] = [];
  for (let i = 0; i < 16; i++) {
    vertices4D.push([
      (i & 1) ? 1 : -1,      // x: bit 0
      (i & 2) ? 1 : -1,      // y: bit 1  
      (i & 4) ? 1 : -1,      // z: bit 2
      (i & 8) ? 1 : -1       // w: bit 3
    ]);
  }
  
  // FIRST PRINCIPLE: Show the 4D structure clearly with inner/outer cubes
  // Deterministic projection: w coordinate determines inner (-1) vs outer (+1) cube
  const outerScale = 6;  // Outer cube size
  const innerScale = 3;  // Inner cube size (exactly half for perfect centering)
  
  const vertices3D = vertices4D.map(([x, y, z, w]) => {
    const cubeScale = w > 0 ? outerScale : innerScale;
    return [cubeScale * x, cubeScale * y, cubeScale * z] as Vec3;
  });
  
  // Add the 16 vertices first
  vertices3D.forEach(v => {
    const ε = () => (Math.random() - 0.5) * 0.02; // Very small noise
    positions.push([v[0] + ε(), v[1] + ε(), v[2] + ε()]);
  });
  
  // Generate the 32 edges of the tesseract - these show the 4D structure
  const tesseractEdges: [number, number][] = [];
  for (let i = 0; i < 16; i++) {
    for (let bit = 0; bit < 4; bit++) {
      const j = i ^ (1 << bit); // Flip one bit
      if (j > i) { // Avoid duplicates
        tesseractEdges.push([i, j]);
      }
    }
  }
  
  // Add these structural edges - they are the core of what makes a hypercube
  edges.push(...tesseractEdges);
  
  // Add intermediate points along edges to reach target point count (like legacy)
  const totalEdges = tesseractEdges.length;
  const remainingPoints = pointCount - 16;
  const basePointsPerEdge = Math.floor(remainingPoints / totalEdges);
  
  let currentIdx = 16;
  
  // Add points along each hypercube edge
  tesseractEdges.forEach(([a, b]) => {
    const edgeIndices: number[] = [a];
    
    // Add interpolated points along the edge
    for (let i = 1; i <= basePointsPerEdge; i++) {
      const t = i / (basePointsPerEdge + 1);
      const pos: Vec3 = [
        vertices3D[a][0] * (1 - t) + vertices3D[b][0] * t,
        vertices3D[a][1] * (1 - t) + vertices3D[b][1] * t,
        vertices3D[a][2] * (1 - t) + vertices3D[b][2] * t
      ];
      const ε = () => (Math.random() - 0.5) * 0.02;
      positions.push([pos[0] + ε(), pos[1] + ε(), pos[2] + ε()]);
      edgeIndices.push(currentIdx++);
    }
    
    edgeIndices.push(b);
    
    // Connect all points along this edge
    for (let i = 0; i < edgeIndices.length - 1; i++) {
      edges.push([edgeIndices[i], edgeIndices[i + 1]]);
    }
  });
  
  // Fill any remaining points randomly on outer cube edges
  while (positions.length < pointCount) {
    const edgeIdx = Math.floor(Math.random() * tesseractEdges.length);
    const [a, b] = tesseractEdges[edgeIdx];
    const t = Math.random();
    const pos: Vec3 = [
      vertices3D[a][0] * (1 - t) + vertices3D[b][0] * t,
      vertices3D[a][1] * (1 - t) + vertices3D[b][1] * t,
      vertices3D[a][2] * (1 - t) + vertices3D[b][2] * t
    ];
    const ε = () => (Math.random() - 0.5) * 0.02;
    positions.push([pos[0] + ε(), pos[1] + ε(), pos[2] + ε()]);
  }
  
  return {
    id: 'hypercube',
    type: 'mathematical',
    positions: positions.slice(0, pointCount),
    edges,
    metadata: {
      name: 'Hypercube',
      equation: EQUATION,
      description: DESCRIPTION,
      complexity: 0.9, // High complexity
      optimalPointRange: {
        min: 600,
        max: 1500,
        recommended: 1000
      },
      category: 'geometric',
      tags: ['4D', 'tesseract', 'projection', 'higher-dimensional']
    }
  };
}

