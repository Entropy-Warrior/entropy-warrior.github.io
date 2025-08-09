import { calculateRotationMatrices, apply3DRotation } from '../utils/mathUtils';
import { centerPositionsAndGetBounds, connectGridNeighbors, createSimpleBrightness } from '../utils/layoutUtils';
import type { Vec3 } from '../utils/mathUtils';
import type { Layout } from '../utils/layoutUtils';

export interface TensorConfig {
  grid: number;
  spacing: number;
  rotationX: number;
  rotationY: number;
  scale: number;
}

export function generateTensorLayout(
  config: TensorConfig,
  rotOverride?: { x: number; y: number },
  brightness: number = 0.8
): Layout {
  const positions: Vec3[] = [];
  const grid = config.grid;
  const spacing = config.spacing;
  const center = (grid - 1) * spacing * 0.5;
  const rotX = rotOverride?.x ?? config.rotationX;
  const rotY = rotOverride?.y ?? config.rotationY;
  const scale = config.scale;

  // Pre-calculate rotation matrices
  const rotMatrices = calculateRotationMatrices(rotX, rotY);
  const scaledSpacing = spacing * scale;

  // Generate 9x9x9 grid positions with rotation and scaling
  for (let z = 0; z < grid; z++) {
    const pzBase = (z * scaledSpacing - center * scale);
    for (let y = 0; y < grid; y++) {
      const pyBase = (y * scaledSpacing - center * scale);
      for (let x = 0; x < grid; x++) {
        const pxBase = (x * scaledSpacing - center * scale);

        const rotatedPos = apply3DRotation([pxBase, pyBase, pzBase], rotMatrices);
        positions.push(rotatedPos);
      }
    }
  }

  // Generate grid edges
  const edges = connectGridNeighbors(grid, positions);

  // Center positions and get bounds
  const { centered, bounds } = centerPositionsAndGetBounds(positions);

  // Simple uniform brightness for all edges
  const lineBrightness = createSimpleBrightness(edges.length, brightness);

  return { positions: centered, edges, lineBrightness, bounds };
}
