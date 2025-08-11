/**
 * Parallel Transport Frames for stable 3D tube generation
 * Avoids Frenet frame singularities and provides consistent orientation along curves
 */

import type { Vec3 } from '../utils/mathUtils';

export interface Frame {
  tangent: Vec3;
  normal: Vec3;
  binormal: Vec3;
}

export interface TubeGeometry {
  positions: Vec3[];
  edges: [number, number][];
  centerline: Vec3[];
}

/**
 * Generate parallel transport frames along a 3D curve
 */
export function generateParallelTransportFrames(centerline: Vec3[]): Frame[] {
  if (centerline.length < 2) return [];
  
  const frames: Frame[] = [];
  
  // Initialize first frame
  const firstTangent = normalize(subtract(centerline[1], centerline[0]));
  const firstNormal = getPerpendicularVector(firstTangent);
  const firstBinormal = cross(firstTangent, firstNormal);
  
  frames.push({
    tangent: firstTangent,
    normal: firstNormal,
    binormal: firstBinormal
  });
  
  // Generate subsequent frames using parallel transport
  for (let i = 1; i < centerline.length; i++) {
    const prevFrame = frames[i - 1];
    // const currentPoint = centerline[i];
    const prevPoint = centerline[i - 1];
    
    // Calculate current tangent
    const tangent = i < centerline.length - 1 
      ? normalize(subtract(centerline[i + 1], prevPoint))
      : prevFrame.tangent;
    
    // Parallel transport the previous normal and binormal
    const { normal, binormal } = parallelTransport(
      prevFrame.normal,
      prevFrame.binormal,
      prevFrame.tangent,
      tangent
    );
    
    frames.push({ tangent, normal, binormal });
  }
  
  return frames;
}

/**
 * Parallel transport a frame from one tangent direction to another
 */
function parallelTransport(
  prevNormal: Vec3,
  prevBinormal: Vec3,
  prevTangent: Vec3,
  newTangent: Vec3
): { normal: Vec3; binormal: Vec3 } {
  const cross1 = cross(prevTangent, newTangent);
  const crossLength = length(cross1);
  
  // If tangents are parallel, no rotation needed
  if (crossLength < 1e-6) {
    return { normal: prevNormal, binormal: prevBinormal };
  }
  
  // Rotation axis and angle
  const axis = scale(cross1, 1 / crossLength);
  const angle = Math.acos(Math.max(-1, Math.min(1, dot(prevTangent, newTangent))));
  
  // Rotate normal and binormal around the axis
  const normal = rotateVectorAroundAxis(prevNormal, axis, angle);
  const binormal = rotateVectorAroundAxis(prevBinormal, axis, angle);
  
  return { normal: normalize(normal), binormal: normalize(binormal) };
}

/**
 * Generate 3D tube geometry by sweeping a circular cross-section along centerline
 */
