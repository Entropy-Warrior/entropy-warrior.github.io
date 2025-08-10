/**
 * SVG Path Parser - Converts SVG path data to point arrays
 * Implements a subset of SVG path commands (M, L, C, Q, Z)
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface SVGCommand {
  type: string;
  points: Point2D[];
}

/**
 * Parse SVG path data string into commands
 */
export function parseSVGPath(pathData: string): SVGCommand[] {
  const commands: SVGCommand[] = [];
  
  // Clean and normalize the path data
  const cleanPath = pathData
    .replace(/[\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/([MmLlCcQqZz])/g, ' $1 ')
    .trim();
  
  const tokens = cleanPath.split(/\s+/).filter(token => token.length > 0);
  
  let i = 0;
  let currentCommand = '';
  let currentPoint: Point2D = { x: 0, y: 0 };
  
  while (i < tokens.length) {
    const token = tokens[i];
    
    // Check if token is a command
    if (/^[MmLlCcQqZz]$/.test(token)) {
      currentCommand = token;
      i++;
      continue;
    }
    
    // Parse coordinates based on current command
    switch (currentCommand.toUpperCase()) {
      case 'M': // Move to
        const movePoint = parsePoint(tokens, i);
        if (movePoint) {
          const point = currentCommand === 'M' ? movePoint.point : {
            x: currentPoint.x + movePoint.point.x,
            y: currentPoint.y + movePoint.point.y
          };
          commands.push({ type: 'M', points: [point] });
          currentPoint = point;
          i = movePoint.nextIndex;
        }
        break;
        
      case 'L': // Line to
        const linePoint = parsePoint(tokens, i);
        if (linePoint) {
          const point = currentCommand === 'L' ? linePoint.point : {
            x: currentPoint.x + linePoint.point.x,
            y: currentPoint.y + linePoint.point.y
          };
          commands.push({ type: 'L', points: [point] });
          currentPoint = point;
          i = linePoint.nextIndex;
        }
        break;
        
      case 'C': // Cubic Bezier curve
        const cubicPoints = parseCubicBezier(tokens, i);
        if (cubicPoints) {
          const points = currentCommand === 'C' ? cubicPoints.points : 
            cubicPoints.points.map(p => ({
              x: currentPoint.x + p.x,
              y: currentPoint.y + p.y
            }));
          commands.push({ type: 'C', points });
          currentPoint = points[points.length - 1];
          i = cubicPoints.nextIndex;
        }
        break;
        
      case 'Q': // Quadratic Bezier curve
        const quadPoints = parseQuadraticBezier(tokens, i);
        if (quadPoints) {
          const points = currentCommand === 'Q' ? quadPoints.points :
            quadPoints.points.map(p => ({
              x: currentPoint.x + p.x,
              y: currentPoint.y + p.y
            }));
          commands.push({ type: 'Q', points });
          currentPoint = points[points.length - 1];
          i = quadPoints.nextIndex;
        }
        break;
        
      case 'Z': // Close path
        commands.push({ type: 'Z', points: [] });
        i++;
        break;
        
      default:
        i++;
        break;
    }
  }
  
  return commands;
}

function parsePoint(tokens: string[], startIndex: number): { point: Point2D; nextIndex: number } | null {
  if (startIndex + 1 >= tokens.length) return null;
  
  const x = parseFloat(tokens[startIndex]);
  const y = parseFloat(tokens[startIndex + 1]);
  
  if (isNaN(x) || isNaN(y)) return null;
  
  return {
    point: { x, y },
    nextIndex: startIndex + 2
  };
}

function parseCubicBezier(tokens: string[], startIndex: number): { points: Point2D[]; nextIndex: number } | null {
  if (startIndex + 5 >= tokens.length) return null;
  
  const points: Point2D[] = [];
  for (let i = 0; i < 6; i += 2) {
    const x = parseFloat(tokens[startIndex + i]);
    const y = parseFloat(tokens[startIndex + i + 1]);
    if (isNaN(x) || isNaN(y)) return null;
    points.push({ x, y });
  }
  
  return {
    points,
    nextIndex: startIndex + 6
  };
}

function parseQuadraticBezier(tokens: string[], startIndex: number): { points: Point2D[]; nextIndex: number } | null {
  if (startIndex + 3 >= tokens.length) return null;
  
  const points: Point2D[] = [];
  for (let i = 0; i < 4; i += 2) {
    const x = parseFloat(tokens[startIndex + i]);
    const y = parseFloat(tokens[startIndex + i + 1]);
    if (isNaN(x) || isNaN(y)) return null;
    points.push({ x, y });
  }
  
  return {
    points,
    nextIndex: startIndex + 4
  };
}

/**
 * Convert SVG commands to a dense point array by sampling curves
 */
export function commandsToPoints(commands: SVGCommand[], resolution: number = 100): Point2D[] {
  const points: Point2D[] = [];
  let currentPoint: Point2D = { x: 0, y: 0 };
  
  for (const command of commands) {
    switch (command.type) {
      case 'M':
        currentPoint = command.points[0];
        points.push(currentPoint);
        break;
        
      case 'L':
        currentPoint = command.points[0];
        points.push(currentPoint);
        break;
        
      case 'C':
        const cubicPoints = sampleCubicBezier(
          currentPoint,
          command.points[0],
          command.points[1],
          command.points[2],
          resolution
        );
        points.push(...cubicPoints.slice(1)); // Skip first point to avoid duplication
        currentPoint = command.points[2];
        break;
        
      case 'Q':
        const quadPoints = sampleQuadraticBezier(
          currentPoint,
          command.points[0],
          command.points[1],
          resolution
        );
        points.push(...quadPoints.slice(1)); // Skip first point to avoid duplication
        currentPoint = command.points[1];
        break;
        
      case 'Z':
        // Close path - connect back to first point if needed
        if (points.length > 0) {
          const firstPoint = points[0];
          if (Math.abs(currentPoint.x - firstPoint.x) > 1 || Math.abs(currentPoint.y - firstPoint.y) > 1) {
            points.push(firstPoint);
          }
        }
        break;
    }
  }
  
  return points;
}

/**
 * Sample points along a cubic Bezier curve
 */
function sampleCubicBezier(p0: Point2D, p1: Point2D, p2: Point2D, p3: Point2D, steps: number): Point2D[] {
  const points: Point2D[] = [];
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const nt = 1 - t;
    
    const x = nt * nt * nt * p0.x + 
              3 * nt * nt * t * p1.x + 
              3 * nt * t * t * p2.x + 
              t * t * t * p3.x;
              
    const y = nt * nt * nt * p0.y + 
              3 * nt * nt * t * p1.y + 
              3 * nt * t * t * p2.y + 
              t * t * t * p3.y;
              
    points.push({ x, y });
  }
  
  return points;
}

/**
 * Sample points along a quadratic Bezier curve
 */
function sampleQuadraticBezier(p0: Point2D, p1: Point2D, p2: Point2D, steps: number): Point2D[] {
  const points: Point2D[] = [];
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const nt = 1 - t;
    
    const x = nt * nt * p0.x + 2 * nt * t * p1.x + t * t * p2.x;
    const y = nt * nt * p0.y + 2 * nt * t * p1.y + t * t * p2.y;
    
    points.push({ x, y });
  }
  
  return points;
}
