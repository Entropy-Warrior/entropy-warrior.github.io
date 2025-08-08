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

// Helper function to check if a node is a hub
function isHubNode(index: number): boolean {
  const nx = 9, ny = 9, nz = 9;
  const [ix, iy, iz] = splitIndexToDims(index, [nx, ny, nz]);
  const localX = ix % 3;
  const localY = iy % 3;
  const localZ = iz % 3;
  return (localX === 1 && localY === 1 && localZ === 1);
}

// Helper function to get the hub node index for a given cluster
function getHubNodeIndex(clusterId: number): number {
  const nx = 9, ny = 9, nz = 9;
  // Hub is at local position (1,1,1) within each 3x3x3 cluster
  const clusterX = clusterId % 3;
  const clusterY = Math.floor(clusterId / 3) % 3;
  const clusterZ = Math.floor(clusterId / 9);
  
  const hubIx = clusterX * 3 + 1;
  const hubIy = clusterY * 3 + 1;
  const hubIz = clusterZ * 3 + 1;
  
  return hubIx + hubIy * nx + hubIz * nx * ny;
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
  
  // Static random cluster centers - no movement patterns
  const clusterCenters = [];
  
  for (let id = 0; id < 27; id++) {
    // Pure random positioning using deterministic seeds
    const seed1 = (id * 73 + 17) % 1000;
    const seed2 = (id * 131 + 37) % 1000;
    
    // Random positions across viewport
    const x = (seed1 / 1000) * 1.8 - 0.9; // Range: [-0.9, 0.9]
    const y = (seed2 / 1000) * 1.8 - 0.9; // Range: [-0.9, 0.9]
    
    clusterCenters.push({ x, y });
  }
  
  const clusterCenter = clusterCenters[clusterId];
  
  // Hub-and-spoke model: center node (1,1,1) is the hub, others are spokes
  const isHub = (localX === 1 && localY === 1 && localZ === 1);
  
  // Each cluster has a different random radius
  const radiusSeed = (clusterId * 127 + 43) % 1000;
  const clusterRadius = 0.08 + (radiusSeed / 1000) * 0.12; // Radius varies from 0.08 to 0.20
  
  if (isHub) {
    // Hub can be anywhere within the cluster area (not necessarily center)
    const hubSeed1 = (clusterId * 89 + 31) % 1000;
    const hubSeed2 = (clusterId * 157 + 67) % 1000;
    
    // Random position within the cluster circle for the hub
    const hubRadius = Math.sqrt(hubSeed1 / 1000) * clusterRadius * 0.6; // Hub within 60% of cluster radius
    const hubAngle = (hubSeed2 / 1000) * Math.PI * 2;
    
    return {
      x: clusterCenter.x + Math.cos(hubAngle) * hubRadius,
      y: clusterCenter.y + Math.sin(hubAngle) * hubRadius
    };
  } else {
    // Spoke nodes randomly scattered within the circular cluster area
    const nodeId = localX + localY * 3 + localZ * 9;
    const seed1 = (nodeId * 41 + clusterId * 17) % 1000;
    const seed2 = (nodeId * 67 + clusterId * 23) % 1000;
    
    // Truly random position within the circular area (uniform distribution)
    const distance = Math.sqrt(seed1 / 1000) * clusterRadius; // sqrt for uniform distribution in circle
    const angle = (seed2 / 1000) * Math.PI * 2;
    
    const spokeX = clusterCenter.x + Math.cos(angle) * distance;
    const spokeY = clusterCenter.y + Math.sin(angle) * distance;
    
    return {
      x: spokeX,
      y: spokeY
    };
  }
}

