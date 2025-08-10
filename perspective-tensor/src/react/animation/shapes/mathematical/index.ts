// ═══════════════════════════════════════════════════════════════
// MATHEMATICAL SHAPES BARREL EXPORT
// ═══════════════════════════════════════════════════════════════

export { generateTensor, EQUATION as TENSOR_EQUATION } from './Tensor';
export { generateGalaxy, EQUATION as GALAXY_EQUATION } from './Galaxy';
export { generateGraph, EQUATION as GRAPH_EQUATION } from './Graph';
export { generateMobiusRibbon, EQUATION as MOBIUS_EQUATION } from './MobiusRibbon';
export { generateWormhole, EQUATION as WORMHOLE_EQUATION } from './Wormhole';
export { generateDoubleHelix, EQUATION as HELIX_EQUATION } from './DoubleHelix';
export { generateTorusKnot, EQUATION as TORUS_EQUATION } from './TorusKnot';
export { generateKleinBottle, EQUATION as KLEIN_EQUATION } from './KleinBottle';
export { generateSphere, EQUATION as SPHERE_EQUATION } from './Sphere';
export { generateHypercube, EQUATION as HYPERCUBE_EQUATION } from './Hypercube';

// Export all equations as a collection
export const SHAPE_EQUATIONS = {
  tensor: "ψ = ℤ³ + ε",
  galaxy: "r(θ) = θ^½ e^{iωθ}",
  graph: "G = ∑ᵢ Cᵢ(r,φ)",
  mobius: "M = {u,v} → ℝ³/~",
  wormhole: "W = ℍ × S¹",
  helix: "h(t) = r·e^{iωt} + ẑt",
  torus: "T² = S¹ × S¹",
  klein: "K = ℝP² # ℝP²",
  sphere: "S² = {x ∈ ℝ³ : |x| = 1}",
  hypercube: "□⁴ → ℝ³"
} as const;