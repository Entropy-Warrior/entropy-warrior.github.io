import type { Vec3 } from '../core/types';

// ═══════════════════════════════════════════════════════════════
// PERFORMANCE OPTIMIZATION UTILITIES
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// FRUSTUM CULLING
// ═══════════════════════════════════════════════════════════════

export interface Camera {
  position: Vec3;
  direction: Vec3;
  fov: number; // Field of view in radians
  aspect: number; // Width/height ratio
  near: number;
  far: number;
}

export interface Frustum {
  planes: {
    normal: Vec3;
    distance: number;
  }[];
}

export function createFrustum(camera: Camera): Frustum {
  const halfVSide = camera.far * Math.tan(camera.fov * 0.5);
  const halfHSide = halfVSide * camera.aspect;
  
  // Calculate frustum planes (simplified)
  const planes = [];
  
  // Near and far planes
  planes.push({
    normal: camera.direction,
    distance: camera.near
  });
  
  planes.push({
    normal: [-camera.direction[0], -camera.direction[1], -camera.direction[2]] as Vec3,
    distance: camera.far
  });
  
  // Additional planes would be added for complete frustum
  // This is simplified for demonstration
  
  return { planes };
}

export function isPointInFrustum(point: Vec3, frustum: Frustum): boolean {
  // Check if point is inside all planes
  for (const plane of frustum.planes) {
    const distance = 
      point[0] * plane.normal[0] +
      point[1] * plane.normal[1] +
      point[2] * plane.normal[2] - plane.distance;
    
    if (distance < 0) return false;
  }
  
  return true;
}

export function cullPointsByFrustum(
  points: Vec3[],
  camera: Camera
): { visible: Vec3[], indices: number[] } {
  const frustum = createFrustum(camera);
  const visible: Vec3[] = [];
  const indices: number[] = [];
  
  points.forEach((point, i) => {
    if (isPointInFrustum(point, frustum)) {
      visible.push(point);
      indices.push(i);
    }
  });
  
  return { visible, indices };
}

// ═══════════════════════════════════════════════════════════════
// LEVEL OF DETAIL (LOD)
// ═══════════════════════════════════════════════════════════════

export interface LODLevel {
  distance: number;
  reduction: number; // 0-1, percentage to keep
}

export function applyLOD(
  points: Vec3[],
  cameraPosition: Vec3,
  levels: LODLevel[]
): Vec3[] {
  // Calculate average distance to camera
  let totalDistance = 0;
  points.forEach(p => {
    const dx = p[0] - cameraPosition[0];
    const dy = p[1] - cameraPosition[1];
    const dz = p[2] - cameraPosition[2];
    totalDistance += Math.sqrt(dx * dx + dy * dy + dz * dz);
  });
  
  const avgDistance = totalDistance / points.length;
  
  // Find appropriate LOD level
  let reduction = 1.0;
  for (const level of levels) {
    if (avgDistance >= level.distance) {
      reduction = level.reduction;
    }
  }
  
  // Apply reduction
  if (reduction >= 1.0) return points;
  
  const keepCount = Math.max(1, Math.floor(points.length * reduction));
  const step = Math.floor(points.length / keepCount);
  
  const reduced: Vec3[] = [];
  for (let i = 0; i < points.length; i += step) {
    reduced.push(points[i]);
  }
  
  return reduced;
}

// ═══════════════════════════════════════════════════════════════
// OCCLUSION CULLING
// ═══════════════════════════════════════════════════════════════

export function simpleOcclusionCull(
  points: Vec3[],
  cameraPosition: Vec3,
  occluders: { center: Vec3; radius: number }[]
): Vec3[] {
  return points.filter(point => {
    // Check if point is occluded by any occluder
    for (const occluder of occluders) {
      // Simple sphere occlusion test
      const toPoint = [
        point[0] - cameraPosition[0],
        point[1] - cameraPosition[1],
        point[2] - cameraPosition[2]
      ];
      
      const toOccluder = [
        occluder.center[0] - cameraPosition[0],
        occluder.center[1] - cameraPosition[1],
        occluder.center[2] - cameraPosition[2]
      ];
      
      // If occluder is behind point, can't occlude
      const pointDist = Math.sqrt(toPoint[0]**2 + toPoint[1]**2 + toPoint[2]**2);
      const occluderDist = Math.sqrt(toOccluder[0]**2 + toOccluder[1]**2 + toOccluder[2]**2);
      
      if (occluderDist > pointDist) continue;
      
      // Check if point is within occluder's shadow cone
      // This is simplified - real implementation would be more complex
      const dot = (toPoint[0] * toOccluder[0] + toPoint[1] * toOccluder[1] + toPoint[2] * toOccluder[2]) /
                  (pointDist * occluderDist);
      
      const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
      const occlusionAngle = Math.atan(occluder.radius / occluderDist);
      
      if (angle < occlusionAngle) return false;
    }
    
    return true;
  });
}

