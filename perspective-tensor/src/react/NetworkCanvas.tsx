import { useEffect, useRef } from 'react';

type Vec2 = { x: number; y: number };
type Vec3 = { x: number; y: number; z: number };

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function polarToCartesian(r: number, a: number): Vec2 {
  return { x: r * Math.cos(a), y: r * Math.sin(a) };
}

function shapeCircle(count: number, radius: number): Vec2[] {
  const pts: Vec2[] = [];
  for (let i = 0; i < count; i++) {
    const t = (i / count) * Math.PI * 2;
    const { x, y } = polarToCartesian(radius, t);
    pts.push({ x, y });
  }
  return pts;
}

// ---------- Normalized shapes for smooth morphing ([-1,1] coords) ----------
function splitIndexToDims(index: number, dims: number[]): number[] {
  const coord: number[] = new Array(dims.length).fill(0);
  let rem = index;
  for (let d = dims.length - 1; d >= 0; d--) {
    const size = dims[d];
    coord[d] = rem % size;
    rem = Math.floor(rem / size);
  }
  return coord;
}

function dimsFor4D(count: number): [number, number, number, number] {
  // Prefer 9x9x9 layers by default if possible
  const desired3 = 9;
  const nx = desired3;
  const ny = desired3;
  const nz = desired3;
  const perLayer = nx * ny * nz; // 729
  let nw = Math.max(1, Math.ceil(count / perLayer));
  return [nx, ny, nz, nw];
}

function shape4DNorm(count: number): Vec2[] {
  const [nx, ny, nz, nw] = dimsFor4D(count);
  const sx = nx > 1 ? 2 / (nx - 1) : 0;
  const sy = ny > 1 ? 2 / (ny - 1) : 0;
  const sz = nz > 1 ? 2 / (nz - 1) : 0;
  const sw = nw > 1 ? 2 / (nw - 1) : 0;

  // 4D rotations and perspective
  const axw = 0.7, ayz = -0.5;
  const sinXW = Math.sin(axw), cosXW = Math.cos(axw);
  const sinYZ = Math.sin(ayz), cosYZ = Math.cos(ayz);
  const ax = -0.45, ay = 0.6;
  const sinX = Math.sin(ax), cosX = Math.cos(ax);
  const sinY = Math.sin(ay), cosY = Math.cos(ay);
  const cam4 = 3.0, cam3 = 3.0;

  const project4Dto2D = (x: number, y: number, z: number, w: number): Vec2 => {
    const x1 = x * cosXW + w * sinXW;
    const w1 = -x * sinXW + w * cosXW;
    const y1 = y * cosYZ + z * sinYZ;
    const z1 = -y * sinYZ + z * cosYZ;
    const s4 = cam4 / Math.max(1e-3, cam4 - w1);
    const x3 = x1 * s4;
    const y3 = y1 * s4;
    const z3 = z1 * s4;
    const xr = x3 * cosY + z3 * sinY;
    const zr = -x3 * sinY + z3 * cosY;
    const yr = y3 * cosX - zr * sinX;
    const zr2 = y3 * sinX + zr * cosX;
    const s3 = cam3 / Math.max(1e-3, cam3 - zr2);
    return { x: xr * s3 * 0.85, y: yr * s3 * 0.85 };
  };

  const pts: Vec2[] = new Array(count);
  for (let i = 0; i < count; i++) {
    const [ix, iy, iz, iw] = splitIndexToDims(i, [nx, ny, nz, nw]);
    const x = -1 + ix * sx;
    const y = -1 + iy * sy;
    const z = -1 + iz * sz;
    const w = -1 + iw * sw;
    pts[i] = project4Dto2D(x, y, z, w);
  }
  return pts;
}

function shapeGridNorm(count: number): Vec2[] {
  const aspectBias = 1.6;
  const cols = Math.max(2, Math.ceil(Math.sqrt(count * aspectBias)));
  const rows = Math.max(2, Math.ceil(count / cols));
  const sx = cols > 1 ? 2 / (cols - 1) : 0;
  const sy = rows > 1 ? 2 / (rows - 1) : 0;
  const pts: Vec2[] = new Array(count);
  for (let i = 0; i < count; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const x = -1 + c * sx;
    const y = -1 + r * sy;
    // radial cluster warping to create knowledge graph clusters
    const cx = x * 0.95;
    const cy = y * 0.8;
    const r2 = Math.sqrt(cx * cx + cy * cy);
    const warp = 0.15 * Math.sin((c * 13 + r * 7) * 0.3);
    const ang = Math.atan2(cy, cx);
    const rw = r2 * (1 + warp);
    pts[i] = { x: Math.cos(ang) * rw, y: Math.sin(ang) * rw };
  }
  return pts;
}

