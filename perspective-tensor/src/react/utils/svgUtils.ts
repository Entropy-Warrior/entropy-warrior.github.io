// Enhanced SVG path and polyline parser
export function parseSVGPolylinePoints(svgContent: string): [number, number][] {
  const match = svgContent.match(/<polyline[^>]*points=["']([^"']+)["'][^>]*>/i);
  if (!match) return [];
  const raw = match[1].trim();
  const parts = raw.split(/[\s,]+/).filter(s => s.trim());
  const points: [number, number][] = [];
  for (let i = 0; i < parts.length - 1; i += 2) {
    const x = parseFloat(parts[i]);
    const y = parseFloat(parts[i + 1]);
    if (!Number.isNaN(x) && !Number.isNaN(y)) points.push([x, y]);
  }
  return points;
}

// Parse SVG path element for outline extraction
export function parseSVGPath(svgContent: string): [number, number][] {
  const match = svgContent.match(/<path[^>]*d=["']([^"']+)["'][^>]*>/i);
  if (!match) return [];
  
  // Simple path parser for M, L, C commands
  const pathData = match[1];
  const points: [number, number][] = [];
  const commands = pathData.match(/[MmLlCcZz][^MmLlCcZz]*/g) || [];
  
  let currentPoint: [number, number] = [0, 0];
  
  for (const command of commands) {
    const type = command[0];
    const coords = command.slice(1).trim().split(/[\s,]+/).map(parseFloat).filter(n => !isNaN(n));
    
    switch (type.toUpperCase()) {
      case 'M': // Move to
        if (coords.length >= 2) {
          currentPoint = type === 'M' ? [coords[0], coords[1]] : [currentPoint[0] + coords[0], currentPoint[1] + coords[1]];
          points.push(currentPoint);
        }
        break;
      case 'L': // Line to
        if (coords.length >= 2) {
          currentPoint = type === 'L' ? [coords[0], coords[1]] : [currentPoint[0] + coords[0], currentPoint[1] + coords[1]];
          points.push(currentPoint);
        }
        break;
      case 'C': // Cubic Bezier
        if (coords.length >= 6) {
          const p1: [number, number] = type === 'C' ? [coords[0], coords[1]] : [currentPoint[0] + coords[0], currentPoint[1] + coords[1]];
          const p2: [number, number] = type === 'C' ? [coords[2], coords[3]] : [currentPoint[0] + coords[2], currentPoint[1] + coords[3]];
          const p3: [number, number] = type === 'C' ? [coords[4], coords[5]] : [currentPoint[0] + coords[4], currentPoint[1] + coords[5]];
          
          // Sample the curve
          for (let t = 0.1; t <= 1; t += 0.1) {
            const nt = 1 - t;
            const x = nt*nt*nt*currentPoint[0] + 3*nt*nt*t*p1[0] + 3*nt*t*t*p2[0] + t*t*t*p3[0];
            const y = nt*nt*nt*currentPoint[1] + 3*nt*nt*t*p1[1] + 3*nt*t*t*p2[1] + t*t*t*p3[1];
            points.push([x, y]);
          }
          currentPoint = p3;
        }
        break;
    }
  }
  return points;
}

export function normalizePolyline(points: [number, number][], targetLength: number = 1000): [number, number][] {
  if (points.length === 0) return points;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const w = Math.max(1e-6, maxX - minX);
  const h = Math.max(1e-6, maxY - minY);
  const s = targetLength / Math.max(w, h);
  return points.map(([x, y]) => [(x - minX - w / 2) * s, (y - minY - h / 2) * s]);
}

// Catmull–Rom interpolation for 2D with uniform parameterization
export function catmullRom2D(points: [number, number][], samplesPerSeg: number): [number, number][] {
  if (points.length < 2) return points;
  const res: [number, number][] = [];
  const P = (i: number) => points[Math.max(0, Math.min(points.length - 1, i))];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    for (let j = 0; j < samplesPerSeg; j++) {
      const t = j / samplesPerSeg;
      const t2 = t * t, t3 = t2 * t;
      const x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
      const y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
      res.push([x, y]);
    }
  }
  res.push(points[points.length - 1]);
  return res;
}

// Extract centerline from closed outline using medial axis approximation
export function extractCenterlineFromOutline(outlinePoints: [number, number][]): { centerline: [number, number][]; radiusProfile: number[] } {
  if (outlinePoints.length < 6) return { centerline: [], radiusProfile: [] };
  
  // Find bounding box and determine main axis
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of outlinePoints) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  
  const width = maxX - minX;
  const height = maxY - minY;
  const isHorizontal = width > height;
  
  // Sample along main axis to find medial points
  const numSamples = Math.max(20, Math.floor((isHorizontal ? width : height) / 10));
  const centerline: [number, number][] = [];
  const radiusProfile: number[] = [];
  
  for (let i = 0; i < numSamples; i++) {
    const t = i / (numSamples - 1);
    
    if (isHorizontal) {
      const x = minX + t * width;
      const medialPoint = findMedialPointAtX(outlinePoints, x);
      if (medialPoint) {
        centerline.push([medialPoint.center[0], medialPoint.center[1]]);
        radiusProfile.push(medialPoint.radius);
      }
    } else {
      const y = minY + t * height;
      const medialPoint = findMedialPointAtY(outlinePoints, y);
      if (medialPoint) {
        centerline.push([medialPoint.center[0], medialPoint.center[1]]);
        radiusProfile.push(medialPoint.radius);
      }
    }
  }
  
  return { centerline, radiusProfile };
}

function findMedialPointAtX(points: [number, number][], x: number): { center: [number, number]; radius: number } | null {
  const intersections: number[] = [];
  
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    
    if ((x1 <= x && x <= x2) || (x2 <= x && x <= x1)) {
      if (Math.abs(x2 - x1) > 0.001) {
        const t = (x - x1) / (x2 - x1);
        const y = y1 + t * (y2 - y1);
        intersections.push(y);
      }
    }
  }
  
  if (intersections.length < 2) return null;
  
  intersections.sort((a, b) => a - b);
  
  // Find largest gap (top-bottom edge separation)
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
  
  return { center: [x, centerY], radius };
}

function findMedialPointAtY(points: [number, number][], y: number): { center: [number, number]; radius: number } | null {
  const intersections: number[] = [];
  
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    
    if ((y1 <= y && y <= y2) || (y2 <= y && y <= y1)) {
      if (Math.abs(y2 - y1) > 0.001) {
        const t = (y - y1) / (y2 - y1);
        const x = x1 + t * (x2 - x1);
        intersections.push(x);
      }
    }
  }
  
  if (intersections.length < 2) return null;
  
  intersections.sort((a, b) => a - b);
  
  // Find largest gap (left-right edge separation)
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
  
  return { center: [centerX, y], radius };
}


