import type { Vec3, Matrix3x3 } from '../core/types';

// Re-export types for convenience
export type { Vec3, Matrix3x3 } from '../core/types';

// ═══════════════════════════════════════════════════════════════
// 3D TRANSFORMATION UTILITIES
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// VECTOR OPERATIONS
// ═══════════════════════════════════════════════════════════════

export function addVec3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function subtractVec3(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function scaleVec3(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

export function normalizeVec3(v: Vec3): Vec3 {
  const mag = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (mag === 0) return [0, 0, 0];
  return [v[0] / mag, v[1] / mag, v[2] / mag];
}

export function dotProduct(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function crossProduct(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

export function magnitude(v: Vec3): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

export function distance(a: Vec3, b: Vec3): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// ═══════════════════════════════════════════════════════════════
// MATRIX OPERATIONS
// ═══════════════════════════════════════════════════════════════

export function createIdentityMatrix(): Matrix3x3 {
  return [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
  ];
}

export function multiplyMatrices(a: Matrix3x3, b: Matrix3x3): Matrix3x3 {
  const result: Matrix3x3 = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      result[i][j] = a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j];
    }
  }
  
  return result;
}

export function applyMatrixToVector(m: Matrix3x3, v: Vec3): Vec3 {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]
  ];
}

// ═══════════════════════════════════════════════════════════════
// ROTATION MATRICES
// ═══════════════════════════════════════════════════════════════

export function createRotationMatrixX(angle: number): Matrix3x3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [
    [1, 0, 0],
    [0, c, -s],
    [0, s, c]
  ];
}

export function createRotationMatrixY(angle: number): Matrix3x3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [
    [c, 0, s],
    [0, 1, 0],
    [-s, 0, c]
  ];
}

export function createRotationMatrixZ(angle: number): Matrix3x3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [
    [c, -s, 0],
    [s, c, 0],
    [0, 0, 1]
  ];
}

// Rodrigues' rotation formula - rotate around arbitrary axis
export function createRotationMatrix(axis: Vec3, angle: number): Matrix3x3 {
  const [x, y, z] = normalizeVec3(axis);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  
  return [
    [t*x*x + c,     t*x*y - s*z,   t*x*z + s*y],
    [t*x*y + s*z,   t*y*y + c,     t*y*z - s*x],
    [t*x*z - s*y,   t*y*z + s*x,   t*z*z + c]
  ];
}

// ═══════════════════════════════════════════════════════════════
// TRANSFORMATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function translate(positions: Vec3[], offset: Vec3): Vec3[] {
  return positions.map(p => addVec3(p, offset));
}

export function scale(positions: Vec3[], factor: number | Vec3): Vec3[] {
  const s = typeof factor === 'number' ? [factor, factor, factor] : factor;
  return positions.map(p => [p[0] * s[0], p[1] * s[1], p[2] * s[2]] as Vec3);
}

export function rotate(positions: Vec3[], matrix: Matrix3x3): Vec3[] {
  return positions.map(p => applyMatrixToVector(matrix, p));
}

export function rotateAroundAxis(positions: Vec3[], axis: Vec3, angle: number): Vec3[] {
  const matrix = createRotationMatrix(axis, angle);
  return rotate(positions, matrix);
}

// ═══════════════════════════════════════════════════════════════
// CENTERING AND NORMALIZATION
// ═══════════════════════════════════════════════════════════════

export function centerPositions(positions: Vec3[]): { centered: Vec3[], center: Vec3 } {
  // Calculate center of mass
  const center = positions.reduce(
    (acc, p) => [
      acc[0] + p[0] / positions.length,
      acc[1] + p[1] / positions.length,
      acc[2] + p[2] / positions.length
    ],
    [0, 0, 0] as Vec3
  );
  
  // Center positions
  const centered = positions.map(p => subtractVec3(p, center));
  
  return { centered, center };
}

export function getBounds(positions: Vec3[]) {
  const bounds = {
    min: [Infinity, Infinity, Infinity] as Vec3,
    max: [-Infinity, -Infinity, -Infinity] as Vec3,
    center: [0, 0, 0] as Vec3,
    size: [0, 0, 0] as Vec3
  };
  
  positions.forEach(p => {
    for (let i = 0; i < 3; i++) {
      bounds.min[i] = Math.min(bounds.min[i], p[i]);
      bounds.max[i] = Math.max(bounds.max[i], p[i]);
    }
  });
  
  bounds.center = [
    (bounds.min[0] + bounds.max[0]) / 2,
    (bounds.min[1] + bounds.max[1]) / 2,
    (bounds.min[2] + bounds.max[2]) / 2
  ];
  
  bounds.size = [
    bounds.max[0] - bounds.min[0],
    bounds.max[1] - bounds.min[1],
    bounds.max[2] - bounds.min[2]
  ];
  
  return bounds;
}