function shapeNeuralNorm(count: number): Vec2[] {
  const layers = 5;
  const base = [6, 10, 14, 10, 6];
  const totalBase = base.reduce((a, b) => a + b, 0);
  const layerCounts = base.map((n) => Math.max(2, Math.round((n / totalBase) * count)));
  let diff = layerCounts.reduce((a, b) => a + b, 0) - count;
  let idx = 0;
  while (diff !== 0) {
    const k = idx % layers;
    if (diff > 0 && layerCounts[k] > 2) { layerCounts[k]--; diff--; }
    else if (diff < 0) { layerCounts[k]++; diff++; }
    idx++;
  }
  const starts: number[] = [];
  let acc = 0;
  for (let l = 0; l < layers; l++) { starts.push(acc); acc += layerCounts[l]; }

  const dx = layers > 1 ? 2 / (layers - 1) : 0;
  const pts: Vec2[] = new Array(count);
  for (let l = 0; l < layers; l++) {
    const nodes = layerCounts[l];
    const dy = nodes > 1 ? 2 / (nodes - 1) : 0;
    for (let n = 0; n < nodes; n++) {
      const i = starts[l] + n;
      const x = -1 + l * dx;
      const y = -1 + n * dy;
      // slight inward curvature per layer for a perceptron look
      const bend = (l - (layers - 1) / 2) / ((layers - 1) / 2);
      const offset = 0.15 * (1 - Math.abs(bend));
      pts[i] = { x: x * 0.9, y: y * 0.85 * (1 - offset) };
    }
  }
  return pts;
}

// ---------- Seamless morph framework based on a shared 3D base grid ----------
function makeDims3DForCount(count: number): [number, number, number] {
  // Always use 9x9x9 for simplicity and consistency
  return [9, 9, 9];
}

function buildBaseGrid3D(count: number): Vec3[] {
  const [nx, ny, nz] = makeDims3DForCount(count);
  const sx = nx > 1 ? 2 / (nx - 1) : 0;
  const sy = ny > 1 ? 2 / (ny - 1) : 0;
  const sz = nz > 1 ? 2 / (nz - 1) : 0;
  const pts: Vec3[] = new Array(count);
  for (let i = 0; i < count; i++) {
    const [ix, iy, iz] = splitIndexToDims(i, [nx, ny, nz]);
    pts[i] = { x: -1 + ix * sx, y: -1 + iy * sy, z: -1 + iz * sz };
  }
  return pts;
}

function mapCubeFrom3D(p: Vec3): Vec2 {
  // Optimized orientation to show all cube faces including bottom
  const ax = -0.35, ay = 0.5; // Less aggressive rotation to show more faces
  const sinX = Math.sin(ax), cosX = Math.cos(ax);
  const sinY = Math.sin(ay), cosY = Math.cos(ay);
  const cam = 4.5; // Increased camera distance to reduce perspective distortion
  const xr = p.x * cosY + p.z * sinY;
  const zr = -p.x * sinY + p.z * cosY;
  const yr = p.y * cosX - zr * sinX;
  const zr2 = p.y * sinX + zr * cosX;
  const s = cam / Math.max(1e-3, cam - zr2);
  // Further reduced scale to ensure full cube visibility in 4:3 aspect ratio
  return { x: xr * s * 0.6, y: yr * s * 0.6 };
}

function mapGraphFrom3D(p: Vec3, index: number): Vec2 {
  // Map 9x9x9 cube to 3x3x3 clusters (27 total clusters)
  // Each cluster represents a 3x3x3 sub-cube from the original
  const nx = 9, ny = 9, nz = 9;
  const [ix, iy, iz] = splitIndexToDims(index, [nx, ny, nz]);
  
  // Determine which 3x3x3 cluster this node belongs to
  const clusterX = Math.floor(ix / 3);
  const clusterY = Math.floor(iy / 3);
  const clusterZ = Math.floor(iz / 3);
  const clusterId = clusterX + clusterY * 3 + clusterZ * 9;
  
  // Position within the cluster (0-2 in each dimension)
  const localX = ix % 3;
  const localY = iy % 3;
  const localZ = iz % 3;
  
  // Cluster center positions (3x3x3 = 27 clusters arranged nicely)
  const clusterCenters = [];
  for (let cz = 0; cz < 3; cz++) {
    for (let cy = 0; cy < 3; cy++) {
      for (let cx = 0; cx < 3; cx++) {
        const x = (cx - 1) * 0.6; // -0.6, 0, 0.6
        const y = (cy - 1) * 0.6; // -0.6, 0, 0.6
        const depth = cz * 0.1; // Add some depth variation
        clusterCenters.push({ x: x + depth * 0.2, y: y - depth * 0.1 });
      }
    }
  }
  
  const clusterCenter = clusterCenters[clusterId];
  
  // Position within cluster (small offset from cluster center)
  const localOffsetX = (localX - 1) * 0.08; // -0.08, 0, 0.08
  const localOffsetY = (localY - 1) * 0.08;
  const localOffsetZ = (localZ - 1) * 0.02;
  
  return {
    x: clusterCenter.x + localOffsetX + localOffsetZ,
    y: clusterCenter.y + localOffsetY - localOffsetZ * 0.5
  };
}

