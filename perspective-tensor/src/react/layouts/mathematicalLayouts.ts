import type { Vec3 } from '../utils/mathUtils';
import type { Layout } from '../utils/layoutUtils';
import { centerPositionsAndGetBounds, createSimpleBrightness } from '../utils/layoutUtils';

const N = 729; // 9^3 points
const TRANSFORM = { targetSize: 20, rot: { x: -0.3, y: 0.4 } };
// ═══════════════════════════════════════════════════════════════
// Unified transformation: rotate → scale to fit viewport
// ═══════════════════════════════════════════════════════════════

const transform = (positions: Vec3[]): Vec3[] => {
  const [cx, sx, cy, sy] = [TRANSFORM.rot.x, TRANSFORM.rot.y].flatMap(a => [Math.cos(a), Math.sin(a)]);
  const rotated = positions.map(([x, y, z]) => [x * cy - z * sy, y * cx - (x * sy + z * cy) * sx, y * sx + (x * sy + z * cy) * cx] as Vec3);
  
  const bounds = rotated.reduce((acc, p) => ({ min: p.map((v, i) => Math.min(acc.min[i], v)) as Vec3, max: p.map((v, i) => Math.max(acc.max[i], v)) as Vec3 }), 
    { min: [Infinity, Infinity, Infinity] as Vec3, max: [-Infinity, -Infinity, -Infinity] as Vec3 });
  
  const s = TRANSFORM.targetSize / Math.max(...bounds.max.map((v, i) => v - bounds.min[i]));
  return rotated.map(p => p.map(v => v * s) as Vec3);
};

// Shared layout generator
const makeLayout = (positions: Vec3[], edges: [number, number][]): Layout => {
  const t = transform(positions);
  const { centered, bounds } = centerPositionsAndGetBounds(t);
  return { positions: centered, edges, lineBrightness: createSimpleBrightness(edges.length, 0.8), bounds };
};

const noise = (ε: number) => () => (Math.random() - 0.5) * ε;

// ═══════════════════════════════════════════════════════════════
// TENSOR: Perfect 9³ cubic lattice in 3D space
// ψ(i) = 2.5·(i÷[81,9,1] mod 9 - 4) + ε
// Maps linear index i ∈ [0,729) to 3D grid coordinates
// ═══════════════════════════════════════════════════════════════
export const generateMathTensorLayout = (): Layout => {
  const ε = noise(0.15);
  const positions = Array.from({length: N}, (_, i) => 
    [81, 9, 1].map(d => 2.5 * ((~~(i/d) % 9) - 4) + ε()) as Vec3
  );
  const edges = positions.flatMap((_, i) => 
    [81, 9, 1].filter(d => i % d + d < N && ~~(i/d) % 9 < 8).map(d => [i, i + d] as [number, number])
  );
  return makeLayout(positions, edges);
};