// ═══════════════════════════════════════════════════════════════
// SPATIAL INDEXING
// ═══════════════════════════════════════════════════════════════

export class SpatialGrid {
  private grid: Map<string, number[]> = new Map();
  private cellSize: number;
  
  constructor(cellSize: number = 10) {
    this.cellSize = cellSize;
  }
  
  private getKey(p: Vec3): string {
    const x = Math.floor(p[0] / this.cellSize);
    const y = Math.floor(p[1] / this.cellSize);
    const z = Math.floor(p[2] / this.cellSize);
    return `${x},${y},${z}`;
  }
  
  build(points: Vec3[]): void {
    this.grid.clear();
    
    points.forEach((p, i) => {
      const key = this.getKey(p);
      if (!this.grid.has(key)) {
        this.grid.set(key, []);
      }
      this.grid.get(key)!.push(i);
    });
  }
  
  getNeighbors(p: Vec3, radius: number): number[] {
    const neighbors: number[] = [];
    const cellRadius = Math.ceil(radius / this.cellSize);
    
    const centerCell = this.getKey(p);
    const [cx, cy, cz] = centerCell.split(',').map(Number);
    
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        for (let dz = -cellRadius; dz <= cellRadius; dz++) {
          const key = `${cx + dx},${cy + dy},${cz + dz}`;
          const indices = this.grid.get(key);
          if (indices) {
            neighbors.push(...indices);
          }
        }
      }
    }
    
    return neighbors;
  }
}

// ═══════════════════════════════════════════════════════════════
// FRAME RATE MONITORING
// ═══════════════════════════════════════════════════════════════

export class PerformanceMonitor {
  private frameTimes: number[] = [];
  private maxSamples: number;
  private lastTime: number = 0;
  
  constructor(maxSamples: number = 60) {
    this.maxSamples = maxSamples;
  }
  
  recordFrame(currentTime: number): void {
    if (this.lastTime > 0) {
      const deltaTime = currentTime - this.lastTime;
      this.frameTimes.push(deltaTime);
      
      if (this.frameTimes.length > this.maxSamples) {
        this.frameTimes.shift();
      }
    }
    
    this.lastTime = currentTime;
  }
  
  getFPS(): number {
    if (this.frameTimes.length === 0) return 60;
    
    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    return 1000 / avgFrameTime;
  }
  
  getStats() {
    if (this.frameTimes.length === 0) {
      return { fps: 60, min: 60, max: 60, avg: 16.67 };
    }
    
    const fps = this.getFPS();
    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    
    return {
      fps,
      min: 1000 / sorted[sorted.length - 1],
      max: 1000 / sorted[0],
      avg: sorted.reduce((a, b) => a + b, 0) / sorted.length
    };
  }
  
  shouldReduceQuality(): boolean {
    return this.getFPS() < 30;
  }
  
  shouldIncreaseQuality(): boolean {
    return this.getFPS() > 55 && this.frameTimes.length >= this.maxSamples;
  }
}

// ═══════════════════════════════════════════════════════════════
// BATCH PROCESSING
// ═══════════════════════════════════════════════════════════════

export function processBatched<T, R>(
  items: T[],
  processor: (batch: T[]) => R[],
  batchSize: number = 1000
): R[] {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, Math.min(i + batchSize, items.length));
    results.push(...processor(batch));
  }
  
  return results;
}

// ═══════════════════════════════════════════════════════════════
// MEMORY POOLING
// ═══════════════════════════════════════════════════════════════

export class Vec3Pool {
  private pool: Vec3[] = [];
  private used: number = 0;
  
  get(): Vec3 {
    if (this.used < this.pool.length) {
      return this.pool[this.used++];
    }
    
    const vec: Vec3 = [0, 0, 0];
    this.pool.push(vec);
    this.used++;
    return vec;
  }
  
  reset(): void {
    this.used = 0;
  }
  
  set(vec: Vec3, x: number, y: number, z: number): Vec3 {
    vec[0] = x;
    vec[1] = y;
    vec[2] = z;
    return vec;
  }
}