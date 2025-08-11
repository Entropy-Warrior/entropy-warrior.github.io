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
  generateMathHypercubeLayout,
  generateMathKleinBottleLayout
} from './mathematicalLayouts';

// Ordered array of available layout states
export const LAYOUT_STATES = [
  'Tensor',
  'Wormhole',
  'DiskGalaxy', 
  'Graph',
  'MobiusRibbon',
  'DoubleHelix',
  'TorusKnot',
  'KleinBottle',
  'Spherical',
  'Hypercube'
] as const;

export type LayoutState = typeof LAYOUT_STATES[number];

// Bespoke point counts for each shape (starting with safe values, can tune individually)
export const LAYOUT_POINT_COUNTS: Record<LayoutState, number> = {
  'Tensor': 1000,        // Grid structure - safe default
  'Wormhole': 1000,      // Smooth hyperboloid - safe default
  'DiskGalaxy': 1200,     // Spiral galaxy - fewer points for cleaner spiral arms
  'Graph': 1000,         // Cluster-based structure - safe default
  'MobiusRibbon': 1000,  // Ribbon topology - safe default for now
  'DoubleHelix': 1000,   // DNA structure - safe default for now
  'TorusKnot': 1000,     // Knot topology - safe default
  'KleinBottle': 1000,   // Complex surface - safe default
  'Spherical': 1000,     // Spherical harmonics - safe default
  'Hypercube': 1000      // 4D projection - safe default
};

// Layout generator mapping for each state with bespoke point counts
export const LAYOUT_GENERATORS: Record<LayoutState, () => Layout> = {
  'Tensor': () => generateMathTensorLayout(LAYOUT_POINT_COUNTS.Tensor),
  'DiskGalaxy': () => generateMathDiskGalaxyLayout(LAYOUT_POINT_COUNTS.DiskGalaxy),
  'Graph': () => generateMathGraphLayout(LAYOUT_POINT_COUNTS.Graph),
  'MobiusRibbon': () => generateMathMobiusRibbonLayout(LAYOUT_POINT_COUNTS.MobiusRibbon),
  'Wormhole': () => generateMathWormholeLayout(LAYOUT_POINT_COUNTS.Wormhole),
  'DoubleHelix': () => generateMathDoubleHelixLayout(LAYOUT_POINT_COUNTS.DoubleHelix),
  'TorusKnot': () => generateMathTorusKnotLayout(LAYOUT_POINT_COUNTS.TorusKnot),
  'KleinBottle': () => generateMathKleinBottleLayout(LAYOUT_POINT_COUNTS.KleinBottle),
  'Spherical': () => generateMathSphericalLayout(LAYOUT_POINT_COUNTS.Spherical),
  'Hypercube': () => generateMathHypercubeLayout(LAYOUT_POINT_COUNTS.Hypercube)
};