// ═══════════════════════════════════════════════════════════════
// GRAPH: Golden ratio clusters with randomized 3D positions
// φ(i,c) = R_c·S(i/n_c)·e^(iφ) + C_c + ε
// Centers randomly distributed in 3D space for variety
// ═══════════════════════════════════════════════════════════════
export const generateMathGraphLayout = (): Layout => {
  const C = 7, ε = noise(0.3);
  
  // Generate all positions with cluster assignment
  const positions: Vec3[] = [];
  const hubs: number[] = [];
  const n = Math.floor(N / C);
  
  for (let c = 0; c < C; c++) {
    const size = c === C - 1 ? N - positions.length : n;
    const start = positions.length;
    
    // Random cluster center in 3D space (instead of Fibonacci sphere)
    const θc = Math.random() * 2 * Math.PI;
    const φc = Math.acos(2 * Math.random() - 1); // Random latitude
    const rc = 6 + Math.random() * 4; // Random radius between 6-10
    const center: Vec3 = [
      rc * Math.sin(φc) * Math.cos(θc),
      rc * Math.sin(φc) * Math.sin(θc),
      rc * Math.cos(φc)
    ];
    
    // Generate cluster points in a spherical distribution
    const clusterPoints: Vec3[] = [];
    for (let i = 0; i < size; i++) {
      // Use spherical distribution with some randomness
      // Random spherical coordinates for true 3D distribution
      const theta = Math.random() * 2 * Math.PI; // Random azimuth
      const phi = Math.acos(2 * Math.random() - 1); // Random inclination for uniform sphere
      const radius = 3 * Math.random(); // Random radius from 0 to 3
      
      const p: Vec3 = [
        center[0] + radius * Math.sin(phi) * Math.cos(theta) + ε(),
        center[1] + radius * Math.sin(phi) * Math.sin(theta) + ε(),
        center[2] + radius * Math.cos(phi) + ε()
      ];
      positions.push(p);
      clusterPoints.push(p);
    }
    
    // Calculate true 3D centroid: sum all coordinates then divide by count
    const sum = clusterPoints.reduce(
      (acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]],
      [0, 0, 0]
    );
    const centroid: Vec3 = [sum[0] / size, sum[1] / size, sum[2] / size];
    
    // Find the point closest to the centroid
    let minDist = Infinity;
    let hubIdx = start;
    for (let i = 0; i < clusterPoints.length; i++) {
      const p = clusterPoints[i];
      const dist = Math.sqrt(
        (p[0] - centroid[0]) ** 2 + 
        (p[1] - centroid[1]) ** 2 + 
        (p[2] - centroid[2]) ** 2
      );
      if (dist < minDist) {
        minDist = dist;
        hubIdx = start + i;
      }
    }
    hubs.push(hubIdx);
  }
  
  // Hub-spoke edges with cycle
  const edges: [number, number][] = [];
  for (let c = 0; c < C; c++) {
    const hub = hubs[c];
    const start = c * n;
    const size = c === C - 1 ? N - start : n;
    
    // Connect hub to all points in its cluster
    for (let i = 0; i < size; i++) {
      if (start + i !== hub) edges.push([hub, start + i]);
    }
    
    // Connect to next hub in cycle, but check distance first
    const nextHub = hubs[(c + 1) % C];
    const hubPos = positions[hub];
    const nextHubPos = positions[nextHub];
    const dist = Math.sqrt(
      (hubPos[0] - nextHubPos[0]) ** 2 +
      (hubPos[1] - nextHubPos[1]) ** 2 +
      (hubPos[2] - nextHubPos[2]) ** 2
    );
    
    // Only connect if hubs are within reasonable distance (not across the entire space)
    if (dist < 15) { // Reasonable threshold for hub connections
      edges.push([hub, nextHub]);
    }
  }
  
  return makeLayout(positions, edges);
};


// ═══════════════════════════════════════════════════════════════
// MORPH DISK: Flat spiral galaxy with random gap gradient
// Ψ₁(t) = √t·R·e^(iωt) + ε·z·k̂
// ═══════════════════════════════════════════════════════════════
const morphDisk = (ε: () => number): Vec3[] => {
  const spiralTightness = 8 + Math.random() * 8; // Random between 8-16 rotations
  const gapGradient = 0.3 + Math.random() * 0.5; // Random gap gradient 0.3-0.8
  
  return Array.from({length: N}, (_, i) => {
    const t = i / N;
    const θ = spiralTightness * Math.PI * t; // Random spiral tightness
    const r = 12 * Math.pow(t, gapGradient); // Random gap gradient via power
    
    // Extremely flat - true galaxy disk profile
    const z = 0.3 * (1 - t) * Math.cos(θ); // Minimal height, decreases outward
    
    return [
      r * Math.cos(θ) + ε(),
      r * Math.sin(θ) + ε(),
      z + ε()
    ] as Vec3;
  });
};

