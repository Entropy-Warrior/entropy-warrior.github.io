import type { Shape3D, Vec3 } from '../../core/types';

// ═══════════════════════════════════════════════════════════════
// GRAPH - NETWORK CLUSTER STRUCTURE
// ═══════════════════════════════════════════════════════════════

// Elegant mathematical notation
export const EQUATION = "G = ∑ᵢ Cᵢ(r,φ)";
export const EQUATION_LATEX = "G = \\sum_i C_i(r,\\varphi)";
export const DESCRIPTION = "Network graph with clustered nodes";

export function generateGraph(pointCount: number): Shape3D {
  const positions: Vec3[] = [];
  const edges: [number, number][] = [];
  
  // Use fixed cluster count like legacy (7 clusters)
  const clusterCount = 7;
  const basePointsPerCluster = Math.floor(pointCount / clusterCount);
  const hubs: number[] = [];
  
  // Generate all positions with cluster assignment (like legacy)
  for (let c = 0; c < clusterCount; c++) {
    const clusterSize = c === clusterCount - 1 
      ? pointCount - positions.length 
      : basePointsPerCluster;
    const clusterStart = positions.length;
    
    // Random cluster center in 3D space (like legacy)
    const θc = Math.random() * 2 * Math.PI;
    const φc = Math.acos(2 * Math.random() - 1); // Random latitude
    const rc = 6 + Math.random() * 4; // Random radius between 6-10
    const center: Vec3 = [
      rc * Math.sin(φc) * Math.cos(θc),
      rc * Math.sin(φc) * Math.sin(θc),
      rc * Math.cos(φc)
    ];
    
    // Generate cluster points in spherical distribution (like legacy)
    const clusterPoints: Vec3[] = [];
    for (let i = 0; i < clusterSize; i++) {
      // Random spherical coordinates for true 3D distribution
      const theta = Math.random() * 2 * Math.PI; // Random azimuth
      const phi = Math.acos(2 * Math.random() - 1); // Random inclination for uniform sphere
      const radius = 3 * Math.random(); // Random radius from 0 to 3
      
      const ε = () => (Math.random() - 0.5) * 0.3; // Small noise
      const p: Vec3 = [
        center[0] + radius * Math.sin(phi) * Math.cos(theta) + ε(),
        center[1] + radius * Math.sin(phi) * Math.sin(theta) + ε(),
        center[2] + radius * Math.cos(phi) + ε()
      ];
      positions.push(p);
      clusterPoints.push(p);
    }
    
    // Calculate true 3D centroid (like legacy)
    const sum = clusterPoints.reduce(
      (acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]],
      [0, 0, 0]
    );
    const centroid: Vec3 = [sum[0] / clusterSize, sum[1] / clusterSize, sum[2] / clusterSize];
    
    // Find the point closest to the centroid (like legacy)
    let minDist = Infinity;
    let hubIdx = clusterStart;
    for (let i = 0; i < clusterPoints.length; i++) {
      const p = clusterPoints[i];
      const dist = Math.sqrt(
        (p[0] - centroid[0]) ** 2 + 
        (p[1] - centroid[1]) ** 2 + 
        (p[2] - centroid[2]) ** 2
      );
      if (dist < minDist) {
        minDist = dist;
        hubIdx = clusterStart + i;
      }
    }
    hubs.push(hubIdx);
  }
  
  // Hub-spoke edges with cycle (like legacy)
  for (let c = 0; c < clusterCount; c++) {
    const hub = hubs[c];
    const clusterStart = c * basePointsPerCluster;
    const clusterSize = c === clusterCount - 1 ? pointCount - clusterStart : basePointsPerCluster;
    
    // Connect hub to all points in its cluster (like legacy)
    for (let i = 0; i < clusterSize; i++) {
      const nodeIdx = clusterStart + i;
      if (nodeIdx !== hub) {
        edges.push([hub, nodeIdx]);
      }
    }
    
    // Connect to next hub in cycle, but check distance first (like legacy)
    const nextHub = hubs[(c + 1) % clusterCount];
    const hubPos = positions[hub];
    const nextHubPos = positions[nextHub];
    const dist = Math.sqrt(
      (hubPos[0] - nextHubPos[0]) ** 2 +
      (hubPos[1] - nextHubPos[1]) ** 2 +
      (hubPos[2] - nextHubPos[2]) ** 2
    );
    
    // Only connect if hubs are within reasonable distance (like legacy)
    if (dist < 15) {
      edges.push([hub, nextHub]);
    }
  }
  
  return {
    id: 'graph',
    type: 'mathematical',
    positions,
    edges,
    metadata: {
      name: 'Graph Network',
      equation: EQUATION,
      description: DESCRIPTION,
      complexity: 0.6, // Moderate complexity
      optimalPointRange: {
        min: 500,
        max: 1500,
        recommended: 1000
      },
      category: 'abstract',
      tags: ['network', 'cluster', 'graph', 'nodes']
    }
  };
}

// Simple Gaussian random number generator (Box-Muller transform)
function randomGaussian(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}