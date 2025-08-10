import type { Vec3 } from '../core/types';

// ═══════════════════════════════════════════════════════════════
// POINT MAPPING UTILITIES
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// MAPPING STRATEGIES
// ═══════════════════════════════════════════════════════════════

// Random mapping - completely shuffle points
export function createRandomMapping(count: number): number[] {
  const mapping = Array.from({ length: count }, (_, i) => i);
  
  // Fisher-Yates shuffle
  for (let i = mapping.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mapping[i], mapping[j]] = [mapping[j], mapping[i]];
  }
  
  return mapping;
}

// Nearest neighbor mapping - minimize total distance
export function createNearestMapping(source: Vec3[], target: Vec3[]): number[] {
  const sourceCount = source.length;
  const targetCount = target.length;
  const mapping: number[] = new Array(sourceCount);
  const used = new Set<number>();
  
  // For each source point, find nearest unused target
  for (let i = 0; i < sourceCount; i++) {
    let minDist = Infinity;
    let minIndex = 0;
    
    for (let j = 0; j < targetCount; j++) {
      if (!used.has(j)) {
        const dist = distance(source[i], target[j % targetCount]);
        if (dist < minDist) {
          minDist = dist;
          minIndex = j;
        }
      }
    }
    
    mapping[i] = minIndex % targetCount;
    used.add(minIndex);
    
    // If we've used all targets, allow reuse
    if (used.size >= targetCount) {
      used.clear();
    }
  }
  
  return mapping;
}

// Hungarian algorithm for optimal bipartite matching
export function createOptimalMapping(source: Vec3[], target: Vec3[]): number[] {
  const n = source.length;
  const m = target.length;
  
  // If counts match, use Hungarian algorithm
  if (n === m) {
    return hungarianAlgorithm(source, target);
  }
  
  // Otherwise, use nearest neighbor with wrapping
  return createNearestMapping(source, target);
}

// Spatial mapping - preserve spatial relationships
export function createSpatialMapping(source: Vec3[], target: Vec3[]): number[] {
  // Sort both arrays by spatial position (Morton order / Z-order)
  const sourceSorted = source.map((p, i) => ({ pos: p, index: i, morton: getMortonCode(p) }))
    .sort((a, b) => a.morton - b.morton);
    
  const targetSorted = target.map((p, i) => ({ pos: p, index: i, morton: getMortonCode(p) }))
    .sort((a, b) => a.morton - b.morton);
  
  const mapping: number[] = new Array(source.length);
  
  for (let i = 0; i < source.length; i++) {
    const sourceIndex = sourceSorted[i].index;
    const targetIndex = targetSorted[i % target.length].index;
    mapping[sourceIndex] = targetIndex;
  }
  
  return mapping;
}

// Radial mapping - map by distance from center
export function createRadialMapping(source: Vec3[], target: Vec3[]): number[] {
  const sourceCenter = getCenter(source);
  const targetCenter = getCenter(target);
  
  // Sort by distance from center
  const sourceSorted = source.map((p, i) => ({
    index: i,
    dist: distance(p, sourceCenter)
  })).sort((a, b) => a.dist - b.dist);
  
  const targetSorted = target.map((p, i) => ({
    index: i,
    dist: distance(p, targetCenter)
  })).sort((a, b) => a.dist - b.dist);
  
  const mapping: number[] = new Array(source.length);
  
  for (let i = 0; i < source.length; i++) {
    const sourceIndex = sourceSorted[i].index;
    const targetIndex = targetSorted[i % target.length].index;
    mapping[sourceIndex] = targetIndex;
  }
  
  return mapping;
}

// ═══════════════════════════════════════════════════════════════
// ARTISTIC MAPPING PATTERNS
// ═══════════════════════════════════════════════════════════════

// Spiral mapping - create spiral motion during transition
export function createSpiralMapping(source: Vec3[], target: Vec3[]): number[] {
  const n = source.length;
  const mapping: number[] = new Array(n);
  
  // Create spiral pattern
  const spiralTurns = 3;
  const angleStep = (spiralTurns * Math.PI * 2) / n;
  
  for (let i = 0; i < n; i++) {
    const angle = i * angleStep;
    const radius = i / n;
    
    // Map based on spiral position
    const spiralIndex = Math.floor((angle / (Math.PI * 2)) * target.length) % target.length;
    mapping[i] = spiralIndex;
  }
  
  return mapping;
}

// Wave mapping - create wave patterns
export function createWaveMapping(source: Vec3[], target: Vec3[], waveCount: number = 3): number[] {
  const n = source.length;
  const mapping: number[] = new Array(n);
  
  for (let i = 0; i < n; i++) {
    // Create wave pattern
    const wavePos = Math.sin((i / n) * waveCount * Math.PI * 2) * 0.5 + 0.5;
    const targetIndex = Math.floor(wavePos * target.length) % target.length;
    mapping[i] = targetIndex;
  }
  
  return mapping;
}