const generateDiskEdges = (): [number, number][] => {
  const edges: [number, number][] = [];
  
  // Only connect consecutive points along the spiral
  // This creates a clean spiral without cross-connections
  for (let i = 0; i < N - 1; i++) {
    edges.push([i, i + 1]);
  }
  
  // Optionally add sparse connections for the outer parts only
  // Skip every few points to reduce density but maintain structure
  for (let i = N * 0.7; i < N - 3; i += 3) {
    edges.push([i, i + 3]);
  }
  
  return edges;
};

// ═══════════════════════════════════════════════════════════════
// MORPH RIBBON: True Möbius strip with smooth continuous twist
// Ψ₂(u,v) = C(u) + v·R(u/2)·[n₁(u), n₂(u), n₃]
// ═══════════════════════════════════════════════════════════════
const morphRibbon = (ε: () => number): Vec3[] => {
  const strips = 27; // Number of strips across width
  const loops = Math.floor(N / strips); // Points along the strip
  
  return Array.from({length: N}, (_, i) => {
    const strip = i % strips;
    const loop = Math.floor(i / strips);
    
    // Parameters: u along strip [0,2π], v across width [-1,1]
    const u = (loop / loops) * 2 * Math.PI;
    const v = (strip / (strips - 1) - 0.5) * 2;
    
    // Center curve - a circle in 3D space
    const R = 10;
    const centerX = R * Math.cos(u);
    const centerY = R * Math.sin(u);
    const centerZ = 2 * Math.sin(3 * u); // Gentle 3D variation
    
    // Möbius twist: rotate the strip by u/2 as we go around
    const twist = u / 2; // 180° total rotation creates Möbius topology
    const width = 3.5;
    
    // Normal to the circle at point u
    const normalX = -Math.cos(u);
    const normalY = -Math.sin(u);
    
    // Binormal (perpendicular to both tangent and normal)
    const binormalZ = 1;
    
    // Apply twist rotation in the normal-binormal plane
    const ribbonX = normalX * Math.cos(twist);
    const ribbonY = normalY * Math.cos(twist);
    const ribbonZ = binormalZ * Math.sin(twist);
    
    return [
      centerX + v * width * ribbonX + ε(),
      centerY + v * width * ribbonY + ε(),
      centerZ + v * width * ribbonZ + ε()
    ] as Vec3;
  });
};

const generateRibbonEdges = (): [number, number][] => {
  const edges: [number, number][] = [];
  const W = 27;
  const loops = Math.floor(N / W);
  
  for (let i = 0; i < N; i++) {
    const strip = i % W;
    const loop = Math.floor(i / W);
    
    // Along width (connect strips)
    if (strip < W - 1) edges.push([i, i + 1]);
    
    // Along length (connect loops)
    if (loop < loops - 1) {
      edges.push([i, i + W]);
    } else {
      // Connect last loop to first loop with twist (Möbius closure)
      const targetStrip = W - 1 - strip; // Flip across width for twist
      const targetIdx = targetStrip;
      if (targetIdx < N) edges.push([i, targetIdx]);
    }
  }
  
  return edges;
};

// ═══════════════════════════════════════════════════════════════
// MORPH HELIX: Classic DNA double helix structure (no bridges)
// Ψ₃(t,s) = [R·cos(ωt + sπ), R·sin(ωt + sπ), h·t]
// ═══════════════════════════════════════════════════════════════
const morphHelix = (ε: () => number): Vec3[] => {
  const positions: Vec3[] = [];
  const pointsPerStrand = Math.floor(N / 2); // 50% per strand - no bridge points
  
  // Generate two helical strands
  for (let strand = 0; strand < 2; strand++) {
    const phase = strand * Math.PI; // 180° offset for opposite strand
    
    for (let i = 0; i < pointsPerStrand; i++) {
      const t = i / (pointsPerStrand - 1);
      const θ = 10 * Math.PI * t; // 5 complete turns
      const R = 6; // Fixed radius for clean helix
      const height = 25 * (t - 0.5); // Total height of 25 units
      
      positions.push([
        R * Math.cos(θ + phase) + ε(),
        R * Math.sin(θ + phase) + ε(),
        height + ε()
      ] as Vec3);
    }
  }
  
  // Fill any remaining points by slightly varying existing points
  while (positions.length < N) {
    const idx = positions.length % (2 * pointsPerStrand);
    const p = positions[idx];
    positions.push([
      p[0] + ε() * 0.5,
      p[1] + ε() * 0.5,
      p[2] + ε() * 0.5
    ] as Vec3);
  }
  
  return positions;
};

