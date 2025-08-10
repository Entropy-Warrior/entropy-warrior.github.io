import type { Vec3 } from '../core/types';

// ═══════════════════════════════════════════════════════════════
// INTERPOLATION UTILITIES
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// BASIC INTERPOLATION
// ═══════════════════════════════════════════════════════════════

export function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t
  ];
}

export function lerpNumber(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Spherical linear interpolation for smoother rotation
export function slerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  // Normalize vectors
  const aMag = Math.sqrt(a[0]**2 + a[1]**2 + a[2]**2);
  const bMag = Math.sqrt(b[0]**2 + b[1]**2 + b[2]**2);
  
  if (aMag === 0 || bMag === 0) return lerpVec3(a, b, t);
  
  const aNorm: Vec3 = [a[0]/aMag, a[1]/aMag, a[2]/aMag];
  const bNorm: Vec3 = [b[0]/bMag, b[1]/bMag, b[2]/bMag];
  
  // Calculate angle between vectors
  const dot = aNorm[0]*bNorm[0] + aNorm[1]*bNorm[1] + aNorm[2]*bNorm[2];
  const theta = Math.acos(Math.max(-1, Math.min(1, dot)));
  
  if (theta < 0.001) return lerpVec3(a, b, t);
  
  const sinTheta = Math.sin(theta);
  const wa = Math.sin((1 - t) * theta) / sinTheta;
  const wb = Math.sin(t * theta) / sinTheta;
  
  // Interpolate magnitude separately
  const mag = lerpNumber(aMag, bMag, t);
  
  return [
    (aNorm[0] * wa + bNorm[0] * wb) * mag,
    (aNorm[1] * wa + bNorm[1] * wb) * mag,
    (aNorm[2] * wa + bNorm[2] * wb) * mag
  ];
}

// ═══════════════════════════════════════════════════════════════
// EASING FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export const Easing = {
  linear: (t: number) => t,
  
  // Quad
  inQuad: (t: number) => t * t,
  outQuad: (t: number) => t * (2 - t),
  inOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  
  // Cubic
  inCubic: (t: number) => t * t * t,
  outCubic: (t: number) => (--t) * t * t + 1,
  inOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  
  // Quart
  inQuart: (t: number) => t * t * t * t,
  outQuart: (t: number) => 1 - (--t) * t * t * t,
  inOutQuart: (t: number) => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
  
  // Quint
  inQuint: (t: number) => t * t * t * t * t,
  outQuint: (t: number) => 1 + (--t) * t * t * t * t,
  inOutQuint: (t: number) => t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t,
  
  // Sine
  inSine: (t: number) => 1 - Math.cos(t * Math.PI / 2),
  outSine: (t: number) => Math.sin(t * Math.PI / 2),
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  
  // Expo
  inExpo: (t: number) => t === 0 ? 0 : Math.pow(2, 10 * t - 10),
  outExpo: (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  inOutExpo: (t: number) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
    return (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
  
  // Circ
  inCirc: (t: number) => 1 - Math.sqrt(1 - t * t),
  outCirc: (t: number) => Math.sqrt(1 - (--t) * t),
  inOutCirc: (t: number) => t < 0.5 
    ? (1 - Math.sqrt(1 - 4 * t * t)) / 2 
    : (Math.sqrt(1 - (t * 2 - 2) * (t * 2 - 2)) + 1) / 2,
  
  // Elastic
  inElastic: (t: number) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3));
  },
  outElastic: (t: number) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
  inOutElastic: (t: number) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) {
      return -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * ((2 * Math.PI) / 4.5))) / 2;
    }
    return (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * ((2 * Math.PI) / 4.5))) / 2 + 1;
  },
  
  // Back
  inBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  outBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  inOutBack: (t: number) => {
    const c1 = 1.70158;
    const c2 = c1 * 1.525;
    if (t < 0.5) {
      return (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2;
    }
    return (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },
  
  // Bounce
  outBounce: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  },
  inBounce: (t: number) => 1 - Easing.outBounce(1 - t),
  inOutBounce: (t: number) => t < 0.5 
    ? (1 - Easing.outBounce(1 - 2 * t)) / 2 
    : (1 + Easing.outBounce(2 * t - 1)) / 2
};

// ═══════════════════════════════════════════════════════════════
// MULTI-POINT INTERPOLATION
// ═══════════════════════════════════════════════════════════════

// Interpolate between two arrays of points with mapping
export function interpolatePointArrays(
  source: Vec3[],
  target: Vec3[],
  mapping: number[],
  t: number,
  easingFn: (t: number) => number = Easing.inOutQuart
): Vec3[] {
  const easedT = easingFn(t);
  
  return source.map((sourcePos, i) => {
    const targetIndex = mapping[i];
    const targetPos = target[targetIndex] || target[0]; // Fallback if mapping is invalid
    return lerpVec3(sourcePos, targetPos, easedT);
  });
}

