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
