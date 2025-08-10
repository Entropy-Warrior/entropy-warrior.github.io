import type { Shape3D, Vec3 } from '../../core/types';

// ═══════════════════════════════════════════════════════════════
// GRAPH - NETWORK CLUSTER STRUCTURE
// ═══════════════════════════════════════════════════════════════

// Elegant mathematical notation
export const EQUATION = "G = ∑ᵢ Cᵢ(r,φ)";
export const EQUATION_LATEX = "G = \\sum_i C_i(r,\\varphi)";
export const DESCRIPTION = "Network graph with clustered nodes";

export function generateGraph(pointCount: number): Shape3D {
  // Random parameters for variety
  const clusterCount = 5 + Math.floor(Math.random() * 3); // 5-7 clusters
  const interClusterConnections = 0.1 + Math.random() * 0.2; // Connection probability
  const clusterDensity = 0.3 + Math.random() * 0.3; // Intra-cluster connection density
  const spatialSpread = 8 + Math.random() * 4; // Overall spatial spread
  
  const positions: Vec3[] = [];
  const edges: [number, number][] = [];
  
  // Points per cluster
  const basePointsPerCluster = Math.floor(pointCount / clusterCount);
  const clusterInfo: { center: Vec3; indices: number[]; hub: number }[] = [];
  
  // Generate clusters
  for (let c = 0; c < clusterCount; c++) {
    const clusterSize = c === clusterCount - 1 
      ? pointCount - positions.length 
      : basePointsPerCluster;
    
    // Random cluster center in 3D space
    const θ = (c / clusterCount) * 2 * Math.PI + Math.random() * 0.5;
    const φ = Math.acos(2 * Math.random() - 1); // Random latitude
    const r = spatialSpread * (0.7 + Math.random() * 0.3);
    
    const center: Vec3 = [
      r * Math.sin(φ) * Math.cos(θ),
      r * Math.sin(φ) * Math.sin(θ),
      r * Math.cos(φ)
    ];
    
    const clusterIndices: number[] = [];
    let hubIndex = positions.length; // First node is hub
    
    // Generate cluster nodes
    for (let i = 0; i < clusterSize; i++) {
      // Use Gaussian distribution around cluster center
      const nodeR = Math.abs(randomGaussian() * 2);
      const nodeθ = Math.random() * 2 * Math.PI;
      const nodeφ = Math.acos(2 * Math.random() - 1);
      
      const x = center[0] + nodeR * Math.sin(nodeφ) * Math.cos(nodeθ);
      const y = center[1] + nodeR * Math.sin(nodeφ) * Math.sin(nodeθ);
      const z = center[2] + nodeR * Math.cos(nodeφ);
      
      positions.push([x, y, z]);
      clusterIndices.push(positions.length - 1);
    }
    
    clusterInfo.push({ center, indices: clusterIndices, hub: hubIndex });
  }
  
  // Create intra-cluster edges (within clusters)
  clusterInfo.forEach(cluster => {
    const { indices, hub } = cluster;
    
    // Connect hub to some nodes (star topology)
    indices.forEach((idx, i) => {
      if (i > 0 && Math.random() < 0.7) {
        edges.push([hub, idx]);
      }
    });
    
    // Random connections within cluster
    for (let i = 0; i < indices.length; i++) {
      for (let j = i + 1; j < indices.length; j++) {
        if (Math.random() < clusterDensity) {
          edges.push([indices[i], indices[j]]);
        }
      }
    }
  });
  
  // Create inter-cluster edges (between clusters)
  for (let i = 0; i < clusterInfo.length; i++) {
    for (let j = i + 1; j < clusterInfo.length; j++) {
      // Connect hubs with higher probability
      if (Math.random() < interClusterConnections * 2) {
        edges.push([clusterInfo[i].hub, clusterInfo[j].hub]);
      }
      
      // Random connections between clusters
      const connections = Math.floor(Math.random() * 3);
      for (let k = 0; k < connections; k++) {
        const idx1 = clusterInfo[i].indices[
          Math.floor(Math.random() * clusterInfo[i].indices.length)
        ];
        const idx2 = clusterInfo[j].indices[
          Math.floor(Math.random() * clusterInfo[j].indices.length)
        ];
        edges.push([idx1, idx2]);
      }
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