function mapPerceptronFrom3D(p: Vec3, index: number, layers = 5): Vec2 {
  // Map the same clusters from knowledge graph phase to neural network layers
  const nx = 9, ny = 9, nz = 9;
  const [ix, iy, iz] = splitIndexToDims(index, [nx, ny, nz]);
  
  // Determine which 3x3x3 cluster this node belongs to
  const clusterX = Math.floor(ix / 3);
  const clusterY = Math.floor(iy / 3);
  const clusterZ = Math.floor(iz / 3);
  
  // Map clusters to layers based on their X position (like layers in NN)
  const l = clusterX; // 0, 1, or 2 becomes layers 0, 1, 2
  const xCenter = -1 + (l / (layers - 1)) * 2;
  
  // Layer-specific height variations
  const layerHeights = [0.5, 0.7, 0.9, 0.7, 0.5];
  const layerHeight = layerHeights[l] || 0.6;
  
  // Use cluster Y and Z position to determine position within layer
  const clusterY_norm = (clusterY - 1) / 1; // -1 to 1
  const clusterZ_norm = (clusterZ - 1) / 1; // -1 to 1
  
  // Position within cluster (local position)
  const localX = ix % 3;
  const localY = iy % 3;
  const localZ = iz % 3;
  
  // Combine cluster and local positioning
  const baseY = (clusterY_norm * 0.6 + (localY - 1) * 0.1) * layerHeight;
  const depthOffset = (clusterZ_norm * 0.1 + (localZ - 1) * 0.02);
  
  return { 
    x: xCenter * 0.98 + (localX - 1) * 0.02, // Slight local X variation
    y: baseY + depthOffset
  };
}

// 4D tensor lattice (hypercube-like) projected to 2D
function shapeTensor4D(count: number, width: number, height: number): Vec2[] {
  const innerW = width * 0.8;
  const innerH = Math.max(160, height * 0.55);
  const depthZ = Math.min(innerW, innerH) * 0.7;
  const depthW = Math.min(innerW, innerH) * 0.7;

  // Choose grid dimensions roughly hyper-cubic
  const base = Math.max(2, Math.pow(count, 1 / 4));
  let nx = Math.max(2, Math.round(base * 1.1));
  let ny = Math.max(2, Math.round(base));
  let nz = Math.max(2, Math.round(base));
  let nw = Math.max(2, Math.ceil(count / (nx * ny * nz)));
  while (nx * ny * nz * nw < count) nx++;

  const dx = nx > 1 ? innerW / (nx - 1) : 0;
  const dy = ny > 1 ? innerH / (ny - 1) : 0;
  const dz = nz > 1 ? depthZ / (nz - 1) : 0;
  const dw = nw > 1 ? depthW / (nw - 1) : 0;
  const startX = -innerW / 2;
  const startY = -innerH / 2;
  const startZ = -depthZ / 2;
  const startW = -depthW / 2;

  // Static 4D rotations across XW and YZ planes
  const axw = 0.7;
  const ayz = -0.5;
  const sinXW = Math.sin(axw), cosXW = Math.cos(axw);
  const sinYZ = Math.sin(ayz), cosYZ = Math.cos(ayz);

  // 3D camera
  const cam4 = depthW * 2.2; // w-perspective
  const ax = -0.45; // 3D tilt
  const ay = 0.6; // 3D yaw
  const sinX = Math.sin(ax), cosX = Math.cos(ax);
  const sinY = Math.sin(ay), cosY = Math.cos(ay);
  const cam3 = depthZ * 2.0;

  const project4Dto2D = (x: number, y: number, z: number, w: number): Vec2 => {
    // 4D rotate in XW
    const x1 = x * cosXW + w * sinXW;
    const w1 = -x * sinXW + w * cosXW;
    // 4D rotate in YZ
    const y1 = y * cosYZ + z * sinYZ;
    const z1 = -y * sinYZ + z * cosYZ;

    // Perspective from 4D to 3D using w
    const s4 = cam4 / Math.max(1, cam4 - w1);
    const x3 = x1 * s4;
    const y3 = y1 * s4;
    const z3 = z1 * s4;

    // Rotate in 3D
    const xr = x3 * cosY + z3 * sinY;
    const zr = -x3 * sinY + z3 * cosY;
    const yr = y3 * cosX - zr * sinX;
    const zr2 = y3 * sinX + zr * cosX;

    const s3 = cam3 / Math.max(1, cam3 - zr2);
    return { x: xr * s3, y: yr * s3 };
  };

  const pts: Vec2[] = [];
  outer: for (let l = 0; l < nw; l++) {
    for (let k = 0; k < nz; k++) {
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const jx = ((i * 7 + j * 5 + k * 3 + l * 11) % 5) * 0.2 - 0.5;
          const jy = ((i * 11 + j * 13 + k * 17 + l * 19) % 5) * 0.2 - 0.5;
          const x = startX + i * dx + jx;
          const y = startY + j * dy + jy;
          const z = startZ + k * dz;
          const w = startW + l * dw;
          pts.push(project4Dto2D(x, y, z, w));
          if (pts.length >= count) break outer;
        }
      }
    }
  }
  while (pts.length < count) pts.push({ ...pts[pts.length % Math.max(1, pts.length)] });
  return pts;
}

