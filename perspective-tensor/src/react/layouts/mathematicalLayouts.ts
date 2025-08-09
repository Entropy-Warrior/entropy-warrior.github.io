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
  const φ = (1 + Math.sqrt(5)) / 2, C = 7, ε = noise(0.3);
  
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
    
    // Generate cluster points in a spherical distribution for true centroid
    const clusterPoints: Vec3[] = [];
    for (let i = 0; i < size; i++) {
      // Use Fibonacci sphere for even distribution within cluster
      const t = i / (size - 1);
      const inclination = Math.acos(1 - 2 * t);
      const azimuth = 2 * Math.PI * i * φ;
      const radius = 3 * (0.5 + 0.5 * Math.random()); // Vary radius for volume
      
      const p: Vec3 = [
        center[0] + radius * Math.sin(inclination) * Math.cos(azimuth) + ε(),
        center[1] + radius * Math.cos(inclination) + ε(),
        center[2] + radius * Math.sin(inclination) * Math.sin(azimuth) + ε()
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
    
    for (let i = 0; i < size; i++) {
      if (start + i !== hub) edges.push([hub, start + i]);
    }
    edges.push([hub, hubs[(c + 1) % C]]);
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

// ═══════════════════════════════════════════════════════════════
// MORPH: Select topology based on variant
// ═══════════════════════════════════════════════════════════════
export const generateMathHelixLayout = (variant?: number): Layout => {
  const v = variant ?? Math.floor(Math.random() * 3);
  const ε = noise(0.1);
  
  // Generate positions based on variant
  const positions = v === 0 ? morphDisk(ε) : v === 1 ? morphRibbon(ε) : morphHelix(ε);
  
  // Edge patterns specific to each topology
  const edges: [number, number][] = [];
  
  if (v === 0) { // Disk: spiral connections only between adjacent points
    for (let i = 0; i < N - 1; i++) {
      edges.push([i, i + 1]);
    }
  } else if (v === 1) { // Ribbon: grid pattern with Möbius closure
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
  } else { // Helix: two separate continuous strands
    const n = Math.floor(N / 2);
    for (let i = 0; i < n - 1; i++) {
      edges.push([i, i + 1]); // Strand 1 backbone
    }
    for (let i = n; i < 2 * n - 1 && i < N - 1; i++) {
      edges.push([i, i + 1]); // Strand 2 backbone
    }
  }
  
  return makeLayout(positions, edges);
};
// ═══════════════════════════════════════════════════════════════
// TORUS KNOT: Elegant curve wrapping around a torus (p,q)-knot
// K(t) = [(R + r·cos(qt))·cos(pt), (R + r·cos(qt))·sin(pt), r·sin(qt)]
// ═══════════════════════════════════════════════════════════════
export const generateMathTorusKnotLayout = (): Layout => {
  const ε = noise(0.1);
  
  // Random torus knot parameters for variety
  const p = 2 + Math.floor(Math.random() * 2); // 2 or 3 (wraps around torus axis)
  const q = 3 + Math.floor(Math.random() * 3); // 3, 4, or 5 (wraps through hole)
  const R = 8; // Major radius
  const r = 3; // Minor radius
  
  const positions = Array.from({length: N}, (_, i) => {
    const t = (i / N) * 2 * Math.PI;
    
    // Torus knot parametric equations
    const x = (R + r * Math.cos(q * t)) * Math.cos(p * t);
    const y = (R + r * Math.cos(q * t)) * Math.sin(p * t);
    const z = r * Math.sin(q * t);
    
    return [x + ε(), y + ε(), z + ε()] as Vec3;
  });
  
  // Connect adjacent points along the knot
  const edges: [number, number][] = [];
  for (let i = 0; i < N - 1; i++) {
    edges.push([i, i + 1]);
  }
  // Close the loop
  edges.push([N - 1, 0]);
  
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
  const gridSize = Math.ceil(Math.sqrt(N));
  
  for (let i = 0; i < N; i++) {
    const u = (i % gridSize) / (gridSize - 1);
    const v = Math.floor(i / gridSize) / (gridSize - 1);
    
    // Spherical coordinates
    const θ = Math.PI * v; // Polar angle (0 to π)
    const φ = 2 * Math.PI * u; // Azimuthal angle (0 to 2π)
    
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
    
    // Connect to right neighbor
    if (col < gridSize - 1) {
      edges.push([i, i + 1]);
    }
    // Connect to bottom neighbor
    if (row < gridSize - 1 && i + gridSize < N) {
      edges.push([i, i + gridSize]);
    }
  }
  
  return makeLayout(positions, edges);
};

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