const generateHelixEdges = (): [number, number][] => {
  const edges: [number, number][] = [];
  const n = Math.floor(N / 2);
  
  // Strand 1 backbone
  for (let i = 0; i < n - 1; i++) {
    edges.push([i, i + 1]);
  }
  
  // Strand 2 backbone
  for (let i = n; i < 2 * n - 1 && i < N - 1; i++) {
    edges.push([i, i + 1]);
  }
  
  return edges;
};

// ═══════════════════════════════════════════════════════════════
// DISK GALAXY: Flat spiral galaxy layout
// ═══════════════════════════════════════════════════════════════
export const generateMathDiskGalaxyLayout = (): Layout => {
  const ε = noise(0.1);
  const positions = morphDisk(ε);
  const edges = generateDiskEdges();
  return makeLayout(positions, edges);
};

// ═══════════════════════════════════════════════════════════════
// MOBIUS RIBBON: Möbius strip layout
// ═══════════════════════════════════════════════════════════════
export const generateMathMobiusRibbonLayout = (): Layout => {
  const ε = noise(0.1);
  const positions = morphRibbon(ε);
  const edges = generateRibbonEdges();
  return makeLayout(positions, edges);
};

// ═══════════════════════════════════════════════════════════════
// DOUBLE HELIX: DNA double helix layout
// ═══════════════════════════════════════════════════════════════
export const generateMathDoubleHelixLayout = (): Layout => {
  const ε = noise(0.1);
  const positions = morphHelix(ε);
  const edges = generateHelixEdges();
  return makeLayout(positions, edges);
};
// ═══════════════════════════════════════════════════════════════
// TORUS KNOT: Elegant curve wrapping around a torus (p,q)-knot
// K(t) = [(R + r·cos(qt))·cos(pt), (R + r·cos(qt))·sin(pt), r·sin(qt)]
// ═══════════════════════════════════════════════════════════════
export const generateMathTorusKnotLayout = (): Layout => {
  const ε = noise(0.1);
  
  // Choose from interesting torus knot configurations
  // Ensure p and q are coprime (no common factors) for a true knot
  const knots = [
    {p: 2, q: 3},  // Trefoil knot
    {p: 3, q: 2},  // Trefoil knot (mirror)
    {p: 2, q: 5},  // Solomon's seal knot
    {p: 3, q: 4},  // More complex knot
    {p: 3, q: 5},  // Even more complex
    {p: 4, q: 5},  // Very intricate pattern
  ];
  
  const config = knots[Math.floor(Math.random() * knots.length)];
  const p = config.p;
  const q = config.q;
  const R = 8; // Major radius
  const r = 3; // Minor radius
  
  // Calculate GCD and LCM for proper closure
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const g = gcd(p, q);
  const lcm = (p * q) / g;
  
  // The knot completes one full cycle when t goes from 0 to 2π
  // We need lcm/p full rotations in the p direction and lcm/q in the q direction
  // This means we need to go from 0 to 2π * (lcm/gcd(p,q))
  const periods = lcm / Math.max(p, q);
  
  // Generate points along the ENTIRE knot path
  // Don't close it artificially - let the math close it naturally
  const positions = Array.from({length: N}, (_, i) => {
    // Map points evenly along the complete knot
    const t = (i / N) * 2 * Math.PI * periods;
    
    // Torus knot parametric equations
    const x = (R + r * Math.cos(q * t)) * Math.cos(p * t);
    const y = (R + r * Math.cos(q * t)) * Math.sin(p * t);
    const z = r * Math.sin(q * t);
    
    return [x + ε(), y + ε(), z + ε()] as Vec3;
  });
  
  // Connect adjacent points along the knot
  const edges: [number, number][] = [];
  
  // Calculate average edge length to set distance threshold
  let totalDist = 0;
  for (let i = 0; i < Math.min(10, N - 1); i++) {
    const dx = positions[i + 1][0] - positions[i][0];
    const dy = positions[i + 1][1] - positions[i][1];
    const dz = positions[i + 1][2] - positions[i][2];
    totalDist += Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
  const avgDist = totalDist / Math.min(10, N - 1);
  const maxDist = avgDist * 2; // Allow up to 2x average distance
  
  // Connect sequential points only if they're close enough
  for (let i = 0; i < N - 1; i++) {
    const dx = positions[i + 1][0] - positions[i][0];
    const dy = positions[i + 1][1] - positions[i][1];
    const dz = positions[i + 1][2] - positions[i][2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    if (dist < maxDist) {
      edges.push([i, i + 1]);
    }
  }
  
  // Check if we should close the loop
  const first = positions[0];
  const last = positions[N - 1];
  const closeDist = Math.sqrt(
    (first[0] - last[0]) ** 2 + 
    (first[1] - last[1]) ** 2 + 
    (first[2] - last[2]) ** 2
  );
  
  // Only close if distance is reasonable (within 2x average)
  if (closeDist < maxDist) {
    edges.push([N - 1, 0]);
  }
  
  return makeLayout(positions, edges);
};

// ═══════════════════════════════════════════════════════════════
// SPHERICAL HARMONICS: Beautiful oscillations on sphere surface
// S(θ,φ) = r(θ,φ)·[sin(θ)cos(φ), sin(θ)sin(φ), cos(θ)]
// where r(θ,φ) = R·(1 + A·Y_lm(θ,φ))
// ═══════════════════════════════════════════════════════════════
export const generateMathSphericalLayout = (): Layout => {
  const ε = noise(0.15);
  
  // Random spherical harmonic parameters
  const l = 3 + Math.floor(Math.random() * 3); // Degree (3-5)
  const m = Math.floor(Math.random() * (l + 1)); // Order (0 to l)
  const A = 0.3 + Math.random() * 0.3; // Amplitude (0.3-0.6)
  const R = 10; // Base radius
  
  const positions: Vec3[] = [];
  const gridSize = 27; // 27x27 grid for 729 points
  const actualRows = Math.ceil(N / gridSize);
  
  for (let i = 0; i < N; i++) {
    const row = Math.floor(i / gridSize);
    const col = i % gridSize;
    
    // Use cosine for θ to get even distribution (avoids clustering at poles)
    // This maps points evenly in terms of surface area
    const v = row / (actualRows - 1);
    const u = col / (gridSize - 1);
    
    // Even distribution: use arccos for latitude
    const θ = Math.acos(1 - 2 * v); // Maps evenly from north to south pole
    const φ = 2 * Math.PI * u; // Longitude wraps around
    
    // Simple spherical harmonic approximation
    const harmonic = Math.sin(l * θ) * Math.cos(m * φ);
    const r = R * (1 + A * harmonic);
    
    // Convert to Cartesian
    const x = r * Math.sin(θ) * Math.cos(φ);
    const y = r * Math.sin(θ) * Math.sin(φ);
    const z = r * Math.cos(θ);
    
    positions.push([x + ε(), y + ε(), z + ε()] as Vec3);
  }
  
  // Create a mesh grid on the sphere
  const edges: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const row = Math.floor(i / gridSize);
    const col = i % gridSize;
    
    // Connect to right neighbor (wrap around at the end)
    if (col < gridSize - 1) {
      edges.push([i, i + 1]);
    } else {
      // Connect last column to first column (wrap around)
      const wrapIndex = row * gridSize;
      if (wrapIndex < N) {
        edges.push([i, wrapIndex]);
      }
    }
    
    // Connect to bottom neighbor
    if (row < actualRows - 1 && i + gridSize < N) {
      edges.push([i, i + gridSize]);
    }
  }
  
  return makeLayout(positions, edges);
};

// ═══════════════════════════════════════════════════════════════
// HYPERCUBE: Classic 4D tesseract projected to 3D space
// 16 vertices at (±1, ±1, ±1, ±1), 32 edges
// Deterministic perspective projection for perfect "cube within cube"
// ═══════════════════════════════════════════════════════════════
export const generateMathHypercubeLayout = (): Layout => {
  const ε = noise(0.02); // Very small noise for subtle variation
  
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
  
  // Deterministic projection: w coordinate determines inner (-1) vs outer (+1) cube
  // No rotation needed - just use w directly for the perspective effect
  const outerScale = 6;  // Outer cube size
  const innerScale = 3;  // Inner cube size (exactly half for perfect centering)
  
  const vertices3D = vertices4D.map(([x, y, z, w]) => {
    // w = +1 gives outer cube (larger)
    // w = -1 gives inner cube (smaller, centered)
    const cubeScale = w > 0 ? outerScale : innerScale;
    return [
      cubeScale * x,
      cubeScale * y,
      cubeScale * z
    ] as Vec3;
  });
  
  // Identify which vertices belong to inner vs outer cube
  const innerVertices = new Set<number>();
  const outerVertices = new Set<number>();
  vertices4D.forEach((v, i) => {
    if (v[3] < 0) innerVertices.add(i);
    else outerVertices.add(i);
  });
  
  // Generate the 32 edges of the tesseract
  // An edge exists between vertices that differ by exactly one coordinate
  const tesseractEdges: [number, number][] = [];
  for (let i = 0; i < 16; i++) {
    for (let bit = 0; bit < 4; bit++) {
      const j = i ^ (1 << bit); // Flip one bit
      if (j > i) { // Avoid duplicates
        tesseractEdges.push([i, j]);
      }
    }
  }
  
  // Categorize edges:
  // - Inner cube edges (both vertices have w = -1)
  // - Outer cube edges (both vertices have w = +1)  
  // - Connecting edges (vertices have different w values)
  const innerEdges: [number, number][] = [];
  const outerEdges: [number, number][] = [];
  const connectingEdges: [number, number][] = [];
  
  tesseractEdges.forEach(([a, b]) => {
    const aInner = innerVertices.has(a);
    const bInner = innerVertices.has(b);
    
    if (aInner && bInner) {
      innerEdges.push([a, b]);
    } else if (!aInner && !bInner) {
      outerEdges.push([a, b]);
    } else {
      connectingEdges.push([a, b]);
    }
  });
  
  // Build final positions and edges
  const positions: Vec3[] = [];
  const edges: [number, number][] = [];
  
  // Add the 16 vertices first
  vertices3D.forEach(v => {
    positions.push([v[0] + ε(), v[1] + ε(), v[2] + ε()]);
  });
  
  // Calculate points to add per edge type to distribute N points
  const totalEdges = innerEdges.length + outerEdges.length + connectingEdges.length;
  const remainingPoints = N - 16;
  const basePointsPerEdge = Math.floor(remainingPoints / totalEdges);
  
  let currentIdx = 16;
  
  // Helper to add points along an edge
  const addEdgePoints = (edgeList: [number, number][], pointsPerEdge: number) => {
    edgeList.forEach(([a, b]) => {
      const edgeIndices: number[] = [a];
      
      // Add interpolated points along the edge
      for (let i = 1; i <= pointsPerEdge; i++) {
        const t = i / (pointsPerEdge + 1);
        const pos = lerpVec3(vertices3D[a], vertices3D[b], t);
        positions.push([pos[0] + ε(), pos[1] + ε(), pos[2] + ε()]);
        edgeIndices.push(currentIdx++);
      }
      
      edgeIndices.push(b);
      
      // Connect all points along this edge
      for (let i = 0; i < edgeIndices.length - 1; i++) {
        edges.push([edgeIndices[i], edgeIndices[i + 1]]);
      }
    });
  };
  
  // Add points along outer cube edges (12 edges)
  addEdgePoints(outerEdges, basePointsPerEdge);
  
  // Add points along inner cube edges (12 edges)
  addEdgePoints(innerEdges, basePointsPerEdge);
  
  // Add points along connecting edges (8 edges connecting corners)
  addEdgePoints(connectingEdges, basePointsPerEdge);
  
  // Fill remaining points on the outer cube surface (no internal clutter)
  while (positions.length < N) {
    // Place remaining points on outer cube edges only
    const edgeIdx = Math.floor(Math.random() * outerEdges.length);
    const [a, b] = outerEdges[edgeIdx];
    const t = Math.random();
    const pos = lerpVec3(vertices3D[a], vertices3D[b], t);
    positions.push([
      pos[0] + ε(),
      pos[1] + ε(), 
      pos[2] + ε()
    ]);
  }
  
  return makeLayout(positions, edges);
};

// Helper function for linear interpolation
const lerpVec3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] * (1 - t) + b[0] * t,
  a[1] * (1 - t) + b[1] * t,
  a[2] * (1 - t) + b[2] * t
];

