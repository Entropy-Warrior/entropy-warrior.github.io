import type { Vec3, Matrix3x3 } from '../core/types';

// Re-export types for convenience
export type { Vec3, Matrix3x3 } from '../core/types';

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

// Matrix multiplication (3x3)
export function multiplyMatrix3x3(a: Matrix3x3, b: Matrix3x3): Matrix3x3 {
  const result: [
    [number, number, number],
    [number, number, number],
    [number, number, number]
  ] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  return result;
}

// Vector-Matrix multiplication
export function applyMatrix3x3(m: Matrix3x3, v: Vec3): Vec3 {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]
  ];
}

// Common rotation matrices
export function rotationMatrixX(angle: number): Matrix3x3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [
    [1, 0, 0],
    [0, c, -s],
    [0, s, c]
  ];
}

export function rotationMatrixY(angle: number): Matrix3x3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [
    [c, 0, s],
    [0, 1, 0],
    [-s, 0, c]
  ];
}

export function rotationMatrixZ(angle: number): Matrix3x3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [
    [c, -s, 0],
    [s, c, 0],
    [0, 0, 1]
  ];
}

// Rodrigues' rotation formula - creates a rotation matrix for rotation around an arbitrary axis
export function rotationMatrixAroundAxis(axis: Vec3, angle: number): Matrix3x3 {
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

// Vector operations
export function normalizeVec3(v: Vec3): Vec3 {
  const mag = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (mag === 0) return [0, 0, 0];
  return [v[0] / mag, v[1] / mag, v[2] / mag];
}

export function crossProduct(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

export function dotProduct(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}