export function generateTubeGeometry(
  centerline: Vec3[],
  radiusProfile: number[],
  circleSegments: number = 8
): TubeGeometry {
  if (centerline.length < 2) {
    return { positions: [], edges: [], centerline };
  }
  
  // Ensure radius profile matches centerline length
  const radii = radiusProfile.length === centerline.length 
    ? radiusProfile 
    : radiusProfile.length > 0 
      ? interpolateRadius(radiusProfile, centerline.length)
      : new Array(centerline.length).fill(1);
  
  const frames = generateParallelTransportFrames(centerline);
  const positions: Vec3[] = [];
  const edges: [number, number][] = [];
  
  // Generate circle vertices for each frame
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const center = centerline[i];
    const radius = radii[i];
    
    // Generate circle points in frame's local coordinate system
    for (let j = 0; j < circleSegments; j++) {
      const angle = (j / circleSegments) * 2 * Math.PI;
      const cosAngle = Math.cos(angle);
      const sinAngle = Math.sin(angle);
      
      const localPoint: Vec3 = [
        radius * cosAngle * frame.normal[0] + radius * sinAngle * frame.binormal[0],
        radius * cosAngle * frame.normal[1] + radius * sinAngle * frame.binormal[1],
        radius * cosAngle * frame.normal[2] + radius * sinAngle * frame.binormal[2]
      ];
      
      const worldPoint: Vec3 = [
        center[0] + localPoint[0],
        center[1] + localPoint[1],
        center[2] + localPoint[2]
      ];
      
      positions.push(worldPoint);
    }
  }
  
  // Generate edges
  for (let i = 0; i < frames.length; i++) {
    const ringStart = i * circleSegments;
    
    // Edges around each ring
    for (let j = 0; j < circleSegments; j++) {
      const current = ringStart + j;
      const next = ringStart + ((j + 1) % circleSegments);
      edges.push([current, next]);
    }
    
    // Edges between rings
    if (i < frames.length - 1) {
      const nextRingStart = (i + 1) * circleSegments;
      for (let j = 0; j < circleSegments; j++) {
        const current = ringStart + j;
        const nextRing = nextRingStart + j;
        edges.push([current, nextRing]);
      }
    }
  }
  
  return { positions, edges, centerline };
}

/**
 * Convert 2D centerline to 3D with natural undulation
 */
export function centerline2DTo3D(
  centerline2D: [number, number][],
  heightVariation: number = 0.2
): Vec3[] {
  const centerline3D: Vec3[] = [];
  
  for (let i = 0; i < centerline2D.length; i++) {
    const [x, y] = centerline2D[i];
    const t = i / (centerline2D.length - 1);
    
    // Add natural undulation in Z
    const z = heightVariation * Math.sin(t * Math.PI * 3) * Math.sin(t * Math.PI * 7);
    
    centerline3D.push([x, y, z]);
  }
  
  return centerline3D;
}

/**
 * Interpolate radius profile to match centerline length
 */
function interpolateRadius(radiusProfile: number[], targetLength: number): number[] {
  if (radiusProfile.length === targetLength) return radiusProfile;
  
  const result: number[] = [];
  const scale = (radiusProfile.length - 1) / (targetLength - 1);
  
  for (let i = 0; i < targetLength; i++) {
    const t = i * scale;
    const index = Math.floor(t);
    const fraction = t - index;
    
    if (index >= radiusProfile.length - 1) {
      result.push(radiusProfile[radiusProfile.length - 1]);
    } else {
      const value = radiusProfile[index] * (1 - fraction) + radiusProfile[index + 1] * fraction;
      result.push(value);
    }
  }
  
  return result;
}

// Vector utility functions
function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function subtract(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scale(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}

function length(v: Vec3): number {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

function normalize(v: Vec3): Vec3 {
  const len = length(v);
  return len > 1e-6 ? scale(v, 1 / len) : [0, 0, 1];
}

function getPerpendicularVector(v: Vec3): Vec3 {
  // Find a vector perpendicular to v
  const abs = [Math.abs(v[0]), Math.abs(v[1]), Math.abs(v[2])];
  
  if (abs[0] <= abs[1] && abs[0] <= abs[2]) {
    return normalize([0, -v[2], v[1]]);
  } else if (abs[1] <= abs[0] && abs[1] <= abs[2]) {
    return normalize([-v[2], 0, v[0]]);
  } else {
    return normalize([-v[1], v[0], 0]);
  }
}

function rotateVectorAroundAxis(vector: Vec3, axis: Vec3, angle: number): Vec3 {
  // Rodrigues' rotation formula
  const cosAngle = Math.cos(angle);
  const sinAngle = Math.sin(angle);
  
  const term1 = scale(vector, cosAngle);
  const term2 = scale(cross(axis, vector), sinAngle);
  const term3 = scale(axis, dot(axis, vector) * (1 - cosAngle));
  
  return add(add(term1, term2), term3);
}
