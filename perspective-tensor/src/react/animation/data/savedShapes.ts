// Pre-generated shapes for consistent animation
// These are generated once and saved to ensure consistency across loads
// To regenerate: Run the shape generators and save their output

import type { Shape3D } from '../core/types';

// Helper to load shapes (in production, these would be loaded from JSON files)
// For now, we'll generate them once on first load and cache them
export async function loadSavedShapes(): Promise<Record<string, Shape3D>> {
  // Check if shapes are in localStorage
  const cachedShapes = localStorage.getItem('animationShapes_v1');
  
  if (cachedShapes) {
    try {
      return JSON.parse(cachedShapes);
    } catch (e) {
      console.warn('Failed to parse cached shapes, regenerating...', e);
    }
  }
  
  // If not cached, generate and save them
  console.log('🔄 Generating shapes for the first time...');
  
  // Import generators dynamically to avoid circular dependencies
  const {
    generateTensor,
    generateWormhole,
    generateGalaxy,
    generateGraph,
    generateMobiusRibbon,
    generateDoubleHelix,
    generateTorusKnot,
    generateKleinBottle,
    generateSphere,
    generateHypercube
  } = await import('../shapes/mathematical');
  
  const shapes: Record<string, Shape3D> = {
    'Shape3D_Tensor': generateTensor(1000, { spacing: 2, skew: 0.3, twist: 0.5, noise: 0.1 }),
    'Shape3D_Wormhole': generateWormhole(1000, { twist: 1.0, noise: 0.05 }),
    'Shape3D_Galaxy': generateGalaxy(1200),
    'Shape3D_Graph': generateGraph(1000),
    'Shape3D_MobiusRibbon': generateMobiusRibbon(1000, { twists: 1 }),
    'Shape3D_DoubleHelix': generateDoubleHelix(1000),
    'Shape3D_TorusKnot': generateTorusKnot(1000),
    'Shape3D_KleinBottle': generateKleinBottle(968, { twist: 1.0, noise: 0.05 }),
    'Shape3D_Spherical': generateSphere(1000),
    'Shape3D_Hypercube': generateHypercube(1000)
  };
  
  // Cache the shapes
  try {
    localStorage.setItem('animationShapes_v1', JSON.stringify(shapes));
    console.log('✅ Shapes cached to localStorage');
  } catch (e) {
    console.warn('Failed to cache shapes to localStorage', e);
  }
  
  return shapes;
}

// Function to clear cached shapes (useful for development)
export function clearCachedShapes(): void {
  localStorage.removeItem('animationShapes_v1');
  console.log('🗑️ Cached shapes cleared');
}

// Function to export shapes to downloadable JSON
export function exportShapesToJSON(shapes: Record<string, Shape3D>): void {
  const json = JSON.stringify(shapes, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'animation-shapes.json';
  a.click();
  URL.revokeObjectURL(url);
  console.log('💾 Shapes exported to animation-shapes.json');
}