function mapPerceptronFrom3D(p: Vec3, index: number, layers = 5): Vec2 {
  // Map the same clusters from knowledge graph phase to neural network layers
  const nx = 9, ny = 9, nz = 9;
  const [ix, iy, iz] = splitIndexToDims(index, [nx, ny, nz]);
  
  // Determine which 3x3x3 cluster this node belongs to
  const clusterX = Math.floor(ix / 3);
  const clusterY = Math.floor(iy / 3);
  const clusterZ = Math.floor(iz / 3);
  
  // Map 27 clusters (3x3x3) to 5 layers more evenly
  // We'll distribute the 27 clusters across 5 layers: [5, 6, 5, 6, 5]
  const clusterId = clusterX + clusterY * 3 + clusterZ * 9;
  
  // Distribute clusters across 5 layers
  let layer = 0;
  if (clusterId < 5) layer = 0;
  else if (clusterId < 11) layer = 1;
  else if (clusterId < 16) layer = 2;
  else if (clusterId < 22) layer = 3;
  else layer = 4;
  
  const xCenter = -1 + (layer / (layers - 1)) * 2;
  
  // Layer-specific height variations for 5 layers
  const layerHeights = [0.5, 0.7, 0.9, 0.7, 0.5];
  const layerHeight = layerHeights[layer];
  
  // Use cluster Y and Z position to determine position within layer
  const clusterY_norm = (clusterY - 1) / 1; // -1 to 1
  const clusterZ_norm = (clusterZ - 1) / 1; // -1 to 1
  
  // Position within cluster (local position)
  const localX = ix % 3;
  const localY = iy % 3;
  const localZ = iz % 3;
  
  // Add some vertical spread within each layer based on cluster position
  const clusterInLayer = clusterId % Math.ceil(27 / 5);
  const verticalSpread = (clusterInLayer / Math.ceil(27 / 5) - 0.5) * 0.8;
  
  // Combine cluster and local positioning
  const baseY = (clusterY_norm * 0.4 + (localY - 1) * 0.08 + verticalSpread) * layerHeight;
  const depthOffset = (clusterZ_norm * 0.08 + (localZ - 1) * 0.02);
  
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

      const pts: Vec2[] = new Array(nodeCount);
      for (let i = 0; i < nodeCount; i++) {
        const a = current[i];
        const b = target[i];
        
        // Clean morphing without any time-based movement
        const baseX = lerp(a.x, b.x, e);
        const baseY = lerp(a.y, b.y, e);
        
        pts[i] = { x: centerX + baseX * scale, y: centerY + baseY * scale };
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
        
        // Ensure rightmost column vertical connections
        for (let iz = 0; iz < nz; iz++) {
          for (let iy = 0; iy < ny - 1; iy++) {
            const ix = nx - 1; // rightmost column
            const currentIdx = ix + iy * nx + iz * nx * ny;
            const upIdx = ix + (iy + 1) * nx + iz * nx * ny;
            if (currentIdx < nodeCount && upIdx < nodeCount) {
              ctx.moveTo(pts[currentIdx].x, pts[currentIdx].y);
              ctx.lineTo(pts[upIdx].x, pts[upIdx].y);
            }
          }
        }
        
        // Ensure horizontal connections TO the rightmost column
        for (let iz = 0; iz < nz; iz++) {
          for (let iy = 0; iy < ny; iy++) {
            const rightmostIx = nx - 1; // rightmost column (ix = 8)
            const secondToRightIx = nx - 2; // second to rightmost (ix = 7)
            const rightmostIdx = rightmostIx + iy * nx + iz * nx * ny;
            const secondToRightIdx = secondToRightIx + iy * nx + iz * nx * ny;
            if (rightmostIdx < nodeCount && secondToRightIdx < nodeCount) {
              ctx.moveTo(pts[secondToRightIdx].x, pts[secondToRightIdx].y);
              ctx.lineTo(pts[rightmostIdx].x, pts[rightmostIdx].y);
            }
          }
        }
        ctx.stroke();
      }

      // Hub-and-spoke connections for knowledge graph (ONLY during graph phase)
      let hubConnections: { from: Vec2; to: Vec2 }[] = [];
      let hubToHubConnections: { from: Vec2; to: Vec2 }[] = [];
      
      // Only show hub connections when in PURE graph state (no transitions)
      const showHubConnections = (currentIsGraph && targetIsGraph);
      
      if (showHubConnections) {
        // 1. Connect spokes to their hubs within each cluster
        for (let clusterId = 0; clusterId < 27; clusterId++) {
          const hubIndex = getHubNodeIndex(clusterId);
          if (hubIndex >= nodeCount) continue;
          
          const hubPos = pts[hubIndex];
          
          // Connect all nodes in this cluster to the hub (ONLY within cluster)
          for (let i = 0; i < nodeCount; i++) {
            if (i === hubIndex) continue; // Skip hub itself
            
            const [ix, iy, iz] = splitIndexToDims(i, [9, 9, 9]);
            const nodeClusterX = Math.floor(ix / 3);
            const nodeClusterY = Math.floor(iy / 3);
            const nodeClusterZ = Math.floor(iz / 3);
            const nodeClusterId = nodeClusterX + nodeClusterY * 3 + nodeClusterZ * 9;
            
            if (nodeClusterId === clusterId) {
              // This node belongs to the current cluster - connect to hub only
              hubConnections.push({ from: pts[i], to: hubPos });
            }
          }
        }
        
        // 2. Connect hubs to nearby hubs
        const hubIndices = [];
        for (let clusterId = 0; clusterId < 27; clusterId++) {
          const hubIndex = getHubNodeIndex(clusterId);
          if (hubIndex < nodeCount) {
            hubIndices.push(hubIndex);
          }
        }
        
        // Connect each hub to its nearest 2-3 hubs (avoid duplicates)
        const hubConnected = new Set<string>();
        for (const hubIdx of hubIndices) {
          const hubPos = pts[hubIdx];
          const distances = hubIndices
            .filter(otherIdx => otherIdx !== hubIdx)
            .map(otherIdx => ({
              idx: otherIdx,
              dist: Math.hypot(pts[otherIdx].x - hubPos.x, pts[otherIdx].y - hubPos.y)
            }))
            .sort((a, b) => a.dist - b.dist)
            .slice(0, 2); // Connect to 2 nearest hubs (reduced for clarity)
            
          for (const { idx } of distances) {
            // Avoid duplicate connections (A->B and B->A)
            const connectionKey = hubIdx < idx ? `${hubIdx}-${idx}` : `${idx}-${hubIdx}`;
            if (!hubConnected.has(connectionKey)) {
              hubConnected.add(connectionKey);
              hubToHubConnections.push({ from: hubPos, to: pts[idx] });
            }
          }
        }
      }

      // Draw hub-and-spoke connections with blended alpha (ONLY during graph phase)
      if (showHubConnections) {
        // Draw spoke-to-hub connections (lighter)
        if (hubConnections.length > 0) {
          ctx.globalAlpha = (dark ? 0.15 : 0.12);
          ctx.beginPath();
          for (const conn of hubConnections) {
            ctx.moveTo(conn.from.x, conn.from.y);
            ctx.lineTo(conn.to.x, conn.to.y);
          }
          ctx.stroke();
        }
        
        // Draw hub-to-hub connections (stronger)
        if (hubToHubConnections.length > 0) {
          ctx.globalAlpha = (dark ? 0.6 : 0.5);
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (const conn of hubToHubConnections) {
            ctx.moveTo(conn.from.x, conn.from.y);
            ctx.lineTo(conn.to.x, conn.to.y);
          }
          ctx.stroke();
          ctx.lineWidth = 1; // Reset line width
        }
      }

      // Draw perceptron connections with blended alpha
      if (perceptronAlpha > 0) {
        ctx.globalAlpha = (dark ? 0.25 : 0.20) * perceptronAlpha;
        
        // Group nodes by their neural network layer (0-4 for 5 layers)
        const layers = 5;
        const nodesByLayer: number[][] = Array.from({ length: layers }, () => []);
        
        for (let i = 0; i < nodeCount; i++) {
          const [ix, iy, iz] = splitIndexToDims(i, [9, 9, 9]);
          const clusterX = Math.floor(ix / 3);
          const clusterY = Math.floor(iy / 3);
          const clusterZ = Math.floor(iz / 3);
          const clusterId = clusterX + clusterY * 3 + clusterZ * 9;
          
          // Distribute clusters across 5 layers (same logic as mapPerceptronFrom3D)
          let layer = 0;
          if (clusterId < 5) layer = 0;
          else if (clusterId < 11) layer = 1;
          else if (clusterId < 16) layer = 2;
          else if (clusterId < 22) layer = 3;
          else layer = 4;
          
          nodesByLayer[layer].push(i);
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
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        ctx.beginPath();
        // Make hub nodes slightly larger
        const radius = isHubNode(i) ? 2.2 : 1.5;
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
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