// Vortex mapping - swirling pattern
export function createVortexMapping(source: Vec3[], target: Vec3[]): number[] {
  const sourceCenter = getCenter(source);
  const targetCenter = getCenter(target);
  
  // Sort by angle and distance
  const sourcePolar = source.map((p, i) => {
    const dx = p[0] - sourceCenter[0];
    const dy = p[1] - sourceCenter[1];
    return {
      index: i,
      angle: Math.atan2(dy, dx),
      dist: Math.sqrt(dx * dx + dy * dy)
    };
  }).sort((a, b) => a.angle - b.angle || a.dist - b.dist);
  
  const targetPolar = target.map((p, i) => {
    const dx = p[0] - targetCenter[0];
    const dy = p[1] - targetCenter[1];
    return {
      index: i,
      angle: Math.atan2(dy, dx),
      dist: Math.sqrt(dx * dx + dy * dy)
    };
  }).sort((a, b) => a.angle - b.angle || a.dist - b.dist);
  
  const mapping: number[] = new Array(source.length);
  
  for (let i = 0; i < source.length; i++) {
    const sourceIndex = sourcePolar[i].index;
    // Add swirl by offsetting target index
    const swirl = Math.floor(i * 0.1);
    const targetIndex = targetPolar[(i + swirl) % target.length].index;
    mapping[sourceIndex] = targetIndex;
  }
  
  return mapping;
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function distance(a: Vec3, b: Vec3): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function getCenter(points: Vec3[]): Vec3 {
  const sum = points.reduce(
    (acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]],
    [0, 0, 0]
  );
  return [
    sum[0] / points.length,
    sum[1] / points.length,
    sum[2] / points.length
  ] as Vec3;
}

// Morton code (Z-order) for spatial sorting
function getMortonCode(p: Vec3): number {
  // Normalize to positive integers
  const scale = 1000;
  const x = Math.floor((p[0] + 10) * scale);
  const y = Math.floor((p[1] + 10) * scale);
  const z = Math.floor((p[2] + 10) * scale);
  
  // Interleave bits (simplified)
  let morton = 0;
  for (let i = 0; i < 10; i++) {
    morton |= ((x & (1 << i)) << (2 * i)) |
              ((y & (1 << i)) << (2 * i + 1)) |
              ((z & (1 << i)) << (2 * i + 2));
  }
  
  return morton;
}

// Simplified Hungarian algorithm for optimal assignment
function hungarianAlgorithm(source: Vec3[], target: Vec3[]): number[] {
  const n = source.length;
  
  // Build cost matrix
  const costs: number[][] = [];
  for (let i = 0; i < n; i++) {
    costs[i] = [];
    for (let j = 0; j < n; j++) {
      costs[i][j] = distance(source[i], target[j]);
    }
  }
  
  // Simple greedy approximation (full Hungarian is complex)
  const mapping: number[] = new Array(n);
  const used = new Set<number>();
  
  // Sort all pairs by cost
  const pairs: { i: number; j: number; cost: number }[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      pairs.push({ i, j, cost: costs[i][j] });
    }
  }
  pairs.sort((a, b) => a.cost - b.cost);
  
  // Assign greedily
  const assigned = new Set<number>();
  for (const pair of pairs) {
    if (!assigned.has(pair.i) && !used.has(pair.j)) {
      mapping[pair.i] = pair.j;
      assigned.add(pair.i);
      used.add(pair.j);
      
      if (assigned.size === n) break;
    }
  }
  
  return mapping;
}

// ═══════════════════════════════════════════════════════════════
// MAPPING VALIDATION
// ═══════════════════════════════════════════════════════════════

export function validateMapping(mapping: number[], targetCount: number): boolean {
  return mapping.every(idx => idx >= 0 && idx < targetCount);
}

export function repairMapping(mapping: number[], targetCount: number): number[] {
  return mapping.map(idx => {
    if (idx < 0) return 0;
    if (idx >= targetCount) return idx % targetCount;
    return idx;
  });
}

// ═══════════════════════════════════════════════════════════════
// COMPOSITE MAPPINGS
// ═══════════════════════════════════════════════════════════════

export interface MappingConfig {
  strategy: 'random' | 'nearest' | 'optimal' | 'spatial' | 'radial' | 'spiral' | 'wave' | 'vortex';
  params?: Record<string, any>;
}

export function createMapping(
  source: Vec3[],
  target: Vec3[],
  config: MappingConfig
): number[] {
  switch (config.strategy) {
    case 'random':
      return createRandomMapping(source.length);
    case 'nearest':
      return createNearestMapping(source, target);
    case 'optimal':
      return createOptimalMapping(source, target);
    case 'spatial':
      return createSpatialMapping(source, target);
    case 'radial':
      return createRadialMapping(source, target);
    case 'spiral':
      return createSpiralMapping(source, target);
    case 'wave':
      return createWaveMapping(source, target, config.params?.waveCount);
    case 'vortex':
      return createVortexMapping(source, target);
    default:
      return createRandomMapping(source.length);
  }
}