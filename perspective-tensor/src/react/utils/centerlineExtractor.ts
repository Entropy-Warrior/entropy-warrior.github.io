/**
 * Centerline Extraction - Extract skeleton/medial axis from outline points
 * Implements simplified skeletonization for 2D shapes
 */

import { Point2D } from './svgPathParser';

export interface CenterlineResult {
  centerline: Point2D[];
  radiusProfile: number[];
}

/**
 * Extract centerline from a closed outline using medial axis approximation
 */
export function extractCenterline(outlinePoints: Point2D[]): CenterlineResult {
  // For now, implement a simplified approach:
  // 1. Find bounding box and main axis direction
  // 2. Sample points along the main axis
  // 3. For each sample, find the medial point between outline edges
  // 4. Estimate radius as half the distance between edges
  
  if (outlinePoints.length < 6) {
    return { centerline: [], radiusProfile: [] };
  }
  
  // Find bounding box
  const bounds = getBoundingBox(outlinePoints);
  const width = bounds.max.x - bounds.min.x;
  const height = bounds.max.y - bounds.min.y;
  
  // Determine main axis (longer dimension)
  const isHorizontal = width > height;
  
  // Sample along the main axis
  const numSamples = Math.max(20, Math.floor((isHorizontal ? width : height) / 10));
  const centerline: Point2D[] = [];
  const radiusProfile: number[] = [];
  
  for (let i = 0; i < numSamples; i++) {
    const t = i / (numSamples - 1);
    
    if (isHorizontal) {
      const x = bounds.min.x + t * width;
      const result = findMedialPointAtX(outlinePoints, x);
      if (result) {
        centerline.push(result.center);
        radiusProfile.push(result.radius);
      }
    } else {
      const y = bounds.min.y + t * height;
      const result = findMedialPointAtY(outlinePoints, y);
      if (result) {
        centerline.push(result.center);
        radiusProfile.push(result.radius);
      }
    }
  }
  
  // Smooth the centerline
  const smoothedCenterline = smoothPoints(centerline, 0.3);
  const smoothedRadius = smoothValues(radiusProfile, 0.3);
  
  return {
    centerline: smoothedCenterline,
    radiusProfile: smoothedRadius
  };
}

/**
 * Find medial point at a given X coordinate
 */
function findMedialPointAtX(points: Point2D[], x: number): { center: Point2D; radius: number } | null {
  const intersections: number[] = [];
  
  // Find all Y intersections at this X
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    
    if ((p1.x <= x && x <= p2.x) || (p2.x <= x && x <= p1.x)) {
      if (Math.abs(p2.x - p1.x) > 0.001) {
        const t = (x - p1.x) / (p2.x - p1.x);
        const y = p1.y + t * (p2.y - p1.y);
        intersections.push(y);
      }
    }
  }
  
  if (intersections.length < 2) return null;
  
  // Sort intersections
  intersections.sort((a, b) => a - b);
  
  // Find the pair with maximum separation (likely top and bottom edges)
  let maxSeparation = 0;
  let bestPair = [0, 1];
  
  for (let i = 0; i < intersections.length - 1; i++) {
    const separation = intersections[i + 1] - intersections[i];
    if (separation > maxSeparation) {
      maxSeparation = separation;
      bestPair = [i, i + 1];
    }
  }
  
  const y1 = intersections[bestPair[0]];
  const y2 = intersections[bestPair[1]];
  const centerY = (y1 + y2) / 2;
  const radius = Math.abs(y2 - y1) / 2;
  
  return {
    center: { x, y: centerY },
    radius
  };
}

/**
 * Find medial point at a given Y coordinate
 */
function findMedialPointAtY(points: Point2D[], y: number): { center: Point2D; radius: number } | null {
  const intersections: number[] = [];
  
  // Find all X intersections at this Y
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    
    if ((p1.y <= y && y <= p2.y) || (p2.y <= y && y <= p1.y)) {
      if (Math.abs(p2.y - p1.y) > 0.001) {
        const t = (y - p1.y) / (p2.y - p1.y);
        const x = p1.x + t * (p2.x - p1.x);
        intersections.push(x);
      }
    }
  }
  
  if (intersections.length < 2) return null;
  
  // Sort intersections
  intersections.sort((a, b) => a - b);
  
  // Find the pair with maximum separation (likely left and right edges)
  let maxSeparation = 0;
  let bestPair = [0, 1];
  
  for (let i = 0; i < intersections.length - 1; i++) {
    const separation = intersections[i + 1] - intersections[i];
    if (separation > maxSeparation) {
      maxSeparation = separation;
      bestPair = [i, i + 1];
    }
  }
  
  const x1 = intersections[bestPair[0]];
  const x2 = intersections[bestPair[1]];
  const centerX = (x1 + x2) / 2;
  const radius = Math.abs(x2 - x1) / 2;
  
  return {
    center: { x: centerX, y },
    radius
  };
}

/**
 * Get bounding box of points
 */
function getBoundingBox(points: Point2D[]): { min: Point2D; max: Point2D } {
  const min = { x: Infinity, y: Infinity };
  const max = { x: -Infinity, y: -Infinity };
  
  for (const point of points) {
    min.x = Math.min(min.x, point.x);
    min.y = Math.min(min.y, point.y);
    max.x = Math.max(max.x, point.x);
    max.y = Math.max(max.y, point.y);
  }
  
  return { min, max };
}

/**
 * Smooth a sequence of points using moving average
 */
function smoothPoints(points: Point2D[], factor: number = 0.3): Point2D[] {
  if (points.length < 3) return points;
  
  const smoothed: Point2D[] = [points[0]]; // Keep first point
  
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    
    const smoothX = curr.x + factor * ((prev.x + next.x) / 2 - curr.x);
    const smoothY = curr.y + factor * ((prev.y + next.y) / 2 - curr.y);
    
    smoothed.push({ x: smoothX, y: smoothY });
  }
  
  smoothed.push(points[points.length - 1]); // Keep last point
  return smoothed;
}

/**
 * Smooth a sequence of values using moving average
 */
function smoothValues(values: number[], factor: number = 0.3): number[] {
  if (values.length < 3) return values;
  
  const smoothed: number[] = [values[0]]; // Keep first value
  
  for (let i = 1; i < values.length - 1; i++) {
    const prev = values[i - 1];
    const curr = values[i];
    const next = values[i + 1];
    
    const smoothValue = curr + factor * ((prev + next) / 2 - curr);
    smoothed.push(smoothValue);
  }
  
  smoothed.push(values[values.length - 1]); // Keep last value
  return smoothed;
}

/**
 * Alternative: Simple centerline from user-provided polyline
 * (for cases where we have a hand-traced centerline)
 */
export function centerlineFromPolyline(polylinePoints: string): Point2D[] {
  const points: Point2D[] = [];
  const coords = polylinePoints.split(/[\s,]+/).map(s => s.trim()).filter(s => s);
  
  for (let i = 0; i < coords.length - 1; i += 2) {
    const x = parseFloat(coords[i]);
    const y = parseFloat(coords[i + 1]);
    if (!isNaN(x) && !isNaN(y)) {
      points.push({ x, y });
    }
  }
  
  return points;
}
