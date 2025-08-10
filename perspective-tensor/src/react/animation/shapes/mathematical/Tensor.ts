import type { Shape3D, Vec3 } from '../../core/types';

// ═══════════════════════════════════════════════════════════════
// TENSOR - 3D CUBIC LATTICE
// ═══════════════════════════════════════════════════════════════

// Elegant mathematical notation
export const EQUATION = "ψ = ℤ³ + ε";
export const EQUATION_LATEX = "\\psi = \\mathbb{Z}^3 + \\varepsilon";
export const DESCRIPTION = "9³ cubic lattice in 3D space";

export function generateTensor(pointCount: number, options?: {
  spacing?: number;
  skew?: number;
  twist?: number;
  noise?: number;
}): Shape3D {
  // For tensor, we want a perfect cube, so find nearest cube
  const sideLength = Math.round(Math.cbrt(pointCount));
  const actualCount = sideLength ** 3;
  
  // Use provided parameters or fallback to random/default values
  const spacing = options?.spacing ?? (2.0 + Math.random() * 1.0); // Grid spacing (2.0-3.0)
  const skew = options?.skew ?? (-0.1 + Math.random() * 0.2); // Grid skew (-0.1 to 0.1)
  const twist = options?.twist ?? (Math.random() * 0.01); // Subtle rotation twist (0-0.01 rad)
  const noise = options?.noise ?? 0.15; // Noise amplitude
  
  const positions: Vec3[] = [];
  const edges: [number, number][] = [];
  
  // Generate grid points
  for (let i = 0; i < actualCount; i++) {
    const x = Math.floor(i / (sideLength * sideLength));
    const y = Math.floor((i % (sideLength * sideLength)) / sideLength);
    const z = i % sideLength;
    
    // Center the grid
    const cx = (x - (sideLength - 1) / 2) * spacing;
    const cy = (y - (sideLength - 1) / 2) * spacing;
    const cz = (z - (sideLength - 1) / 2) * spacing;
    
    // Apply skew and twist transformations
    const skewedX = cx + skew * cy;
    const twistedX = skewedX * Math.cos(twist * cz) - cy * Math.sin(twist * cz);
    const twistedY = skewedX * Math.sin(twist * cz) + cy * Math.cos(twist * cz);
    
    // Add noise
    const ε = () => (Math.random() - 0.5) * noise;
    
    positions.push([
      twistedX + ε(),
      twistedY + ε(),
      cz + ε()
    ]);
  }
  
  // Generate edges (connect adjacent grid points)
  for (let i = 0; i < actualCount; i++) {
    const x = Math.floor(i / (sideLength * sideLength));
    const y = Math.floor((i % (sideLength * sideLength)) / sideLength);
    const z = i % sideLength;
    
    // Connect to next point in x direction
    if (x < sideLength - 1) {
      edges.push([i, i + sideLength * sideLength]);
    }
    
    // Connect to next point in y direction
    if (y < sideLength - 1) {
      edges.push([i, i + sideLength]);
    }
    
    // Connect to next point in z direction
    if (z < sideLength - 1) {
      edges.push([i, i + 1]);
    }
  }
  
  return {
    id: 'tensor',
    type: 'mathematical',
    positions,
    edges,
    metadata: {
      name: 'Tensor',
      equation: EQUATION,
      description: DESCRIPTION,
      complexity: 0.3, // Simple grid structure
      optimalPointRange: {
        min: 125, // 5³
        max: 1331, // 11³
        recommended: 729 // 9³
      },
      category: 'geometric',
      tags: ['lattice', 'grid', 'cubic', 'crystalline']
    }
  };
}