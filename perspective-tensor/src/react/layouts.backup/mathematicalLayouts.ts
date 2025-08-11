import type { Vec3 } from '../animation/core/types';
import type { Layout } from '../animation/utils/layoutUtils';
import { centerPositionsAndGetBounds, createSimpleBrightness } from '../animation/utils/layoutUtils';

const DEFAULT_N = 1000; // Default point count (legacy)
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

// Legacy noise function (kept for compatibility)
const noise = (ε: number) => () => (Math.random() - 0.5) * ε;

// Universal physics-based Brownian motion: D ∝ 1/√(size)
// Einstein-Smoluchowski equation implementation
const universalBrownian = (localSize: number, baseAmplitude: number = 0.1) => {
  // Inverse square root relationship: smaller size → faster jiggling
  const sizeFactor = 1 / Math.sqrt(Math.max(localSize, 0.1)); // Avoid division by zero
  const amplitude = baseAmplitude * sizeFactor;
  return (Math.random() - 0.5) * amplitude;
};

// ═══════════════════════════════════════════════════════════════
// TENSOR: Perfect 9³ cubic lattice in 3D space
// ψ(i) = 2.5·(i÷[81,9,1] mod 9 - 4) + ε
// Maps linear index i ∈ [0,729) to 3D grid coordinates
// ═══════════════════════════════════════════════════════════════
export const generateMathTensorLayout = (customN?: number): Layout => {
  const N = customN ?? DEFAULT_N;
  const ε = noise(0.15);
  
  // Random tensor parameters for variety
  const spacing = 2.0 + Math.random() * 1.0; // Grid spacing (2.0-3.0)
  const skew = -0.1 + Math.random() * 0.1; // Grid skew (-0.2 to 0.2)
  const twist = Math.random() * 0.01; // Very subtle rotation twist (0-0.05 rad)
  
  console.log('📐 TENSOR REGENERATED:', { spacing: spacing.toFixed(2), skew: skew.toFixed(2), twist: twist.toFixed(2) });
  
  const positions = Array.from({length: N}, (_, i) => {
    const [x, y, z] = [81, 9, 1].map(d => spacing * ((~~(i/d) % 9) - 4));
    
    // Apply skew and twist transformations
    const skewedX = x + skew * y;
    const twistedX = skewedX * Math.cos(twist * z) - y * Math.sin(twist * z);
    const twistedY = skewedX * Math.sin(twist * z) + y * Math.cos(twist * z);
    
    return [twistedX + ε(), twistedY + ε(), z + ε()] as Vec3;
  });
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
export const generateMathGraphLayout = (customN?: number): Layout => {
  const N = customN ?? DEFAULT_N;
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
// DISK GALAXY: Flat spiral galaxy layout with random parameters
// f(t) = √t·R·e^(iωt) + ε·z·k̂
// ═══════════════════════════════════════════════════════════════
export const generateMathDiskGalaxyLayout = (customN?: number): Layout => {
  const N = customN ?? DEFAULT_N;
  const spiralTightness = 8 + Math.random() * 8; // Random between 8-16 rotations
  const gapGradient = 0.3 + Math.random() * 0.5; // Random gap gradient 0.3-0.8
  
  console.log('🌌 GALAXY REGENERATED:', { spiralTightness: spiralTightness.toFixed(1), gapGradient: gapGradient.toFixed(2) });
  
  // Generate galaxy with natural exponential distribution (no artificial bounds)
  const positions: Vec3[] = [];
  const scaleLength = 3.0; // Galaxy disk scale length R_D
  const maxReasonableU = 0.995; // Avoid ln(0) but let galaxy extend naturally
  
  for (let i = 0; i < N; i++) {
    // Make galaxy size independent of point count
    // Map points uniformly across the exponential distribution
    const linearT = i / (N - 1); // Use N-1 to include endpoints properly
    
    // Natural exponential distribution without artificial cutoff
    const u = linearT * maxReasonableU; // Scale to avoid mathematical singularity only
    const r = -scaleLength * Math.log(1 - u); // Pure exponential radial distribution
    const t = Math.min(r / 20, 1); // Normalize for calculations (20 = reasonable max for spiral calcs)
    
    // Spiral: continuous in one direction, tighter at center
    const spiralRate = spiralTightness / (1 + t * 2); // Decreases with radius (looser at edges)
    const θ = spiralTightness * Math.PI * t; // Simple continuous spiral
    
    // Flat galaxy disk with more noise in the center
    const baseHeight = 0.3 * (1 - t) * Math.cos(θ); // Minimal height, decreases outward
    const centerNoise = (Math.random() - 0.5) * 1.2 * (1 - t * 0.7); // More noise in center, less at edges
    const z = baseHeight + centerNoise;
    
    // Size-dependent Brownian motion: smaller radius = more jiggling
    const localSize = r; // Use actual radius as size measure
    
    positions.push([
      r * Math.cos(θ) + universalBrownian(localSize),
      r * Math.sin(θ) + universalBrownian(localSize),
      z + universalBrownian(localSize)
    ] as Vec3);
  }

  // Connect consecutive points along the spiral only
  const edges: [number, number][] = [];
  for (let i = 0; i < N - 1; i++) {
    edges.push([i, i + 1]);
  }
  
  return makeLayout(positions, edges);
};

// ═══════════════════════════════════════════════════════════════
// MOBIUS RIBBON: True Möbius strip with smooth continuous twist
// f(u,v) = C(u) + v·R(u/2)·[n₁(u), n₂(u), n₃]
// ═══════════════════════════════════════════════════════════════
export const generateMathMobiusRibbonLayout = (customN?: number): Layout => {
  const N = customN ?? DEFAULT_N;
  const ε = noise(0.1);
  
  // Smooth Möbius parameters for elegant appearance
  const strips = 24 + Math.floor(Math.random() * 5); // Strips across width (24-28) - fewer for smoothness
  const width = 3.0 + Math.random() * 0.8; // Ribbon width (3.0-3.8) - more consistent
  const verticalWave = 0.2 + Math.random() * 0.3; // Very subtle wave (0.2-0.5) - much smoother
  const waveFreq = 1; // Single smooth wave - no random frequency
  
  console.log('🎀 MOBIUS REGENERATED:', { strips, width: width.toFixed(2), verticalWave: verticalWave.toFixed(2), waveFreq });
  
  const positions = Array.from({length: N}, (_, i) => {
    // Map points uniformly around the Möbius strip regardless of N
    const t = i / (N - 1); // Uniform parameter [0,1] independent of N
    
    // Separate into strip (across width) and loop (along length) components
    const stripIndex = i % strips;
    const loopProgress = Math.floor(i / strips) / Math.floor((N - 1) / strips);
    
    // Parameters: u along strip [0,2π], v across width [-1,1]
    const u = loopProgress * 2 * Math.PI; // Always complete full loop
    const v = (stripIndex / (strips - 1) - 0.5) * 2;
    
    // Center curve - a circle in 3D space with random wave
    const R = 10;
    const centerX = R * Math.cos(u);
    const centerY = R * Math.sin(u);
    const centerZ = verticalWave * Math.sin(waveFreq * u); // Variable 3D wave
    
    // Möbius twist: rotate the strip by u/2 as we go around
    const twist = u / 2; // 180° total rotation creates Möbius topology
    
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

  const edges: [number, number][] = [];
  const effectiveLoops = Math.floor((N - 1) / strips);
  
  for (let i = 0; i < N; i++) {
    const strip = i % strips;
    const loop = Math.floor(i / strips);
    
    // Along width (connect strips)
    if (strip < strips - 1) edges.push([i, i + 1]);
    
    // Along length (connect loops) - ensure proper Möbius topology
    if (loop < effectiveLoops) {
      const nextLoopIdx = i + strips;
      if (nextLoopIdx < N) {
        edges.push([i, nextLoopIdx]);
      } else {
        // Möbius closure: connect to beginning with twist
        const targetStrip = strips - 1 - strip; // Flip across width for twist
        if (targetStrip < N) edges.push([i, targetStrip]);
      }
    }
  }
  
  return makeLayout(positions, edges);
};

// ═══════════════════════════════════════════════════════════════
// DOUBLE HELIX: Classic DNA double helix structure
// f(t,s) = [R·cos(ωt + sπ), R·sin(ωt + sπ), h·t]
// ═══════════════════════════════════════════════════════════════
export const generateMathDoubleHelixLayout = (customN?: number): Layout => {
  const N = customN ?? DEFAULT_N;
  
  // Random helix parameters for variety with spacing variation
  const baseRadius = 4 + Math.random() * 4; // Base helix radius (4-8)
  const radiusVariation = 1 + Math.random() * 2; // Linear spacing variation (1-3)
  const turns = 3 + Math.random() * 4; // Number of turns (3-7)
  const height = 20 + Math.random() * 10; // Total height (20-30)
  const phase2 = Math.PI + (Math.random() - 0.5) * 0.4; // Second strand phase (slight variation from 180°)
  
  console.log('🧬 HELIX REGENERATED:', { baseRadius: baseRadius.toFixed(2), radiusVariation: radiusVariation.toFixed(2), turns: turns.toFixed(1), height: height.toFixed(1), phase2: phase2.toFixed(2) });
  
  const positions: Vec3[] = [];
  const pointsPerStrand = Math.floor(N / 2); // 50% per strand - no bridge points
  
  // Generate two helical strands
  for (let strand = 0; strand < 2; strand++) {
    const phase = strand === 0 ? 0 : phase2; // Use variable phase for second strand
    
    for (let i = 0; i < pointsPerStrand; i++) {
      const t = i / (pointsPerStrand - 1);
      const θ = turns * 2 * Math.PI * t; // Variable number of turns
      const helixHeight = height * (t - 0.5); // Variable total height
      
      // Linear spacing variation: radius changes along the helix length
      const currentRadius = baseRadius + radiusVariation * t; // Linearly increases from base to base+variation
      
      // Size-dependent Brownian motion: use current radius as local size
      const localSize = currentRadius;
      
      positions.push([
        currentRadius * Math.cos(θ + phase) + universalBrownian(localSize),
        currentRadius * Math.sin(θ + phase) + universalBrownian(localSize),
        helixHeight + universalBrownian(localSize)
      ] as Vec3);
    }
  }
  
  // Fill any remaining points by slightly varying existing points
  while (positions.length < N) {
    const idx = positions.length % (2 * pointsPerStrand);
    const p = positions[idx];
    // Use same size-dependent Brownian motion for consistency
    const estimatedSize = Math.sqrt(p[0] * p[0] + p[1] * p[1]); // Estimate size from x,y distance
    positions.push([
      p[0] + universalBrownian(estimatedSize) * 0.5,
      p[1] + universalBrownian(estimatedSize) * 0.5,
      p[2] + universalBrownian(estimatedSize) * 0.5
    ] as Vec3);
  }

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
  
  return makeLayout(positions, edges);
};

// ═══════════════════════════════════════════════════════════════
// TORUS KNOT: Elegant curve wrapping around a torus (p,q)-knot
// K(t) = [(R + r·cos(qt))·cos(pt), (R + r·cos(qt))·sin(pt), r·sin(qt)]
// ═══════════════════════════════════════════════════════════════
export const generateMathTorusKnotLayout = (customN?: number): Layout => {
  const N = customN ?? DEFAULT_N;
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
  
  console.log('🪢 TORUS KNOT REGENERATED:', { type: `(${p},${q})`, description: p === 2 && q === 3 ? 'Trefoil' : p === 3 && q === 2 ? 'Trefoil Mirror' : 'Complex' });
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
export const generateMathSphericalLayout = (customN?: number): Layout => {
  const N = customN ?? DEFAULT_N;
  const ε = noise(0.15);
  
  // Random spherical harmonic parameters
  const l = 3 + Math.floor(Math.random() * 3); // Degree (3-5)
  const m = Math.floor(Math.random() * (l + 1)); // Order (0 to l)
  const A = 0.3 + Math.random() * 0.3; // Amplitude (0.3-0.6)
  
  console.log('🌍 SPHERICAL REGENERATED:', { degree: l, order: m, amplitude: A.toFixed(2) });
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
export const generateMathHypercubeLayout = (customN?: number): Layout => {
  const N = customN ?? DEFAULT_N;
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
// WORMHOLE: Truly asymmetric hyperboloid with different end shapes
// H(u,v) = [r(v)·A(v,u)·cos(u), r(v)·A(v,u)·sin(u), v·h]
// where r(v) and A(v,u) both vary to create asymmetric ends
// ═══════════════════════════════════════════════════════════════
export const generateMathWormholeLayout = (customN?: number): Layout => {
  const N = customN ?? DEFAULT_N;
  const ε = noise(0.15);
  
  // Balanced asymmetric parameters - both ends expand outward
  const r0 = 1.0 + Math.random() * 0.5; // Throat radius (1.0-1.5)
  const a1 = 1.2 + Math.random() * 0.6; // Exponential rate (1.2-1.8) -> e^(1/1.2) to e^(1/1.8) = 2.3 to 1.7  
  const a2 = 2.0 + Math.random() * 2.0; // Linear rate (2.0-4.0) -> final radius 3.0 to 5.5
  const α1 = 0.5 + Math.random() * 0.5; // Asymmetry strength at one end (0.5-1.0) 
  const α2 = 0.2 + Math.random() * 0.3; // Different asymmetry at other end (0.2-0.5)
  const spiral = 0.05 + Math.random() * 0.1; // Subtle spiral twist factor (0.05-0.15)
  
  // Debug: Log regeneration with parameter values to verify it's truly regenerating
  console.log('🌪️ WORMHOLE REGENERATED:', { r0: r0.toFixed(2), a1: a1.toFixed(2), a2: a2.toFixed(2), α1: α1.toFixed(2), α2: α2.toFixed(2) });
  
  // Single equation: truly asymmetric hyperboloid surface
  const positions = Array.from({length: N}, (_, i) => {
    const θ = (i % 27) / 27 * 2 * Math.PI; // Angle around hyperboloid
    const v = (Math.floor(i / 27) / 26 - 0.5) * 2; // Height parameter [-1, 1]
    
    // Truly asymmetric radius function - both ends expand outward with different curves
    let r: number;
    if (v >= 0) {
      // Top end: exponential expansion r = r0 * e^(v/a1)
      // At v=0: r=r0, At v=1: r=r0*e^(1/a1) ≈ r0*[1.7-2.3] = smooth curved expansion
      r = r0 * Math.exp(v / a1);
    } else {
      // Bottom end: linear expansion r = r0 + |v| * a2  
      // At v=0: r=r0, At v=-1: r=r0+a2 ≈ r0+[2-4] = controlled linear expansion
      r = r0 + Math.abs(v) * a2;
    }
    
    // Asymmetry strength varies by end
    const α = v >= 0 ? α1 : α2;
    
    // Gentle asymmetry factor: smooth variation with height
    const spiralAngle = θ + spiral * v; // Add spiral twist
    const asym = 1 + α * 0.3 * Math.sin(spiralAngle); // Much gentler variation for smoothness
    
    // Subtle smooth cylindrical variation - different sizes but smooth
    const endDeform = 1; // Keep perfectly smooth cylinders
    
    return [
      r * asym * endDeform * Math.cos(spiralAngle) + ε(),
      r * asym * endDeform * Math.sin(spiralAngle) + ε(),
      v * 12 + ε() // Vertical stretch
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

// ═══════════════════════════════════════════════════════════════
// 🍶 KLEIN BOTTLE LAYOUT  
// Non-orientable surface: f(u,v) = [x(u,v), y(u,v), z(u,v)]
// Inside becomes outside - famous topological shape
// ═══════════════════════════════════════════════════════════════
export const generateMathKleinBottleLayout = (customN?: number): Layout => {
  const N = customN ?? DEFAULT_N;
  const ε = noise(0.05);
  
  console.log('🍶 KLEIN BOTTLE REGENERATED: Using Three.js parametric approach');
  
  const positions: Vec3[] = [];
  const uSteps = Math.floor(Math.sqrt(N * 2)); // More steps in u for bottle shape
  const vSteps = Math.floor(N / uSteps);
  
  // Three.js Klein bottle parametric function
  function kleinBottleFunction(u: number, v: number): Vec3 {
    u *= Math.PI;
    v *= 2 * Math.PI;
    u = u * 2; // Critical: u needs to be doubled for proper Klein bottle shape
    
    let x, y, z;
    
    if (u < Math.PI) {
      x = 3 * Math.cos(u) * (1 + Math.sin(u)) + (2 * (1 - Math.cos(u) / 2)) * Math.cos(u) * Math.cos(v);
      z = -8 * Math.sin(u) - 2 * (1 - Math.cos(u) / 2) * Math.sin(u) * Math.cos(v);
    } else {
      x = 3 * Math.cos(u) * (1 + Math.sin(u)) + (2 * (1 - Math.cos(u) / 2)) * Math.cos(v + Math.PI);
      z = -8 * Math.sin(u);
    }
    
    y = -2 * (1 - Math.cos(u) / 2) * Math.sin(v);
    
    return [x, y, z];
  }
  
  for (let i = 0; i < N; i++) {
    const uIndex = i % uSteps;
    const vIndex = Math.floor(i / uSteps) % vSteps;
    
    // Normalized parameters [0, 1] - include the full range to close the bottle
    const u = uIndex / (uSteps - 1);
    const v = vIndex / (vSteps - 1);
    
    // Get Klein bottle position
    const [x, y, z] = kleinBottleFunction(u, v);
    
    positions.push([
      x + ε(),
      y + ε(),
      z + ε()
    ] as Vec3);
  }
  
  // Generate edges - simple grid without problematic wrapping
  const edges: [number, number][] = [];
  
  for (let vIndex = 0; vIndex < vSteps; vIndex++) {
    for (let uIndex = 0; uIndex < uSteps; uIndex++) {
      const i = vIndex * uSteps + uIndex;
      
      // Connect to next point in u direction
      // DON'T wrap around - this causes the twisted lines
      if (uIndex < uSteps - 1) {
        const nextU = vIndex * uSteps + (uIndex + 1);
        if (nextU < N) {
          edges.push([i, nextU]);
        }
      }
      
      // Connect to next point in v direction
      if (vIndex < vSteps - 1) {
        const nextV = (vIndex + 1) * uSteps + uIndex;
        if (nextV < N) {
          edges.push([i, nextV]);
        }
      }
    }
  }
  
  return makeLayout(positions, edges);
};