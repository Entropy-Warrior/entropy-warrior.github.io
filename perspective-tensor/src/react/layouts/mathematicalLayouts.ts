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
// GRAPH: Golden ratio clusters with Fibonacci sphere distribution
// φ(i,c) = R_c·S(i/n_c)·e^(iφ) + C_c + ε
// Centers follow Fibonacci sphere, points spiral with golden ratio
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
    
    // Cluster center on Fibonacci sphere
    const θc = 2 * Math.PI * c * φ;
    const yc = 1 - 2 * c / (C - 1);
    const rc = Math.sqrt(1 - yc * yc) * 8;
    const center: Vec3 = [rc * Math.cos(θc), yc * 8, rc * Math.sin(θc)];
    
    // Generate cluster points and accumulate centroid
    let centroid: Vec3 = [0, 0, 0];
    for (let i = 0; i < size; i++) {
      const t = i / size;
      const θ = 2 * Math.PI * i * φ;
      const r = 3 * Math.sqrt(t);
      
      const p: Vec3 = [
        center[0] + r * Math.cos(θ) + ε(),
        center[1] + (2 * t - 1) * 2 + ε(),
        center[2] + r * Math.sin(θ) + ε()
      ];
      positions.push(p);
      centroid = [centroid[0] + p[0], centroid[1] + p[1], centroid[2] + p[2]];
    }
    
    // Find hub: closest to centroid
    centroid = [centroid[0]/size, centroid[1]/size, centroid[2]/size];
    hubs.push(start + positions.slice(start, start + size)
      .map((p, i) => ({ i, d: Math.hypot(p[0]-centroid[0], p[1]-centroid[1], p[2]-centroid[2]) }))
      .reduce((min, curr) => curr.d < min.d ? curr : min).i);
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
// MORPH: Unified parametric surface with smooth topology transitions
// Ψ(t,λ) = R(t,λ)·e^(iθ(t,λ)) + Z(t,λ)·k̂
// λ ∈ [0,1]: morphs from flat disk → twisted ribbon → double helix
// ═══════════════════════════════════════════════════════════════
export const generateMathHelixLayout = (variant?: number): Layout => {
  const Λ = [0.1, 0.4, 0.7, 0.95];
  const λ = variant !== undefined ? Λ[variant] : Math.random();
  const ε = noise(0.1);
  
  // Unified morphing equation using complex exponentials
  const positions = Array.from({length: N}, (_, i) => {
    const t = i / N;
    const s = i / (N - 1);
    
    // Smooth interpolation functions
    const α = λ * λ * λ; // Cubic for smooth acceleration
    const β = 1 - (1 - λ) * (1 - λ); // Quadratic ease-in
    
    // Unified angle: morphs from spiral to helix
    const θ = 2 * Math.PI * (8 * t + α * Math.floor(2 * s) * 0.5);
    
    // Unified radius: morphs from disk to double helix
    const R = 6 + 3 * Math.cos(4 * Math.PI * t) * (1 - α) + // Disk component
              β * 2 * Math.sin(Math.PI * s * 2); // Helix separation
    
    // Unified height: morphs from flat to vertical helix
    const Z = λ * (10 * (t - 0.5) + // Linear rise
                   3 * Math.sin(θ * λ) * (1 - λ * λ) + // Wave modulation
                   α * 2 * Math.cos(4 * Math.PI * t)); // Helix variation
    
    // Twist component for ribbon phase
    const twist = λ * (1 - λ) * 4; // Peaks at λ=0.5
    const φ = twist * Math.sin(2 * Math.PI * s);
    
    return [
      R * Math.cos(θ + φ) + ε(),
      R * Math.sin(θ + φ) + ε(),
      Z + ε()
    ] as Vec3;
  });
  
  // Elegant unified edge pattern
  const edges: [number, number][] = [];
  const step = Math.max(1, Math.floor((1 - λ) * 8 + λ * 27));
  
  for (let i = 0; i < N - 1; i++) {
    edges.push([i, i + 1]); // Backbone
    if (i + step < N && i % Math.floor(step / (1 + λ)) === 0) {
      edges.push([i, i + step]); // Cross-connections
    }
  }
  
  return makeLayout(positions, edges);
};
// ═══════════════════════════════════════════════════════════════
// WORMHOLE: Toroidal knot with golden ratio proportions
// T(t) = (R+r·cos(pθ))·e^(iqθ) + r·sin(pθ)·k̂
// (p,q) = (13,8) creates complex knot where 13/8 ≈ φ (golden ratio)
// ═══════════════════════════════════════════════════════════════
export const generateMathWormholeLayout = (): Layout => {
  const φ = (1 + Math.sqrt(5)) / 2; // Golden ratio for beauty
  const [R, r] = [10, 5]; // Major and minor radii
  const [p, q] = [13, 8]; // Coprime for complex knot (13:8 ~ φ)
  const ε = noise(0.2);
  
  // Elegant toroidal knot parametrization
  const positions = Array.from({length: N}, (_, i) => {
    const θ = 2 * Math.PI * i / N * q; // Parametric angle
    const ρ = R + r * Math.cos(p * θ / q); // Varying radius
    
    return [
      ρ * Math.cos(θ) + ε(),
      ρ * Math.sin(θ) + ε(),
      r * Math.sin(p * θ / q) + ε()
    ] as Vec3;
  });
  
  // Golden ratio edge pattern for wormhole topology
  const edges: [number, number][] = [];
  const stride = Math.floor(N * φ / 10); // Golden ratio stride
  
  for (let i = 0; i < N; i++) {
    // Primary helix
    edges.push([i, (i + 1) % N]);
    // Golden spiral connections
    if (i % Math.floor(φ * φ) === 0) {
      edges.push([i, (i + stride) % N]);
    }
  }
  
  return makeLayout(positions, edges);
};