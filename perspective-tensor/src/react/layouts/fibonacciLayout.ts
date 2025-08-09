import { centerPositionsAndGetBounds, connectRingNeighbors, createSimpleBrightness } from '../utils/layoutUtils';
import type { Vec3 } from '../utils/mathUtils';
import type { Layout } from '../utils/layoutUtils';

export interface FibonacciConfig {
  nodeCount: number;
  funnelHeight: number;
  maxRadius: number;
  minRadius: number;
  circularLines: number;
  tiltAngle: number;
}

export function generateFibonacciLayout(
  config: FibonacciConfig,
  brightness: number = 0.8
): Layout {
  const positions: Vec3[] = new Array(config.nodeCount);
  const dotsPerCircle = Math.floor(config.nodeCount / config.circularLines);
  
  let dotIndex = 0;
  
  // Generate smooth wormhole surface using hyperboloid equation
  for (let ring = 0; ring < config.circularLines; ring++) {
    const dotsInThisRing = ring === config.circularLines - 1 ? 
      config.nodeCount - dotIndex : dotsPerCircle;
    const t = ring / (config.circularLines - 1); // 0 to 1 from top to bottom
    
    // Map t to symmetric parameter: -1 (top) to +1 (bottom)
    const v = (t - 0.5) * 2;
    
    // Hyperboloid equation: r = sqrt(r0^2 + (z/a)^2) where a controls shape
    const shapeParam = 1.8; // Controls the curvature steepness
    const z = v * config.funnelHeight; // Z position along the wormhole axis
    
    // Smooth hyperboloid radius calculation
    const radius = Math.sqrt(config.minRadius * config.minRadius + (z / shapeParam) * (z / shapeParam));
    
    // Clamp maximum radius for visual coherence
    const clampedRadius = Math.min(radius, config.maxRadius);
    
    // Distribute dots around this circle with randomness
    for (let i = 0; i < dotsInThisRing; i++) {
      const baseAngle = (i / dotsInThisRing) * 2 * Math.PI;
      
      // Add angular randomness (±15 degrees)
      const angleJitter = (Math.random() - 0.5) * (Math.PI / 6);
      const angle = baseAngle + angleJitter;
      
      // Add radial randomness (±10% of radius)
      const radiusJitter = (Math.random() - 0.5) * 0.2 * clampedRadius;
      const finalRadius = clampedRadius + radiusJitter;
      
      // Add axial randomness (±5% of position along z-axis)
      const axialJitter = (Math.random() - 0.5) * 0.1 * Math.abs(z);
      const finalZ = z + axialJitter;
      
      // Create the wormhole surface with organic variation
      const x = finalRadius * Math.cos(angle);
      const y_temp = finalRadius * Math.sin(angle);
      const z_temp = finalZ;
      
      // Rotate for better side view with slight tilt
      const y_final = y_temp * Math.cos(config.tiltAngle) - z_temp * Math.sin(config.tiltAngle);
      const z_final = y_temp * Math.sin(config.tiltAngle) + z_temp * Math.cos(config.tiltAngle);
      
      positions[dotIndex] = [x, y_final, z_final];
      dotIndex++;
    }
  }
  
  // Create proper grid connections
  const edges = connectRingNeighbors(config.circularLines, dotsPerCircle, config.nodeCount);
  
  // Center positions and get bounds
  const { centered, bounds } = centerPositionsAndGetBounds(positions);
  
  // Simple uniform brightness for all edges
  const lineBrightness = createSimpleBrightness(edges.length, brightness);
  
  return { positions: centered, edges, lineBrightness, bounds };
}