// ═══════════════════════════════════════════════════════════════
// WORMHOLE: Asymmetric hyperboloid funnel with random parameters
// H(u,v) = [r(v)·(1+αsin(u))·cos(u), r(v)·(1+αsin(u))·sin(u), v·h]
// where r(v) = √(r0² + (v/a)²) creates hyperboloid shape
// ═══════════════════════════════════════════════════════════════
export const generateMathWormholeLayout = (): Layout => {
  const ε = noise(0.15);
  
  // Random hyperboloid parameters for variety
  const r0 = 0.8 + Math.random() * 0.7; // Throat radius (0.8-1.5) - much narrower
  const a = 0.15 + Math.random() * 0.2; // Shape parameter (0.15-0.35) - steeper slope
  const α = 0.2 + Math.random() * 0.3; // Asymmetry strength (0.2-0.5)
  
  // Single equation: asymmetric hyperboloid surface
  const positions = Array.from({length: N}, (_, i) => {
    const θ = (i % 27) / 27 * 2 * Math.PI; // Angle around hyperboloid
    const v = (Math.floor(i / 27) / 26 - 0.5) * 2; // Height parameter [-1, 1]
    
    // Hyperboloid radius: r = √(r0² + (v/a)²)
    const r = Math.sqrt(r0 * r0 + (v/a) * (v/a));
    
    // Asymmetry factor: varies with angle
    const asym = 1 + α * Math.sin(θ * 2); // Creates bulge on one side
    
    return [
      r * asym * Math.cos(θ) + ε(),
      r * asym * Math.sin(θ) + ε(),
      v * 12 + ε() // Increased vertical stretch for more dramatic slope
    ] as Vec3;
  });
  
  // Grid-based connections for mesh
  const edges: [number, number][] = [];
  const rings = Math.floor(N / 27);
  
  for (let i = 0; i < N; i++) {
    const ring = Math.floor(i / 27);
    const pos = i % 27;
    
    // Connect around ring
    if (pos < 26) edges.push([i, i + 1]);
    else edges.push([i, i - 26]); // Close the ring
    
    // Connect to next ring
    if (ring < rings - 1) edges.push([i, i + 27]);
  }
  
  return makeLayout(positions, edges);
};