// 3D tensor lattice projected to 2D (static rotation + perspective)
function shapeTensor3D(count: number, width: number, height: number): Vec2[] {
  const innerW = width * 0.85;
  const innerH = Math.max(160, height * 0.6);
  const depth = Math.min(innerW, innerH) * 0.9;

  // Choose grid dimensions roughly cubic but slightly wider in X
  const base = Math.max(2, Math.cbrt(count));
  let nx = Math.max(2, Math.round(base * 1.2));
  let ny = Math.max(2, Math.round(base * 0.9));
  let nz = Math.max(2, Math.ceil(count / (nx * ny)));
  // Adjust if product still too small
  while (nx * ny * nz < count) nx++;

  const dx = nx > 1 ? innerW / (nx - 1) : 0;
  const dy = ny > 1 ? innerH / (ny - 1) : 0;
  const dz = nz > 1 ? depth / (nz - 1) : 0;
  const startX = -innerW / 2;
  const startY = -innerH / 2;
  const startZ = -depth / 2;

  // Static rotations for a pleasing isometric-like view
  const ax = -0.55; // tilt
  const ay = 0.65; // yaw
  const sinX = Math.sin(ax), cosX = Math.cos(ax);
  const sinY = Math.sin(ay), cosY = Math.cos(ay);
  const cam = depth * 2.0; // camera distance for perspective

  const project = (x: number, y: number, z: number): Vec2 => {
    // Rotate around Y
    const xr = x * cosY + z * sinY;
    const zr = -x * sinY + z * cosY;
    // Rotate around X
    const yr = y * cosX - zr * sinX;
    const zr2 = y * sinX + zr * cosX;
    const scale = cam / Math.max(1, cam - zr2);
    return { x: xr * scale, y: yr * scale };
  };

  const pts: Vec2[] = [];
  outer: for (let k = 0; k < nz; k++) {
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const jx = ((i * 7 + j * 5 + k * 3) % 5) * 0.25 - 0.6;
        const jy = ((i * 11 + j * 13 + k * 17) % 5) * 0.25 - 0.6;
        const x = startX + i * dx + jx;
        const y = startY + j * dy + jy;
        const z = startZ + k * dz;
        pts.push(project(x, y, z));
        if (pts.length >= count) break outer;
      }
    }
  }
  while (pts.length < count) pts.push({ ...pts[pts.length % Math.max(1, pts.length)] });
  return pts;
}

// Tensor grid (lattice) across width
function shapeTensorGrid(count: number, width: number, height: number): Vec2[] {
  // Use a wide grid to emphasize horizontal coverage
  const innerW = width * 0.9;
  const innerH = Math.max(160, Math.min(height * 0.65, width * 0.5));
  const aspect = innerW / innerH;
  const cols = Math.max(3, Math.round(Math.sqrt(count * aspect)));
  const rows = Math.max(2, Math.ceil(count / cols));

  const dx = innerW / Math.max(1, cols - 1);
  const dy = innerH / Math.max(1, rows - 1);
  const startX = -innerW / 2;
  const startY = -innerH / 2;

  const pts: Vec2[] = [];
  for (let r = 0; r < rows && pts.length < count; r++) {
    for (let c = 0; c < cols && pts.length < count; c++) {
      // slight jitter to feel organic
      const jx = ((r * 37 + c * 17) % 7) * 0.4 - 1.2;
      const jy = ((r * 13 + c * 29) % 5) * 0.4 - 1.0;
      pts.push({ x: startX + c * dx + jx, y: startY + r * dy + jy });
    }
  }
  // If fewer points than count due to rounding, fill by sampling existing points
  while (pts.length < count) pts.push({ ...pts[pts.length % Math.max(1, pts.length)] });
  return pts;
}

