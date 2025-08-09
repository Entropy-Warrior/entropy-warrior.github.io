import type { Layout } from '../utils/layoutUtils';
import {
  generateMathTensorLayout,
  generateMathDiskGalaxyLayout,
  generateMathGraphLayout,
  generateMathMobiusRibbonLayout,
  generateMathWormholeLayout,
  generateMathDoubleHelixLayout,
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
  'DiskGalaxy': generateMathDiskGalaxyLayout,
  'Graph': generateMathGraphLayout,
  'MobiusRibbon': generateMathMobiusRibbonLayout,
  'Wormhole': generateMathWormholeLayout,
  'DoubleHelix': generateMathDoubleHelixLayout,
  'TorusKnot': generateMathTorusKnotLayout,
  'Spherical': generateMathSphericalLayout,
  'Hypercube': generateMathHypercubeLayout
};