// Catmull-Rom spline for smooth path through multiple points
export function catmullRomSpline(points: Vec3[], t: number): Vec3 {
  const n = points.length;
  if (n < 2) return points[0] || [0, 0, 0];
  if (n === 2) return lerpVec3(points[0], points[1], t);
  
  // Find segment
  const scaledT = t * (n - 1);
  const segment = Math.floor(scaledT);
  const localT = scaledT - segment;
  
  // Get control points
  const p0 = points[Math.max(0, segment - 1)];
  const p1 = points[segment];
  const p2 = points[Math.min(n - 1, segment + 1)];
  const p3 = points[Math.min(n - 1, segment + 2)];
  
  // Catmull-Rom formula
  const t2 = localT * localT;
  const t3 = t2 * localT;
  
  return [
    0.5 * ((2 * p1[0]) +
           (-p0[0] + p2[0]) * localT +
           (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
           (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
    0.5 * ((2 * p1[1]) +
           (-p0[1] + p2[1]) * localT +
           (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
           (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
    0.5 * ((2 * p1[2]) +
           (-p0[2] + p2[2]) * localT +
           (2 * p0[2] - 5 * p1[2] + 4 * p2[2] - p3[2]) * t2 +
           (-p0[2] + 3 * p1[2] - 3 * p2[2] + p3[2]) * t3)
  ];
}

// ═══════════════════════════════════════════════════════════════
// SPECIAL INTERPOLATION EFFECTS
// ═══════════════════════════════════════════════════════════════

// Spiral interpolation - points spiral as they move
export function spiralInterpolation(
  source: Vec3,
  target: Vec3,
  t: number,
  spiralTurns: number = 2
): Vec3 {
  const linear = lerpVec3(source, target, t);
  
  // Add spiral motion perpendicular to movement direction
  const dx = target[0] - source[0];
  const dy = target[1] - source[1];
  const dz = target[2] - source[2];
  const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
  
  if (dist < 0.001) return linear;
  
  // Create perpendicular vectors
  const angle = t * spiralTurns * Math.PI * 2;
  const radius = Math.sin(t * Math.PI) * dist * 0.2; // Peak at middle
  
  // Simple perpendicular offset
  const offsetX = radius * Math.cos(angle);
  const offsetY = radius * Math.sin(angle);
  
  return [
    linear[0] + offsetY * dy / dist,
    linear[1] - offsetY * dx / dist,
    linear[2] + offsetX
  ];
}

// Wave interpolation - points move in wave pattern
export function waveInterpolation(
  source: Vec3[],
  target: Vec3[],
  mapping: number[],
  t: number,
  waveSpeed: number = 0.1
): Vec3[] {
  return source.map((sourcePos, i) => {
    const targetIndex = mapping[i];
    const targetPos = target[targetIndex] || target[0];
    
    // Add wave delay based on position
    const delay = i * waveSpeed;
    const waveT = Math.max(0, Math.min(1, t * 1.2 - delay));
    
    return lerpVec3(sourcePos, targetPos, Easing.inOutSine(waveT));
  });
}

// Explosion/implosion effect
export function explosionInterpolation(
  source: Vec3[],
  target: Vec3[],
  mapping: number[],
  t: number,
  explode: boolean = true
): Vec3[] {
  // Calculate center of mass
  const sourceCenter = source.reduce(
    (acc, p) => [acc[0] + p[0]/source.length, acc[1] + p[1]/source.length, acc[2] + p[2]/source.length],
    [0, 0, 0] as Vec3
  );
  
  return source.map((sourcePos, i) => {
    const targetIndex = mapping[i];
    const targetPos = target[targetIndex] || target[0];
    
    if (explode) {
      // Explode outward first, then converge to target
      if (t < 0.3) {
        // Explosion phase
        const explodeT = t / 0.3;
        const dir: Vec3 = [
          sourcePos[0] - sourceCenter[0],
          sourcePos[1] - sourceCenter[1],
          sourcePos[2] - sourceCenter[2]
        ];
        return [
          sourcePos[0] + dir[0] * explodeT * 2,
          sourcePos[1] + dir[1] * explodeT * 2,
          sourcePos[2] + dir[2] * explodeT * 2
        ];
      } else {
        // Convergence phase
        const convergeT = (t - 0.3) / 0.7;
        const explodedPos: Vec3 = [
          sourcePos[0] + (sourcePos[0] - sourceCenter[0]) * 2,
          sourcePos[1] + (sourcePos[1] - sourceCenter[1]) * 2,
          sourcePos[2] + (sourcePos[2] - sourceCenter[2]) * 2
        ];
        return lerpVec3(explodedPos, targetPos, Easing.inOutQuart(convergeT));
      }
    } else {
      // Implode toward center first, then expand to target
      if (t < 0.3) {
        const implodeT = t / 0.3;
        return lerpVec3(sourcePos, sourceCenter, Easing.inQuad(implodeT));
      } else {
        const expandT = (t - 0.3) / 0.7;
        return lerpVec3(sourceCenter, targetPos, Easing.outQuad(expandT));
      }
    }
  });
}