// Neural network: layered columns across width with varied node counts
function shapeNeural(count: number, width: number, height: number): Vec2[] {
  const innerW = width * 0.85;
  const innerH = Math.max(160, height * 0.6);
  const layers = 5;
  // Node distribution per layer (scales to count)
  const base = [6, 10, 14, 10, 6];
  const totalBase = base.reduce((a, b) => a + b, 0);
  const layerCounts = base.map((n) => Math.max(2, Math.round((n / totalBase) * count)));
  // Adjust to exact count
  let diff = layerCounts.reduce((a, b) => a + b, 0) - count;
  let idx = 0;
  while (diff !== 0) {
    const k = idx % layers;
    if (diff > 0 && layerCounts[k] > 2) {
      layerCounts[k] -= 1;
      diff--;
    } else if (diff < 0) {
      layerCounts[k] += 1;
      diff++;
    }
    idx++;
  }

  const dx = innerW / Math.max(1, layers - 1);
  const startX = -innerW / 2;
  const startY = -innerH / 2;

  const pts: Vec2[] = [];
  for (let l = 0; l < layers; l++) {
    const nodes = layerCounts[l];
    const dy = innerH / Math.max(1, nodes - 1);
    for (let n = 0; n < nodes; n++) {
      const jitterX = ((l * 31 + n * 19) % 11) * 0.35 - 1.8;
      const jitterY = ((l * 23 + n * 7) % 13) * 0.35 - 2.0;
      pts.push({ x: startX + l * dx + jitterX, y: startY + n * dy + jitterY });
    }
  }
  // If overshoot due to rounding, slice; if undershoot, duplicate tail
  if (pts.length > count) return pts.slice(0, count);
  while (pts.length < count) pts.push({ ...pts[pts.length % Math.max(1, pts.length)] });
  return pts;
}

function computeNeuralLayerCounts(count: number) {
  const layers = 5;
  const base = [6, 10, 14, 10, 6];
  const totalBase = base.reduce((a, b) => a + b, 0);
  const layerCounts = base.map((n) => Math.max(2, Math.round((n / totalBase) * count)));
  let diff = layerCounts.reduce((a, b) => a + b, 0) - count;
  let idx = 0;
  while (diff !== 0) {
    const k = idx % layers;
    if (diff > 0 && layerCounts[k] > 2) {
      layerCounts[k] -= 1;
      diff--;
    } else if (diff < 0) {
      layerCounts[k] += 1;
      diff++;
    }
    idx++;
  }
  const starts: number[] = [];
  let acc = 0;
  for (let l = 0; l < layers; l++) {
    starts.push(acc);
    acc += layerCounts[l];
  }
  return { layerCounts, layerStarts: starts };
}

// Wide coverage tree: branching from left to right across full width
function shapeTreeWide(count: number, width: number, height: number): Vec2[] {
  const innerW = width * 0.95; // very wide
  const innerH = Math.max(200, height * 0.7);
  const levels = Math.max(3, Math.min(7, Math.floor(Math.log2(Math.max(2, count))) ));
  const startX = -innerW / 2;
  const startY = -innerH / 2;

  // Compute how many nodes per level (binary growth capped by count)
  const perLevel: number[] = [];
  let remaining = count;
  for (let lvl = 0; lvl < levels; lvl++) {
    const capacity = Math.pow(2, lvl);
    const nodes = Math.min(capacity, Math.max(1, Math.round(remaining / (levels - lvl))));
    perLevel.push(nodes);
    remaining -= nodes;
  }
  if (remaining > 0) perLevel[perLevel.length - 1] += remaining;

  const dx = innerW / Math.max(1, levels - 1);

  const pts: Vec2[] = [];
  for (let lvl = 0; lvl < levels; lvl++) {
    const nodes = perLevel[lvl];
    const dy = innerH / Math.max(1, nodes - 1);
    for (let i = 0; i < nodes; i++) {
      const sway = Math.sin((i / Math.max(1, nodes - 1)) * Math.PI) * 6; // subtle arc
      const jitterY = ((lvl * 17 + i * 13) % 9) * 0.5 - 2.5;
      pts.push({ x: startX + lvl * dx + sway, y: startY + i * dy + jitterY });
    }
  }
  // truncate or extend to exact count
  if (pts.length > count) return pts.slice(0, count);
  while (pts.length < count) pts.push({ ...pts[pts.length % Math.max(1, pts.length)] });
  return pts;
}

function isDark(): boolean {
  return document.documentElement.classList.contains('dark');
}

