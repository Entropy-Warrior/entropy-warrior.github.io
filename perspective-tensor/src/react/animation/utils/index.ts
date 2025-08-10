// ═══════════════════════════════════════════════════════════════
// ANIMATION UTILITIES BARREL EXPORT
// ═══════════════════════════════════════════════════════════════

// Export specific items to avoid conflicts
export {
  // From brownian (excluding updateBrownianMotion to avoid conflict)
  createBrownianState,
  applyBrownianToPositions,
  applyScaledBrownian,
  updateSizeAdaptiveBrownian,
  BROWNIAN_PRESETS,
  type BrownianConfig,
  type BrownianState
} from './brownian';

export * from './interpolation';
export * from './transforms';
export * from './mapping';
export * from './performance';
export * from './theme';

// From layoutUtils (distance3D is re-exported from mathUtils there)
export {
  type Edge,
  type Bounds,
  type Layout,
  centerPositionsAndGetBounds,
  createSimpleBrightness,
  distance3D as distance3DFromLayout // Export with alias to avoid conflict
} from './layoutUtils';

// From canvasUtils (re-exports from main utils)
export {
  setupCanvas,
  getRenderColors,
  type CanvasRenderConfig,
  type RenderColors,
  type BrownianOffsets,
  createBrownianOffsets,
  updateBrownianMotion
} from './canvasUtils';

// From mathUtils (excluding lerpVec3 which is in interpolation)
export {
  type Vec3,
  lerp,
  distance3D,
  type RotationMatrices,
  calculateRotationMatrices,
  apply3DRotation,
  type Matrix3x3,
  multiplyMatrix3x3,
  applyMatrix3x3,
  rotationMatrixX,
  rotationMatrixY,
  rotationMatrixZ,
  rotationMatrixAroundAxis,
  normalizeVec3,
  crossProduct,
  dotProduct
} from './mathUtils';