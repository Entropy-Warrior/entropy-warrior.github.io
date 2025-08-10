// ═══════════════════════════════════════════════════════════════
// CORE ANIMATION TYPES
// ═══════════════════════════════════════════════════════════════

export type Vec3 = [number, number, number];
export type Matrix3x3 = [Vec3, Vec3, Vec3];

// Device capability detection
export type DeviceCapability = 'low' | 'medium' | 'high';

// Shape complexity scale
export type ComplexityLevel = number; // 0-1 scale

// Transition strategies
export type TransitionType = 'random' | 'nearest' | 'optimal' | 'spiral' | 'explode' | 'wave';

// Shape types
export type ShapeType = 'mathematical' | 'arbitrary' | 'procedural' | 'hybrid';

// ═══════════════════════════════════════════════════════════════
// SHAPE DEFINITION
// ═══════════════════════════════════════════════════════════════

export interface Shape3D {
  id: string;
  type: ShapeType;
  positions: Vec3[];
  edges?: [number, number][];
  normals?: Vec3[];
  colors?: Vec3[];
  metadata: ShapeMetadata;
}

export interface ShapeMetadata {
  name: string;
  equation?: string; // LaTeX formula
  description?: string;
  complexity: ComplexityLevel;
  optimalPointRange?: {
    min: number;
    max: number;
    recommended: number;
  };
  category?: string; // 'geometric', 'organic', 'abstract', etc.
  tags?: string[];
}

// ═══════════════════════════════════════════════════════════════
// DYNAMIC POINT CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export interface DynamicPointConfig {
  viewport: {
    width: number;
    height: number;
    dpr: number; // device pixel ratio
  };
  device: {
    capability: DeviceCapability;
    memory?: number; // Available memory in MB
    gpu?: string; // GPU identifier
  };
  shape: {
    complexity: ComplexityLevel;
    type: ShapeType;
  };
  user: {
    preferredCount?: number; // User override
    qualityPreference?: 'performance' | 'balanced' | 'quality';
  };
}

// ═══════════════════════════════════════════════════════════════
// TRANSITION SYSTEM
// ═══════════════════════════════════════════════════════════════

export interface TransitionStrategy {
  type: TransitionType;
  duration: number;
  easing: EasingFunction;
  parameters?: Record<string, any>; // Type-specific params
}

export type EasingFunction = (t: number) => number;

export interface TransitionState {
  sourceShape: Shape3D;
  targetShape: Shape3D;
  mapping: number[]; // Index mapping from source to target
  progress: number; // 0-1
  strategy: TransitionStrategy;
}

// ═══════════════════════════════════════════════════════════════
// ANIMATION TIMELINE
// ═══════════════════════════════════════════════════════════════

export interface AnimationSequence {
  shapeId: string;
  holdDuration: number; // ms to hold this shape
  transition?: {
    toShapeId: string;
    duration: number; // ms for transition
    strategy: TransitionStrategy;
  };
}

export interface AnimationTimeline {
  sequences: AnimationSequence[];
  loop: boolean;
  totalDuration: number;
  defaultTransition?: TransitionStrategy; // Fallback if not specified
}

export interface AnimationState {
  currentShape: Shape3D;
  nextShape?: Shape3D;
  phase: 'hold' | 'transition';
  phaseProgress: number; // 0-1 within current phase
  totalProgress: number; // 0-1 for entire timeline
  interpolatedPositions?: Vec3[]; // Current interpolated positions during transition
}

// ═══════════════════════════════════════════════════════════════
// PERFORMANCE OPTIMIZATION
// ═══════════════════════════════════════════════════════════════

export interface LODConfig {
  enabled: boolean;
  levels: {
    distance: number;
    reductionFactor: number; // 0-1, percentage of points to keep
  }[];
}

export interface CullingConfig {
  frustumCulling: boolean;
  occlusionCulling: boolean;
  distanceCulling: {
    enabled: boolean;
    maxDistance: number;
  };
}

export interface PerformanceConfig {
  targetFPS: number;
  adaptiveQuality: boolean;
  lod: LODConfig;
  culling: CullingConfig;
  caching: {
    enabled: boolean;
    maxCacheSize: number; // MB
  };
}

// ═══════════════════════════════════════════════════════════════
// SHAPE GENERATOR INTERFACES
// ═══════════════════════════════════════════════════════════════

export interface MathematicalShapeGenerator {
  generate(pointCount: number, params?: Record<string, any>): Shape3D;
}

export interface ProceduralShapeGenerator {
  generateAnimal(type: 'bird' | 'fish' | 'butterfly' | 'horse', pointCount: number): Shape3D;
  generatePlant(type: 'tree' | 'flower' | 'fern', pointCount: number): Shape3D;
  generateAbstract(seed: number, pointCount: number): Shape3D;
}

export interface ShapeLoader {
  loadFromJSON(path: string): Promise<Shape3D>;
  loadFromOBJ(path: string): Promise<Shape3D>;
  loadFromPLY(path: string): Promise<Shape3D>;
  loadFromPointCloud(data: Float32Array): Shape3D;
}