export default function NetworkCanvas({ nodeCount = 729 }: { nodeCount?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let destroyed = false;
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let connectionsThreshold = 120; // px (updated on resize)

    const getSizingElement = (): HTMLElement | null => {
      let el: HTMLElement | null = canvas.parentElement as HTMLElement | null;
      while (el && el.clientWidth === 0) el = el.parentElement as HTMLElement | null;
      return el;
    };

    const resize = () => {
      const sizingEl = getSizingElement();
      const parentWidth = sizingEl?.clientWidth || window.innerWidth || 0;
      width = parentWidth;
      // Scale with 4:3 aspect ratio for optimal viewing proportions.
      height = Math.round(parentWidth * 0.75);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // dynamic threshold tuned to canvas size - larger for better knowledge graph clustering
      connectionsThreshold = Math.max(100, Math.min(250, Math.min(width, height) * 0.32));
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const sizingEl = getSizingElement();
    let roParent: ResizeObserver | null = null;
    if (sizingEl) {
      roParent = new ResizeObserver(resize);
      roParent.observe(sizingEl);
    }
    const onWinResize = () => resize();
    window.addEventListener('resize', onWinResize);

    // Shared base in 3D to enable seamless mapping across states
    const base3D: Vec3[] = buildBaseGrid3D(nodeCount);
    // Start at cube mapping
    let current: Vec2[] = base3D.map(mapCubeFrom3D);
    let targetIndex = 1;
    const SHAPE_CUBE = 0, SHAPE_GRAPH = 1, SHAPE_PERCEPTRON = 2;
    const shapes = [
      () => base3D.map(mapCubeFrom3D),
      () => base3D.map((p, i) => mapGraphFrom3D(p, i)),
      () => base3D.map((p, i) => mapPerceptronFrom3D(p, i)),
    ];
    let target: Vec2[] = shapes[targetIndex]();
    let morphStart = 0; // Will be set in first draw call
    let morphDuration = 8000; // ms
    let firstFrame = true;

    const pickNext = (currentTime: number) => {
      // Seamless: start next morph from the exact end state of the previous target
      current = target.map((p) => ({ ...p }));
      const nextIndex = (targetIndex + 1) % shapes.length;
      target = shapes[nextIndex]();
      // Use the exact current time to ensure perfect continuity
      morphStart = currentTime;
      morphDuration = 7200 + Math.random() * 800; // tighter variance to avoid cadence shifts
      targetIndex = nextIndex;
    };

    const draw = (now: number) => {
      if (destroyed) return;
      
      // Set initial timing on first frame to ensure perfect continuity
      if (firstFrame) {
        morphStart = now;
        firstFrame = false;
      }
      
      ctx.clearRect(0, 0, width, height);

      // Colors
      const dark = isDark();
      // Subdued palette
      const line = dark ? 'rgb(203,213,225)' : 'rgb(30,41,59)'; // slate-300 / slate-800 base; alpha via globalAlpha
      const node = dark ? 'rgba(226, 232, 240, 0.6)' : 'rgba(30, 41, 59, 0.5)';

      // Morph factor
      let t = (now - morphStart) / morphDuration;
      const isFinished = t >= 1;
      if (isFinished) {
        t = 1;
      }
      const e = easeInOutQuad(Math.max(0, Math.min(1, t)));

      // Compute interpolated positions in normalized space, then scale
      const centerX = width / 2;
      const centerY = height / 2;
      
      // Dynamic scaling optimized for 4:3 aspect ratio
      const baseScale = Math.min(width, height) * 0.44; // Slightly larger for 4:3 format
      const nnScale = Math.min(width * 0.46, height * 0.52); // Take advantage of 4:3 proportions
      
      // Determine if we're in or transitioning to/from perceptron
      const prevIndex = (targetIndex - 1 + shapes.length) % shapes.length;
      const currentIsPerceptron = prevIndex === SHAPE_PERCEPTRON;
      const targetIsPerceptron = targetIndex === SHAPE_PERCEPTRON;
      
      let scaleBlend = 0;
      if (currentIsPerceptron && targetIsPerceptron) {
        scaleBlend = 1; // Full NN scale
      } else if (currentIsPerceptron && !targetIsPerceptron) {
        scaleBlend = 1 - e; // Transitioning out
      } else if (!currentIsPerceptron && targetIsPerceptron) {
        scaleBlend = e; // Transitioning in
      }
      
      const scale = lerp(baseScale, nnScale, scaleBlend);
        
      const driftAmp = 0.008; // very subtle and constant across phases

      const pts: Vec2[] = new Array(nodeCount);
      for (let i = 0; i < nodeCount; i++) {
        const a = current[i];
        const b = target[i];
        
        // Enhanced morphing with organic randomness during transitions
        const baseX = lerp(a.x, b.x, e);
        const baseY = lerp(a.y, b.y, e);
        
        // Subtle continuous drift
        const driftX = Math.sin(now * 0.001 + i) * driftAmp;
        const driftY = Math.cos(now * 0.0013 + i * 1.7) * driftAmp;
        
        // Add morphing-specific randomness - stronger during transition (e=0.5), weaker at endpoints
        const morphIntensity = Math.sin(e * Math.PI) * 0.02; // Peak at 50% morph
        const morphVariationX = Math.sin(now * 0.0007 + i * 2.3 + e * 5) * morphIntensity;
        const morphVariationY = Math.cos(now * 0.0009 + i * 1.9 + e * 7) * morphIntensity;
        
        // Perlin-like noise for organic feel during transitions
        const noisePhase = e * Math.PI * 2 + i * 0.1;
        const organicX = (Math.sin(noisePhase * 1.7) + Math.sin(noisePhase * 3.3) * 0.5) * morphIntensity * 0.5;
        const organicY = (Math.cos(noisePhase * 2.1) + Math.cos(noisePhase * 4.7) * 0.5) * morphIntensity * 0.5;
        
        const nx = baseX + driftX + morphVariationX + organicX;
        const ny = baseY + driftY + morphVariationY + organicY;
        
        pts[i] = { x: centerX + nx * scale, y: centerY + ny * scale };
      }

      // Calculate blend factors for smooth transitions between connection types
      // (reuse the perceptron detection from scaling logic above)
      
      // Determine current and target shapes for connection logic
      const currentIsCube = prevIndex === SHAPE_CUBE;
      const targetIsCube = targetIndex === SHAPE_CUBE;
      const currentIsGraph = prevIndex === SHAPE_GRAPH;
      const targetIsGraph = targetIndex === SHAPE_GRAPH;
      
      // Three connection types: cube grid, perceptron layers, proximity (graph)
      let cubeAlpha = 0;
      let perceptronAlpha = 0;
      let proximityAlpha = 0;
      
      if (currentIsCube && targetIsCube) {
        cubeAlpha = 1;
      } else if (currentIsPerceptron && targetIsPerceptron) {
        perceptronAlpha = 1;
      } else if (currentIsGraph && targetIsGraph) {
        proximityAlpha = 1;
      } else if (currentIsCube && targetIsGraph) {
        cubeAlpha = 1 - e;
        proximityAlpha = e;
      } else if (currentIsGraph && targetIsCube) {
        proximityAlpha = 1 - e;
        cubeAlpha = e;
      } else if (currentIsCube && targetIsPerceptron) {
        cubeAlpha = 1 - e;
        perceptronAlpha = e;
      } else if (currentIsPerceptron && targetIsCube) {
        perceptronAlpha = 1 - e;
        cubeAlpha = e;
      } else if (currentIsGraph && targetIsPerceptron) {
        proximityAlpha = e < 0.5 ? 1 - (e * 2) : 0;
        perceptronAlpha = e > 0.5 ? (e - 0.5) * 2 : 0;
      } else if (currentIsPerceptron && targetIsGraph) {
        perceptronAlpha = 1 - e;
        proximityAlpha = e > 0.5 ? (e - 0.5) * 2 : 0;
      }

      ctx.lineWidth = 1;
      ctx.strokeStyle = line;

      // Draw simple 3D grid connections with blended alpha
      if (cubeAlpha > 0) {
        ctx.globalAlpha = (dark ? 0.25 : 0.18) * cubeAlpha;
        ctx.beginPath();
        
        // Get 3D grid dimensions
        const [nx, ny, nz] = makeDims3DForCount(nodeCount);
        
        // Draw simple grid connections in 3 dimensions
        for (let i = 0; i < nodeCount; i++) {
          const [ix, iy, iz] = splitIndexToDims(i, [nx, ny, nz]);
          
          // X direction: connect to right neighbor
          if (ix < nx - 1) {
            const rightIdx = i + 1;
            if (rightIdx < nodeCount) {
              ctx.moveTo(pts[i].x, pts[i].y);
              ctx.lineTo(pts[rightIdx].x, pts[rightIdx].y);
            }
          }
          
          // Y direction: connect to up neighbor
          if (iy < ny - 1) {
            const upIdx = i + nx;
            if (upIdx < nodeCount) {
              ctx.moveTo(pts[i].x, pts[i].y);
              ctx.lineTo(pts[upIdx].x, pts[upIdx].y);
            }
          }
          
          // Z direction: connect to forward neighbor
          if (iz < nz - 1) {
            const forwardIdx = i + nx * ny;
            if (forwardIdx < nodeCount) {
              ctx.moveTo(pts[i].x, pts[i].y);
              ctx.lineTo(pts[forwardIdx].x, pts[forwardIdx].y);
            }
          }
        }
        ctx.stroke();
      }

      // Always compute proximity-based connections if needed
      let proximityBands: { from: Vec2; to: Vec2 }[][] = [[], [], []];
      if (proximityAlpha > 0) {
        const cellSize = connectionsThreshold;
        const grid = new Map<string, number[]>();
        const keyOf = (x: number, y: number) => `${Math.floor(x / cellSize)}_${Math.floor(y / cellSize)}`;
        for (let i = 0; i < pts.length; i++) {
          const k = keyOf(pts[i].x, pts[i].y);
          const arr = grid.get(k);
          if (arr) arr.push(i);
          else grid.set(k, [i]);
        }
        const neighborCount = new Array(pts.length).fill(0);
        const maxNeighbors = 6; // Allow more connections for better clustering
        for (let i = 0; i < pts.length; i++) {
          const pi = pts[i];
          const cx = Math.floor(pi.x / cellSize);
          const cy = Math.floor(pi.y / cellSize);
          for (let gx = cx - 1; gx <= cx + 1; gx++) {
            for (let gy = cy - 1; gy <= cy + 1; gy++) {
              const bucket = grid.get(`${gx}_${gy}`);
              if (!bucket) continue;
              for (const j of bucket) {
                if (j <= i) continue;
                if (neighborCount[i] >= maxNeighbors && neighborCount[j] >= maxNeighbors) continue;
                const dx = pi.x - pts[j].x;
                const dy = pi.y - pts[j].y;
                const d = Math.hypot(dx, dy);
                if (d < connectionsThreshold) {
                  const tNorm = 1 - d / connectionsThreshold;
                  const bandIdx = tNorm > 0.66 ? 0 : tNorm > 0.33 ? 1 : 2;
                  proximityBands[bandIdx].push({ from: pi, to: pts[j] });
                  neighborCount[i]++;
                  neighborCount[j]++;
                }
              }
            }
          }
        }
      }

      // Draw proximity-based connections with blended alpha
      if (proximityAlpha > 0) {
        const baseBandAlpha = dark ? [0.22, 0.15, 0.08] : [0.18, 0.12, 0.06];
        for (let b = 0; b < proximityBands.length; b++) {
          const segs = proximityBands[b];
          if (segs.length === 0) continue;
          ctx.beginPath();
          for (const s of segs) {
            ctx.moveTo(s.from.x, s.from.y);
            ctx.lineTo(s.to.x, s.to.y);
          }
          ctx.globalAlpha = baseBandAlpha[b] * proximityAlpha;
          ctx.stroke();
        }
      }

      // Draw perceptron connections with blended alpha
      if (perceptronAlpha > 0) {
        ctx.globalAlpha = (dark ? 0.25 : 0.20) * perceptronAlpha;
        
        // Group nodes by their cluster layer (0, 1, 2 based on clusterX)
        const layers = 3;
        const nodesByLayer: number[][] = Array.from({ length: layers }, () => []);
        
        for (let i = 0; i < nodeCount; i++) {
          const [ix, iy, iz] = splitIndexToDims(i, [9, 9, 9]);
          const clusterX = Math.floor(ix / 3); // 0, 1, or 2
          nodesByLayer[clusterX].push(i);
        }
        
        // Connect nodes between adjacent layers only
        ctx.beginPath();
        for (let l = 0; l < layers - 1; l++) {
          const currentLayer = nodesByLayer[l];
          const nextLayer = nodesByLayer[l + 1];
          
          if (currentLayer.length === 0 || nextLayer.length === 0) continue;
          
          for (const fromIdx of currentLayer) {
            // Connect each node to 2-3 nodes in next layer
            const fromPos = (currentLayer.indexOf(fromIdx) / Math.max(1, currentLayer.length - 1));
            const target1Idx = Math.floor(fromPos * nextLayer.length);
            const target2Idx = Math.floor((fromPos + 0.3) * nextLayer.length);
            const target3Idx = Math.floor((fromPos + 0.6) * nextLayer.length);
            
            const fromPt = pts[fromIdx];
            
            // Connect to target 1
            if (target1Idx < nextLayer.length) {
              const toPt1 = pts[nextLayer[target1Idx]];
              ctx.moveTo(fromPt.x, fromPt.y);
              ctx.lineTo(toPt1.x, toPt1.y);
            }
            
            // Connect to target 2 if different
            if (target2Idx < nextLayer.length && target2Idx !== target1Idx) {
              const toPt2 = pts[nextLayer[target2Idx]];
              ctx.moveTo(fromPt.x, fromPt.y);
              ctx.lineTo(toPt2.x, toPt2.y);
            }
            
            // Connect to target 3 if different
            if (target3Idx < nextLayer.length && target3Idx !== target1Idx && target3Idx !== target2Idx) {
              const toPt3 = pts[nextLayer[target3Idx]];
              ctx.moveTo(fromPt.x, fromPt.y);
              ctx.lineTo(toPt3.x, toPt3.y);
            }
          }
        }
        ctx.stroke();
      }

      ctx.globalAlpha = 1;

      // Draw nodes
      ctx.fillStyle = node;
      for (const p of pts) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      if (isFinished) {
        pickNext(now);
      }

      requestAnimationFrame(draw);
    };

    const raf = requestAnimationFrame(draw);

    return () => {
      destroyed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      roParent?.disconnect();
      window.removeEventListener('resize', onWinResize);
    };
  }, [nodeCount]);

  return (
    <canvas ref={canvasRef} className="block w-full" aria-hidden="true" />
  );
}