export function normalizeToUnitCube(positions: Vec3[]): Vec3[] {
  const bounds = getBounds(positions);
  const maxDim = Math.max(...bounds.size);
  
  if (maxDim === 0) return positions;
  
  const scale = 2 / maxDim; // Scale to fit in [-1, 1]
  
  return positions.map(p => [
    (p[0] - bounds.center[0]) * scale,
    (p[1] - bounds.center[1]) * scale,
    (p[2] - bounds.center[2]) * scale
  ] as Vec3);
}

// ═══════════════════════════════════════════════════════════════
// SPECIAL TRANSFORMATIONS
// ═══════════════════════════════════════════════════════════════

// Twist transformation
export function twist(positions: Vec3[], twistRate: number, axis: 'x' | 'y' | 'z' = 'z'): Vec3[] {
  return positions.map(p => {
    const height = p[axis === 'x' ? 0 : axis === 'y' ? 1 : 2];
    const angle = height * twistRate;
    
    if (axis === 'z') {
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      return [
        p[0] * c - p[1] * s,
        p[0] * s + p[1] * c,
        p[2]
      ] as Vec3;
    } else if (axis === 'y') {
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      return [
        p[0] * c - p[2] * s,
        p[1],
        p[0] * s + p[2] * c
      ] as Vec3;
    } else {
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      return [
        p[0],
        p[1] * c - p[2] * s,
        p[1] * s + p[2] * c
      ] as Vec3;
    }
  });
}

// Bend transformation
export function bend(positions: Vec3[], bendAngle: number, bendRadius: number = 5): Vec3[] {
  return positions.map(p => {
    const angle = (p[0] / bendRadius) * bendAngle;
    const radius = bendRadius + p[1];
    
    return [
      radius * Math.sin(angle),
      radius * Math.cos(angle) - bendRadius,
      p[2]
    ] as Vec3;
  });
}

// Spherical projection
export function projectToSphere(positions: Vec3[], radius: number = 1): Vec3[] {
  return positions.map(p => {
    const mag = magnitude(p);
    if (mag === 0) return [0, 0, radius] as Vec3;
    return scaleVec3(p, radius / mag);
  });
}

// Cylindrical projection
export function projectToCylinder(positions: Vec3[], radius: number = 1, axis: 'x' | 'y' | 'z' = 'z'): Vec3[] {
  return positions.map(p => {
    if (axis === 'z') {
      const r = Math.sqrt(p[0] * p[0] + p[1] * p[1]);
      if (r === 0) return [0, 0, p[2]] as Vec3;
      return [p[0] * radius / r, p[1] * radius / r, p[2]] as Vec3;
    } else if (axis === 'y') {
      const r = Math.sqrt(p[0] * p[0] + p[2] * p[2]);
      if (r === 0) return [0, p[1], 0] as Vec3;
      return [p[0] * radius / r, p[1], p[2] * radius / r] as Vec3;
    } else {
      const r = Math.sqrt(p[1] * p[1] + p[2] * p[2]);
      if (r === 0) return [p[0], 0, 0] as Vec3;
      return [p[0], p[1] * radius / r, p[2] * radius / r] as Vec3;
    }
  });
}

// Wave deformation
export function waveDeform(
  positions: Vec3[], 
  amplitude: number = 0.5, 
  frequency: number = 1, 
  phase: number = 0,
  axis: 'x' | 'y' | 'z' = 'z'
): Vec3[] {
  return positions.map(p => {
    const coord = axis === 'x' ? p[0] : axis === 'y' ? p[1] : p[2];
    const offset = amplitude * Math.sin(coord * frequency + phase);
    
    if (axis === 'z') {
      return [p[0], p[1], p[2] + offset] as Vec3;
    } else if (axis === 'y') {
      return [p[0], p[1] + offset, p[2]] as Vec3;
    } else {
      return [p[0] + offset, p[1], p[2]] as Vec3;
    }
  });
}

// Noise deformation
export function noiseDeform(positions: Vec3[], amplitude: number = 0.1): Vec3[] {
  return positions.map(p => [
    p[0] + (Math.random() - 0.5) * amplitude,
    p[1] + (Math.random() - 0.5) * amplitude,
    p[2] + (Math.random() - 0.5) * amplitude
  ] as Vec3);
}

// ═══════════════════════════════════════════════════════════════
// ADDITIONAL UTILITIES
// ═══════════════════════════════════════════════════════════════

// Get a perpendicular axis to the given axis
export function getPerpendicularAxis(axis: Vec3): Vec3 {
  let perpAxis: Vec3;
  if (Math.abs(axis[2]) < 0.9) {
    perpAxis = [-axis[1], axis[0], 0];
  } else {
    perpAxis = [0, -axis[2], axis[1]];
  }
  
  return normalizeVec3(perpAxis);
}

// Easing functions
export function easeInOutQuart(t: number): number {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

// Random normal distribution (Box-Muller transform)
export function randomNormal(mean: number = 0, stddev: number = 1): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
  while (v === 0) v = Math.random();
  
  const normal = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + normal * stddev;
}