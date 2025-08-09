// Reusable mathematical utility functions
export type Vec3 = [number, number, number];

// Basic math utilities
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

// 3D distance calculations
export function distance3D(a: Vec3, b: Vec3): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// 3D transformations
export interface RotationMatrices {
  sinX: number;
  cosX: number;
  sinY: number;
  cosY: number;
}

export function calculateRotationMatrices(rotX: number, rotY: number): RotationMatrices {
  return {
    sinX: Math.sin(rotX),
    cosX: Math.cos(rotX),
    sinY: Math.sin(rotY),
    cosY: Math.cos(rotY),
  };
}

export function apply3DRotation(
  pos: Vec3,
  rotMatrices: RotationMatrices
): Vec3 {
  const [x, y, z] = pos;
  
  // Apply Y rotation first
  const x1 = x * rotMatrices.cosY + z * rotMatrices.sinY;
  const z1 = z * rotMatrices.cosY - x * rotMatrices.sinY;
  
  // Then X rotation
  const y2 = y * rotMatrices.cosX - z1 * rotMatrices.sinX;
  const z2 = y * rotMatrices.sinX + z1 * rotMatrices.cosX;

  return [x1, y2, z2];
}

// Array utilities
export function fisherYatesShuffle<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Random utilities
export function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function generateRandomRotation(): { x: number; y: number } {
  // Constrain angles to ensure good 3D perspective
  const minX = -Math.PI / 3;  // -60°
  const maxX = -Math.PI / 12; // -15°
  const minY = Math.PI / 12;  // 15°
  const maxY = 5 * Math.PI / 12; // 75°
  
  return {
    x: randomInRange(minX, maxX),
    y: randomInRange(minY, maxY),
  };
}

// Vector operations
export function normalizeVec3(vec: Vec3): Vec3 {
  const len = Math.sqrt(vec[0]**2 + vec[1]**2 + vec[2]**2);
  return len > 0 ? [vec[0]/len, vec[1]/len, vec[2]/len] : vec;
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

// Spherical linear interpolation for 3D vectors
export function slerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  const dot = dotProduct(a, b);
  
  if (Math.abs(dot) > 0.9999) {
    return [...b];
  }
  
  const theta = Math.acos(Math.max(-1, Math.min(1, dot)));
  const sinTheta = Math.sin(theta);
  
  if (Math.abs(sinTheta) < 0.001) {
    return [...b];
  }
  
  const wa = Math.sin((1 - t) * theta) / sinTheta;
  const wb = Math.sin(t * theta) / sinTheta;
  
  const result: Vec3 = [
    wa * a[0] + wb * b[0],
    wa * a[1] + wb * b[1],
    wa * a[2] + wb * b[2]
  ];
  
  return normalizeVec3(result);
}

// Matrix operations
export type Matrix3x3 = number[][];

export function createRotationMatrix(axis: Vec3, angle: number): Matrix3x3 {
  const [ax, ay, az] = axis;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  
  return [
    [c + ax*ax*t, ax*ay*t - az*s, ax*az*t + ay*s],
    [ay*ax*t + az*s, c + ay*ay*t, ay*az*t - ax*s],
    [az*ax*t - ay*s, az*ay*t + ax*s, c + az*az*t]
  ];
}

export function multiplyMatrices(a: Matrix3x3, b: Matrix3x3): Matrix3x3 {
  const result = [[0,0,0],[0,0,0],[0,0,0]];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  return result;
}

export function applyMatrixToVector(vec: Vec3, matrix: Matrix3x3, normalize: boolean = false): Vec3 {
  const result: Vec3 = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      result[i] += matrix[i][j] * vec[j];
    }
  }
  return normalize ? normalizeVec3(result) : result;
}

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
