import type { Shape3D, Vec3 } from '../../core/types';

// ═══════════════════════════════════════════════════════════════
// HYPERCUBE - 4D TESSERACT PROJECTION
// ═══════════════════════════════════════════════════════════════

// Elegant mathematical notation
export const EQUATION = "□⁴ → ℝ³";
export const EQUATION_LATEX = "\\square^4 \\to \\mathbb{R}^3";
export const DESCRIPTION = "4D tesseract projected into 3D space";

export function generateHypercube(pointCount: number): Shape3D {
  // Random parameters for projection variety
  const scale = 4 + Math.random() * 2;
  const rotation4D = Math.random() * Math.PI / 4; // 4D rotation angle
  const projectionDistance = 3 + Math.random() * 2; // Perspective projection distance
  const innerScale = 0.5 + Math.random() * 0.3; // Inner cube scale factor
  
  // Generate 16 vertices of 4D hypercube
  const vertices4D: number[][] = [];
  for (let i = 0; i < 16; i++) {
    vertices4D.push([
      (i & 1) ? 1 : -1,
      (i & 2) ? 1 : -1,
      (i & 4) ? 1 : -1,
      (i & 8) ? 1 : -1
    ]);
  }
  
  // Apply 4D rotation (in XW plane for interesting projection)
  const cos4 = Math.cos(rotation4D);
  const sin4 = Math.sin(rotation4D);
  const rotated4D = vertices4D.map(v => [
    v[0] * cos4 - v[3] * sin4,
    v[1],
    v[2],
    v[0] * sin4 + v[3] * cos4
  ]);
  
  // Project from 4D to 3D (stereographic projection)
  const vertices3D: Vec3[] = rotated4D.map(v => {
    const w = v[3];
    const factor = projectionDistance / (projectionDistance - w);
    return [
      v[0] * factor * scale,
      v[1] * factor * scale,
      v[2] * factor * scale
    ] as Vec3;
  });
  
  const positions: Vec3[] = [...vertices3D];
  const edges: [number, number][] = [];
  
  // Generate hypercube edges (vertices that differ by one bit are connected)
  for (let i = 0; i < 16; i++) {
    for (let j = i + 1; j < 16; j++) {
      // Check if vertices differ by exactly one bit (Hamming distance = 1)
      const diff = i ^ j;
      if ((diff & (diff - 1)) === 0) { // Power of 2 check
        edges.push([i, j]);
      }
    }
  }
  
  // Add intermediate points along edges for point count
  const edgePoints: Vec3[] = [];
  const targetPoints = Math.min(pointCount - 16, pointCount * 0.8);
  const pointsPerEdge = Math.floor(targetPoints / edges.length);
  
  edges.forEach(([a, b]) => {
    for (let i = 1; i < pointsPerEdge; i++) {
      const t = i / pointsPerEdge;
      const point: Vec3 = [
        vertices3D[a][0] * (1 - t) + vertices3D[b][0] * t,
        vertices3D[a][1] * (1 - t) + vertices3D[b][1] * t,
        vertices3D[a][2] * (1 - t) + vertices3D[b][2] * t
      ];
      edgePoints.push(point);
    }
  });
  
  // Add face center points for remaining count
  const facePoints: Vec3[] = [];
  const remainingPoints = pointCount - positions.length - edgePoints.length;
  
  if (remainingPoints > 0) {
    // Add points on cube faces
    for (let face = 0; face < 6 && facePoints.length < remainingPoints; face++) {
      const faceCenter = calculateFaceCenter(vertices3D, face);
      facePoints.push(faceCenter);
      
      // Add points around face center
      for (let i = 0; i < 8 && facePoints.length < remainingPoints; i++) {
        const angle = (i / 8) * 2 * Math.PI;
        const radius = scale * 0.3;
        const offset: Vec3 = [
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          0
        ];
        
        // Rotate offset based on face orientation
        const rotatedOffset = rotateFaceOffset(offset, face);
        facePoints.push([
          faceCenter[0] + rotatedOffset[0],
          faceCenter[1] + rotatedOffset[1],
          faceCenter[2] + rotatedOffset[2]
        ]);
      }
    }
  }
  
  // Combine all points
  positions.push(...edgePoints, ...facePoints.slice(0, remainingPoints));
  
  // Regenerate edges for all points
  const allEdges: [number, number][] = [];
  
  // Original hypercube edges remain
  allEdges.push(...edges);
  
  // Connect edge points
  for (let i = 16; i < Math.min(positions.length - 1, 16 + edgePoints.length); i++) {
    if (i + 1 < positions.length) {
      allEdges.push([i, i + 1]);
    }
  }
  
  return {
    id: 'hypercube',
    type: 'mathematical',
    positions: positions.slice(0, pointCount),
    edges: allEdges,
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

function calculateFaceCenter(vertices: Vec3[], face: number): Vec3 {
  // Simple face center calculation for a cube
  const centers: Vec3[] = [
    [0, 0, vertices[0][2]], // front/back
    [0, 0, vertices[8][2]], 
    [vertices[0][0], 0, 0], // left/right
    [vertices[1][0], 0, 0],
    [0, vertices[0][1], 0], // top/bottom
    [0, vertices[2][1], 0]
  ];
  
  return centers[face] || [0, 0, 0];
}

function rotateFaceOffset(offset: Vec3, face: number): Vec3 {
  // Rotate offset based on which face we're on
  switch (face) {
    case 0: case 1: // front/back - no rotation needed
      return offset;
    case 2: case 3: // left/right - rotate around Y
      return [offset[2], offset[1], offset[0]];
    case 4: case 5: // top/bottom - rotate around X
      return [offset[0], offset[2], offset[1]];
    default:
      return offset;
  }
}