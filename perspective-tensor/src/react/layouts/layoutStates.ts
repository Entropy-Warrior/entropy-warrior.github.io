import type { Layout } from '../utils/layoutUtils';
import {
  generateMathTensorLayout,
  generateMathHelixLayout,
  generateMathGraphLayout,
  generateMathWormholeLayout,
  generateMathTorusKnotLayout,
  generateMathSphericalLayout,
  generateMathHypercubeLayout
} from './mathematicalLayouts';

// Ordered array of available layout states
export const LAYOUT_STATES = [
  'Tensor',
  'DiskGalaxy', 
  'Graph',
  'MobiusRibbon',
  'Wormhole',
  'DoubleHelix',
  'TorusKnot',
  'Spherical',
  'Hypercube'
] as const;

export type LayoutState = typeof LAYOUT_STATES[number];

// Layout generator mapping for each state
export const LAYOUT_GENERATORS: Record<LayoutState, () => Layout> = {
  'Tensor': generateMathTensorLayout,
  'DiskGalaxy': () => generateMathHelixLayout(0), // Flat disk galaxy
  'Graph': generateMathGraphLayout,
  'MobiusRibbon': () => generateMathHelixLayout(1), // Möbius ribbon
  'Wormhole': generateMathWormholeLayout,
  'DoubleHelix': () => generateMathHelixLayout(2), // DNA double helix
  'TorusKnot': generateMathTorusKnotLayout,
  'Spherical': generateMathSphericalLayout,
  'Hypercube': generateMathHypercubeLayout
};