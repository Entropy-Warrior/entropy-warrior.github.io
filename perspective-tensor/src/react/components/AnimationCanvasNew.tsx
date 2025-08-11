import { useEffect, useRef, useState } from 'react';
import {
  lerpVec3,
  type Vec3,
  slerpVec3,
  createRotationMatrix,
  multiplyMatrices,
  applyMatrixToVector,
  easeInOutQuart,
  randomNormal,
  type Matrix3x3,
  createBrownianOffsets,
  updateBrownianMotion,
  getRenderColors,
  type BrownianOffsets,
  type Layout,
  type Bounds
} from '../animation/utils';
import { ANIMATION_CONFIG as CFG } from '../config';
import 'katex/dist/katex.min.css';
import katex from 'katex';

// Import shape generators and equations
import {
  generateTensor,
  generateWormhole,
  generateGalaxy,
  generateGraph,
  generateMobiusRibbon,
  generateDoubleHelix,
  generateTorusKnot,
  generateKleinBottle,
  generateSphere,
  generateHypercube,
  SHAPE_EQUATIONS
} from '../animation/shapes/mathematical';

// Import adapter
import { shapeToLayout } from '../animation/utils/shapeAdapter';

// ═══════════════════════════════════════════════════════════════
// CORE TYPES & CONFIGURATION
// ═══════════════════════════════════════════════════════════════

// N is now dynamic based on the shape
// const N = CFG.particles.count; // DEPRECATED - each shape has its own count

// Shape sequence with new Shape3D generators (prefixed to avoid confusion with legacy)
const SHAPE_STATES = [
  'Shape3D_Tensor',
  'Shape3D_Wormhole',
  'Shape3D_Galaxy', 
  'Shape3D_Graph',
  'Shape3D_MobiusRibbon',
  'Shape3D_DoubleHelix',
  'Shape3D_TorusKnot',
  'Shape3D_KleinBottle',
  'Shape3D_Spherical',
  'Shape3D_Hypercube'
] as const;

type State = typeof SHAPE_STATES[number];

// Shape configurations mapping states to generators and equations
const SHAPE_CONFIGS: Record<State, { generator: Function, equation: string, baseParams?: any }> = {
  'Shape3D_Tensor': { 
    generator: generateTensor,
    equation: SHAPE_EQUATIONS.tensor,
    baseParams: { spacing: 2, skew: 0.3, twist: 0.5, noise: 0.1 }
  },
  'Shape3D_Wormhole': { 
    generator: generateWormhole,
    equation: SHAPE_EQUATIONS.wormhole,
    baseParams: { twist: 1.0, noise: 0.05 }
  },
  'Shape3D_Galaxy': { 
    generator: generateGalaxy,
    equation: SHAPE_EQUATIONS.galaxy
  },
  'Shape3D_Graph': { 
    generator: generateGraph,
    equation: SHAPE_EQUATIONS.graph
  },
  'Shape3D_MobiusRibbon': { 
    generator: generateMobiusRibbon,
    equation: SHAPE_EQUATIONS.mobius,
    baseParams: { twists: 1 }
  },
  'Shape3D_DoubleHelix': { 
    generator: generateDoubleHelix,
    equation: SHAPE_EQUATIONS.helix
  },
  'Shape3D_TorusKnot': { 
    generator: generateTorusKnot,
    equation: SHAPE_EQUATIONS.torus
  },
  'Shape3D_KleinBottle': { 
    generator: generateKleinBottle,
    equation: SHAPE_EQUATIONS.klein,
    baseParams: { twist: 1.0, noise: 0.05 }
  },
  'Shape3D_Spherical': { 
    generator: generateSphere,
    equation: SHAPE_EQUATIONS.sphere
  },
  'Shape3D_Hypercube': { 
    generator: generateHypercube,
    equation: SHAPE_EQUATIONS.hypercube
  }
};

// Point counts for each shape - using Shape3D prefix
const SHAPE_POINT_COUNTS: Record<State, number> = {
  'Shape3D_Tensor': 1000,
  'Shape3D_Wormhole': 1000,
  'Shape3D_Galaxy': 1200,
  'Shape3D_Graph': 1000,
  'Shape3D_MobiusRibbon': 1000,
  'Shape3D_DoubleHelix': 1000,
  'Shape3D_TorusKnot': 1000,
  'Shape3D_KleinBottle': 1000,
  'Shape3D_Spherical': 1000,
  'Shape3D_Hypercube': 1000
};

interface Machine {
  state: State;
  next: State;
  t: number;
  phase: 'pause' | 'morph';
  elapsed: number;
  startTime: number;
}

interface Line {
  a: number;
  b: number;
  strength: number;
  source?: string; // Legacy source tracking
  
  // COMPREHENSIVE ORIGIN TRACKING (optional for backwards compatibility)
  origin?: {
    method: string;           // Which method created this line
    timestamp: number;        // When was it created
    phase: string;           // Current animation phase
    t: number;               // Current t value
    stackTrace: string;      // Call stack (first few frames)
    rawStrength: number;     // Original strength before Math.max protection
    protectedStrength: number; // Final strength after Math.max
    brightness?: number;     // Brightness value used
    fadeValue?: number;      // Fade value used (fadeOut or fadeIn)
  };
}

// ═══════════════════════════════════════════════════════════════
// LINE ORIGIN TRACKING UTILITIES
// ═══════════════════════════════════════════════════════════════

function createLineOrigin(
  method: string,
  rawStrength: number,
  protectedStrength: number,
  phase: string,
  t: number,
  brightness?: number,
  fadeValue?: number
): Line['origin'] {
  // Get simplified stack trace (just method names, not full paths)
  const stack = new Error().stack || '';
  const stackLines = stack.split('\n').slice(1, 4); // Skip Error line, get next 3
  const cleanStack = stackLines
    .map(line => {
      // Extract just the method name from "at ClassName.method (file:line)"
      const match = line.match(/at\s+(?:.*\.)?(\w+)\s*\(/);
      return match ? match[1] : 'unknown';
    })
    .join(' → ');

  return {
    method,
    timestamp: Date.now(),
    phase,
    t,
    stackTrace: cleanStack,
    rawStrength,
    protectedStrength,
    brightness,
    fadeValue
  };
}

function createTrackedLine(
  a: number,
  b: number,
  rawStrength: number,
  method: string,
  phase: string,
  t: number,
  brightness?: number,
  fadeValue?: number,
  legacySource?: string
): Line {
  const protectedStrength = Math.max(0.01, rawStrength);
  
  return {
    a,
    b,
    strength: protectedStrength,
    source: legacySource,
    origin: createLineOrigin(method, rawStrength, protectedStrength, phase, t, brightness, fadeValue)
  };
}

// ═══════════════════════════════════════════════════════════════
// STREAMLINED ANIMATION ENGINE
// ═══════════════════════════════════════════════════════════════


const getLineAlpha = (line: Line, distance: number, isDark: boolean): number => {
  const base = isDark ? CFG.line.baseAlpha.dark : CFG.line.baseAlpha.light;
  const boost = isDark ? CFG.line.distanceBoost.dark : CFG.line.distanceBoost.light;
  const max = isDark ? CFG.line.maxAlpha.dark : CFG.line.maxAlpha.light;
  
  // Adjusted for normalized Shape3D system - smaller distances are normal
  const adjustedThreshold = CFG.line.distanceThreshold * 0.05; // Scale down more for unit cube
  const distFactor = Math.min(distance / adjustedThreshold, 1.0);
  return Math.min((base + distFactor * boost) * line.strength, max);
};

// Smart viewport fitting that maximizes use of available space
function calculateOptimalScale(bounds: Bounds, viewportWidth: number, viewportHeight: number, padding: number = CFG.viewport.padding): number {
  // Calculate the actual bounding box dimensions
  const boundsWidth = bounds.maxX - bounds.minX;
  const boundsHeight = bounds.maxY - bounds.minY;
  
  // For 2D projection, assume width is the effective dimension
  // Add minimal margin since layouts are maximized
  const effectiveWidth = boundsWidth * CFG.viewport.boundsMargin; // Just 5% margin for safety
  const effectiveHeight = boundsHeight * CFG.viewport.boundsMargin;
  
  // Available space after padding
  const availableWidth = viewportWidth - (2 * padding);
  const availableHeight = viewportHeight - (2 * padding);
  
  // Calculate scale factors for each dimension
  const scaleX = availableWidth / effectiveWidth;
  const scaleY = availableHeight / effectiveHeight;
  
  // Use the minimum scale to ensure everything fits
  const scale = Math.min(scaleX, scaleY);
  
  return Math.max(scale, CFG.viewport.minScale); // Allow scaling down to minimum for small windows
}

class StreamlinedAnimation {
  private layouts: { [key in State]: Layout } = {} as any;
  private stateBounds: { [key in State]: Bounds } = {} as any;
  private unifiedScale: number = 1; // Single scale for all states
  private lines: Line[] = [];
  private machine: Machine;
  private brownianOffsets: BrownianOffsets;
  private targetMapping: number[] = []; // Maps source index to target index
  private particleSizes: number[] = []; // Random sizes for each particle
  
  // GRADUAL TRANSITION SYSTEM
  private transitionLines: Line[] = []; // Lines that continue fading during early pause
  private isInExtendedTransition: boolean = false;
  private maxParticleCount: number = 0; // Track maximum particle count across all shapes
  private currentPositions: Vec3[] = []; // Current interpolated positions
  // Rotation state - simplified with a single rotation config object
  private rotation = {
    matrix: [[1,0,0],[0,1,0],[0,0,1]] as Matrix3x3,
    current: { axis: [0, 1, 0] as Vec3, speed: 1 },
    target: { axis: [0, 1, 0] as Vec3, speed: 1 },
    future: { axis: [0, 1, 0] as Vec3, speed: 1 },
    transitionProgress: 1,
    cycleCount: 0
  };
  private currentStateIndex: number = 0; // Track position in deterministic sequence
  private hasRegeneratedThisPause: boolean = false; // Track if we've regenerated during current pause
  private loggedFadeInStart: boolean = false;
  private loggedFadeOutComplete: boolean = false;
  private loggedFadeInComplete: boolean = false;
  private loggedSkippedEdges: boolean = false;
  private previousLineCount: number = 0;
  private previousLineStrengths: Map<string, number> = new Map();

  constructor() {
    console.log('🚀 NEW ANIMATION ENGINE WITH SHAPE3D INITIALIZED');
    console.log(`⏱️ Timing config: Pause ${CFG.timing.pauseMs}ms, Morph ${CFG.timing.morphMs}ms`);
    
    // Initialize with deterministic sequence
    const firstState = SHAPE_STATES[0]; // Start with first state
    const secondState = SHAPE_STATES[1]; // Next is second state
    this.currentStateIndex = 0;
    
    // Generate all layouts with random parameters
    this.generateLayouts();
    
    // Log shape details
    console.log(`📐 Shape details:`);
    for (const state of SHAPE_STATES) {
      const layout = this.layouts[state];
      console.log(`  ${state}: ${layout.positions.length} particles, ${layout.edges.length} edges`);
    }
    
    // Find maximum particle count across all shapes
    this.maxParticleCount = Math.max(...Object.values(SHAPE_POINT_COUNTS));
    
    // Initialize per-particle brownian motion offsets for max count
    this.brownianOffsets = createBrownianOffsets(this.maxParticleCount);
    
    // Initialize current positions with first state
    const firstLayout = this.layouts[firstState];
    this.currentPositions = [...firstLayout.positions];
    
    // Initialize particle mapping for first state
    this.targetMapping = Array.from({ length: firstLayout.positions.length }, (_, i) => i);
    
    // Initialize particle sizes for max count
    this.particleSizes = this.generateParticleSizes(this.maxParticleCount);
    
    this.machine = {
      state: firstState,
      next: secondState,
      t: 0,
      phase: 'pause',
      elapsed: 0,
      startTime: 0
    };
    
    // Initialize all lines for the initial tensor state to be immediately visible
    this.initializeAllLines();
  }

  private generateLayouts(): void {
    console.log('📐 GENERATING ALL LAYOUTS WITH NEW SHAPE SYSTEM');
    
    // Generate all layouts and immediately store their bounds
    for (const state of SHAPE_STATES) {
      const config = SHAPE_CONFIGS[state];
      const pointCount = SHAPE_POINT_COUNTS[state];
      
      // Generate Shape3D with base parameters and convert to Layout
      const shape = config.baseParams
        ? config.generator(pointCount, config.baseParams)
        : config.generator(pointCount);
      
      const layout = shapeToLayout(shape);
      
      this.layouts[state] = layout;
      this.stateBounds[state] = layout.bounds;
      
      console.log(`Generated ${state}: ${layout.positions.length} points, ${layout.edges.length} edges`);
    }
    
    console.log('✅ All layouts generated');
    console.log('📐 All shapes normalized to unit cube for consistent scale');
  }
  
  private generateParticleSizes(count: number): number[] {
    const sizes: number[] = [];
    for (let i = 0; i < count; i++) {
      // Normal distribution around 1.5 with std dev 0.3
      const size = Math.max(0.5, Math.min(3, randomNormal(1.5, 0.3)));
      sizes.push(size);
    }
    return sizes;
  }
  
  private initializeAllLines(): void {
    const edges = this.layouts[this.machine.state].edges;
    const brightness = this.layouts[this.machine.state].lineBrightness;
    
    // Initialize with all edges having strength based on their brightness (TRACKED)
    this.lines = edges.map((edge, i) => 
      createTrackedLine(
        edge[0],
        edge[1],
        brightness[i] || 0.5,
        'initialize_pause',
        'pause',
        0,
        brightness[i] || 0.5,
        undefined,
        `init_${i}`
      )
    );
    
    console.log(`✨ Initialized ${this.lines.length} lines for ${this.machine.state}`);
  }
  
  private regenerateNextState(): void {
    // Skip if we've already regenerated during this pause phase
    if (this.hasRegeneratedThisPause) return;
    
    // Regenerate the NEXT state (not current) to prepare for upcoming transition
    const nextState = this.machine.next;
    const config = SHAPE_CONFIGS[nextState];
    const pointCount = SHAPE_POINT_COUNTS[nextState];
    
    console.log(`🔄 Regenerating NEXT state ${nextState} at ${(this.machine.elapsed / 1000).toFixed(1)}s`);
    
    // Generate new shape with base parameters (could add random variations here)
    const shape = config.baseParams
      ? config.generator(pointCount, config.baseParams)
      : config.generator(pointCount);
    
    const layout = shapeToLayout(shape);
    
    this.layouts[nextState] = layout;
    this.stateBounds[nextState] = layout.bounds;
    
    console.log(`📊 Next state ${nextState} regenerated: ${layout.positions.length} positions`);
    
    // Mark that we've regenerated
    this.hasRegeneratedThisPause = true;
  }
  
  private getTransitionStrategy(): 'random' | 'nearest' {
    // Most transitions use optimal mapping
    return 'nearest';
  }
  
  private createOptimalMapping(sourcePositions: Vec3[], targetPositions: Vec3[]): number[] {
    const sourceCount = sourcePositions.length;
    const targetCount = targetPositions.length;
    const mapping: number[] = new Array(sourceCount);
    
    // For positions that exist in both, use optimal assignment
    const used = new Set<number>();
    
    for (let i = 0; i < sourceCount; i++) {
      let bestJ = -1;
      let bestDist = Infinity;
      
      for (let j = 0; j < targetCount; j++) {
        if (used.has(j)) continue;
        
        const dx = sourcePositions[i][0] - targetPositions[j][0];
        const dy = sourcePositions[i][1] - targetPositions[j][1];
        const dz = sourcePositions[i][2] - targetPositions[j][2];
        const dist = dx * dx + dy * dy + dz * dz;
        
        if (dist < bestDist) {
          bestDist = dist;
          bestJ = j;
        }
      }
      
      if (bestJ !== -1) {
        mapping[i] = bestJ;
        used.add(bestJ);
      }
    }
    
    // Handle any remaining source particles
    let unusedIdx = 0;
    const unusedTargets = Array.from({length: targetPositions.length}, (_, i) => i)
      .filter(i => !used.has(i));
    
    for (let i = 0; i < sourcePositions.length; i++) {
      if (mapping[i] === undefined) {
        if (unusedIdx < unusedTargets.length) {
          mapping[i] = unusedTargets[unusedIdx++];
        } else {
          // If we have more source than target, map to random target positions
          mapping[i] = Math.floor(Math.random() * targetPositions.length);
        }
      }
    }
    
    return mapping;
  }
  
  private updateMorphPhase(t: number, sourcePositions: Vec3[], targetPositions: Vec3[]): Vec3[] {
    const sourceCount = sourcePositions.length;
    const targetCount = targetPositions.length;
    const maxCount = Math.max(sourceCount, targetCount);
    const positions: Vec3[] = new Array(maxCount);
    
    for (let i = 0; i < maxCount; i++) {
      if (i < sourceCount) {
        // Source particle exists
        const targetIdx = this.targetMapping[i];
        const sourcePos = sourcePositions[i];
        const targetPos = targetPositions[targetIdx] || targetPositions[targetIdx % targetCount] || [0, 0, 0];
        
        // Use slerp for smoother transitions
        positions[i] = slerpVec3(sourcePos, targetPos, t);
      } else {
        // No source particle, fade in from a target position
        const targetIdx = i % targetCount;
        const targetPos = targetPositions[targetIdx] || [0, 0, 0];
        // Fade in effect: start from center or target position scaled down
        const fadeInPos: Vec3 = [targetPos[0] * t, targetPos[1] * t, targetPos[2] * t];
        positions[i] = fadeInPos;
      }
    }
    
    return positions;
  }
  
  private generateRotationChange(isHalfway: boolean = false): void {
    // Choose a random axis in a controlled way
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    const axis: Vec3 = [
      Math.sin(phi) * Math.cos(theta),
      Math.sin(phi) * Math.sin(theta),
      Math.cos(phi)
    ];
    
    // Speed varies but stays reasonable
    const speed = 0.3 + Math.random() * 0.4; // 0.3 to 0.7
    
    if (isHalfway) {
      // Store as future change
      this.rotation.future = { axis, speed };
    } else {
      // Apply immediately
      this.rotation.target = { axis, speed };
      this.rotation.transitionProgress = 0;
    }
  }
  
  update(deltaTime: number, viewportWidth: number, viewportHeight: number): {
    positions: Vec3[],
    lines: Line[],
    scale: number,
    stateInfo: { current: State, next: State, progress: number },
    equation?: string
  } {
    this.machine.elapsed += deltaTime;
    
    // Get current layout
    const currentLayout = this.layouts[this.machine.state];
    const currentPositions = currentLayout.positions;
    
    // Always update brownian motion for organic feel
    updateBrownianMotion(this.brownianOffsets, {
      amplitude: 2,
      speed: 0.5,
      frequency: 0.1,
      damping: 0.8
    }, deltaTime);
    
    // Smooth rotation interpolation
    if (this.rotation.transitionProgress < 1) {
      this.rotation.transitionProgress = Math.min(1, this.rotation.transitionProgress + deltaTime * 0.002);
      const t = easeInOutQuart(this.rotation.transitionProgress);
      
      const oldAxis = [...this.rotation.current.axis];
      this.rotation.current.axis = lerpVec3(
        this.rotation.current.axis,
        this.rotation.target.axis,
        t
      );
      this.rotation.current.speed = this.rotation.current.speed * (1 - t) + this.rotation.target.speed * t;
      
      // Log significant rotation changes
      const axisChange = Math.abs(oldAxis[0] - this.rotation.current.axis[0]) + 
                        Math.abs(oldAxis[1] - this.rotation.current.axis[1]) + 
                        Math.abs(oldAxis[2] - this.rotation.current.axis[2]);
      if (axisChange > 0.5) {
        console.log(`🔄 ROTATION AXIS CHANGE: ${axisChange.toFixed(2)}`);
      }
    }
    
    // Apply rotation
    const rotationDelta = createRotationMatrix(
      this.rotation.current.axis,
      this.rotation.current.speed * deltaTime * 0.001
    );
    this.rotation.matrix = multiplyMatrices(rotationDelta, this.rotation.matrix);
    
    // Calculate scale only once based on normalized unit cube bounds
    // All shapes are normalized to roughly [-1, 1] range
    if (this.unifiedScale === 1) {
      // Initial scale calculation
      const unitBounds = { minX: -1, maxX: 1, minY: -1, maxY: 1, minZ: -1, maxZ: 1 };
      this.unifiedScale = calculateOptimalScale(
        unitBounds,
        viewportWidth,
        viewportHeight
      );
      console.log(`📏 Initial scale set to ${this.unifiedScale.toFixed(2)} for unit cube`);
    }
    // Don't recalculate scale - keep it fixed to prevent jumps
    
    let positions: Vec3[];
    let linesToRender = this.lines;
    
    // Handle phase transitions
    if (this.machine.phase === 'pause') {
      const pauseElapsed = this.machine.elapsed - this.machine.startTime;
      
      // At 75% through pause, regenerate the NEXT state (like legacy)
      if (pauseElapsed > CFG.timing.pauseMs * 0.75 && !this.hasRegeneratedThisPause) {
        this.regenerateNextState();
      }
      
      // At 50% through pause, change rotation
      if (pauseElapsed > CFG.timing.pauseMs * 0.5 && this.rotation.cycleCount === 0) {
        this.generateRotationChange(false);
        this.rotation.cycleCount++;
      }
      
      // Check if pause phase is complete
      if (pauseElapsed >= CFG.timing.pauseMs) {
        console.log(`⏸️ Pause phase complete after ${(pauseElapsed / 1000).toFixed(1)}s (expected ${CFG.timing.pauseMs / 1000}s)`);
        // Transition to morph phase
        this.machine.phase = 'morph';
        this.machine.startTime = this.machine.elapsed;
        this.machine.t = 0;
        
        // Determine transition strategy
        const strategy = this.getTransitionStrategy();
        
        // Create mapping based on strategy
        const targetLayout = this.layouts[this.machine.next];
        const targetPositions = targetLayout.positions;
        
        if (strategy === 'random') {
          // Random shuffle mapping
          this.targetMapping = Array.from({length: currentPositions.length}, () => 
            Math.floor(Math.random() * targetPositions.length)
          );
        } else {
          // Optimal nearest-neighbor mapping
          this.targetMapping = this.createOptimalMapping(currentPositions, targetPositions);
        }
        
        console.log(`🔄 Starting morph: ${this.machine.state} → ${this.machine.next} (${strategy}) at ${(this.machine.elapsed / 1000).toFixed(1)}s`);
        console.log(`📈 Current edges: ${currentLayout.edges.length}, Target edges: ${this.layouts[this.machine.next].edges.length}`);
      }
      
      // Use current state positions and update currentPositions
      positions = currentPositions;
      
      // Check if positions changed suddenly
      if (this.currentPositions.length > 0) {
        const positionChange = Math.abs(currentPositions[0][0] - this.currentPositions[0][0]) + 
                               Math.abs(currentPositions[0][1] - this.currentPositions[0][1]) + 
                               Math.abs(currentPositions[0][2] - this.currentPositions[0][2]);
        if (positionChange > 1.0) {
          console.log(`⚠️ SUDDEN POSITION CHANGE in pause: ${positionChange.toFixed(2)} for ${this.machine.state}`);
        }
      }
      
      this.currentPositions = [...currentPositions];
      
      // During pause, show current state lines at full strength
      // CRITICAL FILTER: Block any pause lines without origin data
      const filteredPauseLines = this.lines.filter(line => {
        if (!line.origin) {
          console.error(`🚫 BLOCKED UNTRACKED PAUSE LINE: a=${line.a}, b=${line.b}, strength=${line.strength}, source=${line.source || 'UNKNOWN'}`);
          return false;
        }
        return true;
      });
      
      const pauseBlockedCount = this.lines.length - filteredPauseLines.length;
      if (pauseBlockedCount > 0) {
        console.error(`🚫 BLOCKED ${pauseBlockedCount} untracked pause lines out of ${this.lines.length} total`);
      }
      
      // GRADUAL TRANSITION: Add fading transition lines during early pause
      if (this.isInExtendedTransition && this.machine.elapsed < 1000) { // First 1 second of pause
        const transitionProgress = this.machine.elapsed / 1000; // 0.0 to 1.0 over first second
        const transitionFade = Math.max(0.01, 1 - transitionProgress); // Fade from 1.0 to 0.01
        
        const fadingTransitionLines = this.transitionLines.map(line => 
          createTrackedLine(
            line.a,
            line.b,
            (line.origin?.rawStrength || 0.3) * transitionFade,
            'extended_transition_fade',
            'pause',
            this.machine.elapsed / 1000,
            line.origin?.brightness || 0.5,
            transitionFade,
            `fade_${line.source}`
          )
        );
        
        linesToRender = [...filteredPauseLines, ...fadingTransitionLines];
        
        console.log(`🌊 Extended transition: ${fadingTransitionLines.length} transition lines at fade=${transitionFade.toFixed(3)}`);
        
        // End extended transition after fade complete
        if (transitionProgress >= 1.0) {
          this.isInExtendedTransition = false;
          this.transitionLines = [];
          console.log(`🌊 Extended transition complete`);
        }
      } else {
        linesToRender = filteredPauseLines;
      }
      
      // DEBUG: Check pause lines for strength issues
      const pauseZeroStrength = this.lines.filter(l => l.strength <= 0).length;
      const pauseLowStrength = this.lines.filter(l => l.strength > 0 && l.strength < 0.01).length;
      if (pauseZeroStrength > 0 || pauseLowStrength > 0) {
        console.error(`🚨 PAUSE LINE ISSUES: ${pauseZeroStrength} zero-strength, ${pauseLowStrength} low-strength out of ${this.lines.length} total`);
        if (pauseZeroStrength > 0) {
          const sample = this.lines.find(l => l.strength <= 0);
          console.error(`   Sample zero line: a=${sample?.a}, b=${sample?.b}, strength=${sample?.strength}, source=${sample?.source}`);
        }
      }
      
      // SMOOTH TRANSITION: Gradually reduce line count during early pause to avoid sudden drop
      if (this.machine.elapsed < 500) { // First 500ms of pause
        const smoothProgress = this.machine.elapsed / 500; // 0.0 to 1.0
        const maxLinesToShow = Math.floor(linesToRender.length * (0.8 + 0.2 * smoothProgress)); // Start at 80%, end at 100%
        
        // Use deterministic sampling to consistently show the same subset of lines
        linesToRender = linesToRender.filter((_, index) => {
          const keep = (index * 7919) % linesToRender.length < maxLinesToShow;
          return keep;
        });
        
        console.log(`🎭 Smooth pause transition: showing ${linesToRender.length}/${filteredPauseLines.length} lines (${(smoothProgress * 100).toFixed(1)}% progress)`);
      }
      
      // Log when we switch to showing lines during pause
      if (this.machine.elapsed < 100 && this.lines.length > 0) {
        console.log(`🖆 Showing ${this.lines.length} lines during pause for ${this.machine.state}`);
      }
      
    } else { // morph phase
      const morphElapsed = this.machine.elapsed - this.machine.startTime;
      this.machine.t = Math.min(1, morphElapsed / CFG.timing.morphMs);
      
      // Apply easing to morph progress
      const easedT = easeInOutQuart(this.machine.t);
      
      // Get target layout
      const targetLayout = this.layouts[this.machine.next];
      const targetPositions = targetLayout.positions;
      
      // Interpolate positions
      positions = this.updateMorphPhase(easedT, this.currentPositions, targetPositions);
      
      // Crossfade lines (like legacy)
      const currentEdges = currentLayout.edges;
      const currentBrightness = currentLayout.lineBrightness;
      const targetEdges = targetLayout.edges;
      const targetBrightness = targetLayout.lineBrightness;
      
      // GUARANTEED OVERLAP crossfade - never both zero
      const fadeOutRaw = 1 - easedT * 1.4;
      const fadeOut = Math.max(0.1, fadeOutRaw); // Always at least 0.1, fade out over ~71%
      const fadeInRaw = (easedT - 0.3) * 1.4;
      const fadeIn = Math.max(0.1, fadeInRaw); // Always at least 0.1, fade in from 30%
      
      // DEBUG: Log when fade protection kicks in
      if (fadeOutRaw < 0.1 && this.machine.t > 0.49 && this.machine.t < 0.51) {
        console.error(`🔍 FADEOUT PROTECTION: easedT=${easedT.toFixed(3)}, raw=${fadeOutRaw.toFixed(4)} → protected=${fadeOut.toFixed(3)}`);
      }
      if (fadeInRaw < 0.1 && this.machine.t > 0.49 && this.machine.t < 0.51) {
        console.error(`🔍 FADEIN PROTECTION: easedT=${easedT.toFixed(3)}, raw=${fadeInRaw.toFixed(4)} → protected=${fadeIn.toFixed(3)}`);
      }
      
      // Debug calculation if fadeIn is unexpectedly low
      if (easedT > 0.4 && fadeIn <= 0.1) {
        console.error(`🔍 FADEIN DEBUG: easedT=${easedT.toFixed(3)}, fadeInRaw=${fadeInRaw.toFixed(3)}, fadeIn=${fadeIn.toFixed(3)}`);
      }
      
      // GRADUAL TRANSITION: Check if we need extended transition for big edge count differences
      const currentEdgeCount = currentEdges.length;
      const targetEdgeCount = targetEdges.length;
      const edgeCountRatio = Math.max(currentEdgeCount, targetEdgeCount) / Math.min(currentEdgeCount, targetEdgeCount);
      const needsExtendedTransition = edgeCountRatio > 1.2; // 20%+ difference needs extended transition (lowered for testing)
      
      console.log(`🔄 Gradual crossfade at t=${this.machine.t.toFixed(2)}, easedT=${easedT.toFixed(2)}: fadeOut=${fadeOut.toFixed(2)}, fadeIn=${fadeIn.toFixed(2)}`);
      console.log(`📊 Edge counts: current=${currentEdgeCount}, target=${targetEdgeCount}, ratio=${edgeCountRatio.toFixed(1)}x, needsExtended=${needsExtendedTransition}`);
      if (needsExtendedTransition) {
        console.log(`🌊 Extended transition needed: ${currentEdgeCount} → ${targetEdgeCount} (ratio: ${edgeCountRatio.toFixed(1)}x)`);
      }
      
      // CRITICAL DEBUG: Trace the exact fade calculation
      if (Math.abs(fadeOut - 0.0) < 0.001) {
        console.error(`🚨 FADE BUG DETECTED: fadeOut is exactly 0.000!`);
        console.error(`   easedT=${easedT}, fadeOutRaw=${fadeOutRaw}, fadeOut=${fadeOut}`);
        console.error(`   Calculation: 1 - ${easedT} * 1.4 = ${1 - easedT * 1.4}`);
        console.error(`   Math.max(0.1, ${fadeOutRaw}) should be ${Math.max(0.1, fadeOutRaw)}`);
      }
      
      // Log line visibility transitions (only once per threshold)
      if (!this.loggedFadeInStart && fadeIn > 0) {
        console.log(`✨ Lines START FADING IN at ${(this.machine.elapsed / 1000).toFixed(2)}s, t=${this.machine.t.toFixed(2)}, easedT=${easedT.toFixed(2)}, fadeIn=${fadeIn.toFixed(2)}`);
        this.loggedFadeInStart = true;
      }
      if (!this.loggedFadeOutComplete && fadeOut === 0) {
        console.log(`🕴️ Lines FULLY FADED OUT at ${(this.machine.elapsed / 1000).toFixed(2)}s, t=${this.machine.t.toFixed(2)}, easedT=${easedT.toFixed(2)}`);
        this.loggedFadeOutComplete = true;
      }
      if (!this.loggedFadeInComplete && fadeIn >= 1.0) {
        console.log(`🎬 Lines FULLY FADED IN at ${(this.machine.elapsed / 1000).toFixed(2)}s, easedT=${easedT.toFixed(2)}`);
        this.loggedFadeInComplete = true;
      }
      
      // With clean transition at 0.5, there should be no gap
      // fadeOut and fadeIn are never both 0 simultaneously
      
      // Combine fading lines
      const combinedLines: Line[] = [];
      
      // Debug: Track line combination
      let fadeOutLinesAdded = 0;
      let fadeInLinesAdded = 0;
      
      console.log(`🔍 CROSSFADE DEBUG: fadeOut=${fadeOut.toFixed(3)}, fadeIn=${fadeIn.toFixed(3)}, currentEdges=${currentEdges.length}, targetEdges=${targetEdges.length}`);
      
      // Add fading out current lines with GRADUAL REDUCTION in late morph
      if (fadeOut > 0) {
        for (let i = 0; i < currentEdges.length; i++) {
          const edge = currentEdges[i];
          const brightness = currentBrightness[i] || 0.5;
          let rawStrength = brightness * fadeOut;
          
          // GRADUAL REDUCTION: Start removing excess fadeOut lines during late morph (t=0.8+)
          if (needsExtendedTransition && easedT > 0.8) {
            const latePhase = (easedT - 0.8) / 0.2; // 0.0 at t=0.8, 1.0 at t=1.0
            const keepProbability = Math.max(0.1, 1 - latePhase * 0.7); // Keep at least 10%, remove up to 70%
            
            // Only keep a fraction of fadeOut lines (stochastic with deterministic seed)
            const lineHash = (i * 7919) % 100; // Deterministic hash
            if (lineHash / 100 > keepProbability) {
              continue; // Skip this line (gradual removal)
            }
          }
          
          // Create fully tracked line
          const trackedLine = createTrackedLine(
            edge[0],
            edge[1], 
            rawStrength,
            'fadeOut_crossfade',
            this.machine.phase,
            this.machine.t,
            brightness,
            fadeOut,
            `fadeOut_${i}`
          );
          
          combinedLines.push(trackedLine);
          fadeOutLinesAdded++;
        }
      }
      
      // Add fading in target lines
      if (fadeIn > 0) {
        const sourceCount = this.currentPositions.length;
        let skippedEdges = 0;
        for (let i = 0; i < targetEdges.length; i++) {
          const edge = targetEdges[i];
          const [a, b] = edge;
          
          if (a < positions.length && b < positions.length) {
            const brightness = targetBrightness[i] || 0.5;
            const rawStrength = brightness * fadeIn;
            
            // Create fully tracked line
            const trackedLine = createTrackedLine(
              a,
              b,
              rawStrength,
              'fadeIn_crossfade',
              this.machine.phase,
              this.machine.t,
              brightness,
              fadeIn,
              `fadeIn_${i}`
            );
            
            combinedLines.push(trackedLine);
            fadeInLinesAdded++;
          } else {
            skippedEdges++;
          }
        }
        if (skippedEdges > 0 && !this.loggedSkippedEdges) {
          console.log(`⚠️ Skipped ${skippedEdges}/${targetEdges.length} target edges`);
          this.loggedSkippedEdges = true;
        }
      }
      
      console.log(`📊 CROSSFADE RESULT: Added ${fadeOutLinesAdded} fadeOut + ${fadeInLinesAdded} fadeIn = ${combinedLines.length} total lines`);
      
      // Debug line strength distribution
      const strengthStats = {
        zero: combinedLines.filter(l => l.strength <= 0.01).length,
        low: combinedLines.filter(l => l.strength > 0.01 && l.strength <= 0.1).length,
        medium: combinedLines.filter(l => l.strength > 0.1 && l.strength <= 0.5).length,
        high: combinedLines.filter(l => l.strength > 0.5).length
      };
      
      if (strengthStats.zero > 0) {
        console.error(`⚠️ LINE STRENGTH ISSUE: ${strengthStats.zero} lines have strength ≤ 0.01`);
        console.error(`   Distribution: zero=${strengthStats.zero}, low=${strengthStats.low}, med=${strengthStats.medium}, high=${strengthStats.high}`);
        console.error(`   fadeOut=${fadeOut.toFixed(3)}, fadeIn=${fadeIn.toFixed(3)} at t=${this.machine.t.toFixed(3)}`);
      }
      
      // CRITICAL: Check if we're creating empty line arrays
      if (combinedLines.length === 0 && (fadeOut > 0 || fadeIn > 0)) {
        console.error(`🚨 EMPTY LINES ARRAY! fadeOut=${fadeOut.toFixed(3)}, fadeIn=${fadeIn.toFixed(3)}, currentEdges=${currentEdges.length}, targetEdges=${targetEdges.length}`);
        console.error(`   easedT=${easedT.toFixed(3)}, t=${this.machine.t.toFixed(3)}`);
        console.error(`   currentPositions.length=${this.currentPositions.length}, positions.length=${positions.length}`);
      }
      
      // Track line array size changes
      const prevCombinedCount = this.previousLineCount || 0;
      if (prevCombinedCount > 0 && combinedLines.length === 0) {
        console.error(`💀 LINES WENT TO ZERO! Was ${prevCombinedCount}, now 0 at t=${this.machine.t.toFixed(3)}, easedT=${easedT.toFixed(3)}`);
      } else if (Math.abs(combinedLines.length - prevCombinedCount) > prevCombinedCount * 0.5 && prevCombinedCount > 0) {
        console.warn(`⚡ LARGE LINE ARRAY CHANGE: ${prevCombinedCount} → ${combinedLines.length} at t=${this.machine.t.toFixed(3)}`);
      }
      
      // Check for sudden line changes
      const currentLineCount = combinedLines.length;
      const lineDiff = Math.abs(currentLineCount - this.previousLineCount);
      
      // Log if line count changes dramatically (more than 10% change)
      if (this.previousLineCount > 0 && lineDiff > this.previousLineCount * 0.1) {
        console.log(`⚡ SUDDEN LINE CHANGE: ${this.previousLineCount} → ${currentLineCount} (diff: ${lineDiff}) at t=${this.machine.t.toFixed(2)}, easedT=${easedT.toFixed(2)}`);
        console.log(`  fadeOut=${fadeOut.toFixed(2)}, fadeIn=${fadeIn.toFixed(2)}`);
        console.log(`  Current edges: ${currentEdges.length}, Target edges: ${targetEdges.length}`);
      }
      
      // Track individual line strength changes
      const currentLineStrengths = new Map<string, number>();
      for (const line of combinedLines) {
        const key = `${line.a}-${line.b}`;
        currentLineStrengths.set(key, line.strength);
        
        const prevStrength = this.previousLineStrengths.get(key) || 0;
        const strengthDiff = Math.abs(line.strength - prevStrength);
        
        // Log if a line's strength jumps by more than 0.3
        if (strengthDiff > 0.3 && prevStrength > 0) {
          console.log(`💥 LINE STRENGTH JUMP: ${key} from ${prevStrength.toFixed(2)} to ${line.strength.toFixed(2)} at t=${this.machine.t.toFixed(2)}`);
        }
      }
      
      // Check for lines that disappeared
      for (const [key, prevStrength] of this.previousLineStrengths) {
        if (!currentLineStrengths.has(key) && prevStrength > 0.1) {
          console.log(`❌ LINE DISAPPEARED: ${key} (was strength ${prevStrength.toFixed(2)}) at t=${this.machine.t.toFixed(2)}, easedT=${easedT.toFixed(2)}`);
        }
      }
      
      // Check for lines that suddenly appeared
      for (const [key, strength] of currentLineStrengths) {
        if (!this.previousLineStrengths.has(key) && strength > 0.1) {
          console.log(`✨ LINE APPEARED: ${key} (strength ${strength.toFixed(2)}) at t=${this.machine.t.toFixed(2)}, easedT=${easedT.toFixed(2)}`);
        }
      }
      
      this.previousLineCount = currentLineCount;
      this.previousLineStrengths = currentLineStrengths;
      
      // CRITICAL FILTER: Block any lines without origin data
      const filteredLines = combinedLines.filter(line => {
        if (!line.origin) {
          console.error(`🚫 BLOCKED UNTRACKED LINE: a=${line.a}, b=${line.b}, strength=${line.strength}, source=${line.source || 'UNKNOWN'}`);
          return false;
        }
        return true;
      });
      
      const blockedCount = combinedLines.length - filteredLines.length;
      if (blockedCount > 0) {
        console.error(`🚫 BLOCKED ${blockedCount} untracked lines out of ${combinedLines.length} total`);
      }
      
      // Final check: ensure NO lines have 0 strength
      linesToRender = filteredLines.map((line, idx) => {
        const originalStrength = line.strength;
        const finalStrength = Math.max(0.01, line.strength);
        
        // Track any lines that needed strength boost
        if (originalStrength < 0.01 && originalStrength > 0) {
          console.error(`🔧 BOOSTED LINE STRENGTH: ${line.source || 'unknown'} from ${originalStrength.toFixed(4)} to ${finalStrength.toFixed(4)}`);
        }
        
        return {
          ...line,
          strength: finalStrength,
          source: line.source || `final_${idx}` // Ensure all lines have source tracking
        };
      });
      
      // Apply rotation change at 50% through morph
      if (easedT > 0.5 && this.rotation.cycleCount === 1) {
        this.generateRotationChange(false);
        this.rotation.cycleCount++;
      }
      
      // Check if morph is complete
      if (this.machine.t >= 1) {
        const morphElapsed = this.machine.elapsed - this.machine.startTime;
        console.log(`🎯 Morph phase complete after ${(morphElapsed / 1000).toFixed(1)}s (expected ${CFG.timing.morphMs / 1000}s)`);
        
        // Save old state for logging
        const oldState = this.machine.state;
        const newState = this.machine.next;
        
        // Complete the transition
        this.machine.state = newState;
        
        // Update current positions to target positions
        console.log(`🔀 TRANSITION COMPLETE: ${oldState} (${this.currentPositions.length} particles) → ${newState} (${targetPositions.length} particles)`);
        this.currentPositions = [...targetPositions];
        
        // Move to next state in sequence
        this.currentStateIndex = (this.currentStateIndex + 1) % SHAPE_STATES.length;
        this.machine.next = SHAPE_STATES[(this.currentStateIndex + 1) % SHAPE_STATES.length];
        
        // GRADUAL TRANSITION: Check if we need to continue some lines into pause phase
        const needsExtendedTransition = (Math.max(currentEdges.length, targetEdges.length) / Math.min(currentEdges.length, targetEdges.length)) > 1.2;
        if (needsExtendedTransition) {
          // Store some fadeOut lines to continue fading during early pause
          const linesToKeep = Math.floor(currentEdgeCount * 0.3); // Keep 30% of fadeOut lines
          this.transitionLines = [];
          
          for (let i = 0; i < Math.min(linesToKeep, currentEdges.length); i++) {
            const edge = currentEdges[i];
            const brightness = currentLayout.lineBrightness[i] || 0.5;
            
            this.transitionLines.push(createTrackedLine(
              edge[0],
              edge[1],
              brightness * 0.3, // Start at reduced strength
              'extended_transition',
              'pause',
              0,
              brightness,
              0.3,
              `transition_${i}`
            ));
          }
          
          this.isInExtendedTransition = true;
          console.log(`🌊 Extended transition: keeping ${this.transitionLines.length} transition lines for gradual fade`);
        } else {
          this.isInExtendedTransition = false;
        }
        
        // Switch to the new current state's lines (which was the target) - TRACKED
        // targetLayout still refers to the correct layout (now current)
        this.lines = targetLayout.edges.map((edge, i) => 
          createTrackedLine(
            edge[0],
            edge[1],
            targetLayout.lineBrightness[i] || 0.5,
            'transition_complete',
            'pause',
            0,
            targetLayout.lineBrightness[i] || 0.5,
            undefined,
            `complete_${i}`
          )
        );
        
        // Reset for next pause
        this.machine.phase = 'pause';
        this.machine.startTime = this.machine.elapsed;
        this.machine.t = 0;
        this.rotation.cycleCount = 0;
        this.hasRegeneratedThisPause = false; // Reset regeneration flag
        this.loggedFadeInStart = false; // Reset logging flags
        this.loggedFadeOutComplete = false;
        this.loggedFadeInComplete = false;
        this.loggedSkippedEdges = false;
        this.previousLineCount = 0; // Reset line tracking
        this.previousLineStrengths.clear();
        
        console.log(`✅ Completed transition to ${this.machine.state} at ${(this.machine.elapsed / 1000).toFixed(1)}s`);
        console.log(`🎯 Lines now showing: ${this.lines.length} edges from ${this.machine.state}`);
      }
    }
    
    // Apply rotation to all positions
    const rotatedPositions = positions.map(pos => 
      applyMatrixToVector(this.rotation.matrix, pos)
    );
    
    // Get current equation
    const equation = this.machine.phase === 'morph' && this.machine.t > 0.5
      ? SHAPE_CONFIGS[this.machine.next].equation
      : SHAPE_CONFIGS[this.machine.state].equation;
    
    return {
      positions: rotatedPositions,
      lines: linesToRender,
      scale: this.unifiedScale,
      stateInfo: {
        current: this.machine.state,
        next: this.machine.next,
        progress: this.machine.t
      },
      equation
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// REACT COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function AnimationCanvasNew() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<StreamlinedAnimation | null>(null);
  const frameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const isFirstFrame = useRef<boolean>(true);
  const equationRef = useRef<HTMLDivElement>(null);
  const [isDark, setIsDark] = useState(false);
  
  // Track theme changes
  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);
  
  // Handle equation rendering with KaTeX
  useEffect(() => {
    const renderEquation = (equation?: string) => {
      if (!equationRef.current || !equation) return;
      
      try {
        // Clear previous content
        equationRef.current.innerHTML = '';
        
        // Render new equation
        katex.render(equation, equationRef.current, {
          displayMode: true,
          throwOnError: false,
          output: 'html',
          trust: true
        });
        
        // Apply theme-specific colors
        const katexElements = equationRef.current.querySelectorAll('.katex');
        katexElements.forEach(el => {
          (el as HTMLElement).style.color = isDark ? '#60a5fa' : '#1e40af';
        });
      } catch (error) {
        console.error('KaTeX render error:', error);
        equationRef.current.innerHTML = equation || '';
      }
    };
    
    const checkAndRender = () => {
      if (animationRef.current && equationRef.current) {
        // Get current equation without updating animation state
        const currentState = animationRef.current['machine'].state;
        const equation = animationRef.current['machine'].phase === 'morph' && animationRef.current['machine'].t > 0.5
          ? SHAPE_CONFIGS[animationRef.current['machine'].next].equation
          : SHAPE_CONFIGS[currentState]?.equation;
        renderEquation(equation);
      }
    };
    
    // Initial render
    checkAndRender();
    
    // Re-render when theme changes
    const interval = setInterval(checkAndRender, 100);
    return () => clearInterval(interval);
  }, [isDark]);
  
  // Main animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true
    });
    if (!ctx) return;
    
    // Initialize animation
    if (!animationRef.current) {
      animationRef.current = new StreamlinedAnimation();
    }
    
    // Setup canvas
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2 for performance
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      ctx.scale(dpr, dpr);
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Animation loop
    const animate = (currentTime: number) => {
      // Initialize lastTimeRef on first frame
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = currentTime;
      }
      
      const deltaTime = Math.min(currentTime - lastTimeRef.current, 32); // Cap at ~30fps min
      lastTimeRef.current = currentTime;
      
      // Get animation state
      const state = animationRef.current!.update(
        deltaTime,
        canvas.width / (window.devicePixelRatio || 1),
        canvas.height / (window.devicePixelRatio || 1)
      );
      
      // Clear canvas
      const { width, height } = canvas.getBoundingClientRect();
      ctx.fillStyle = isDark ? '#0a0a0a' : '#f0f0f0';
      ctx.fillRect(0, 0, width, height);
      
      // Get colors based on theme
      const { nodeColor, lineColor } = getRenderColors();
      
      // Calculate center
      const centerX = width / 2;
      const centerY = height / 2;
      
      // Draw lines
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1;
      
      let visibleLines = 0;
      let skippedLowStrength = 0;
      let skippedBounds = 0;
      let skippedLowAlpha = 0;
      
      for (const line of state.lines) {
        if (line.strength <= 0) {
          // Log the first few 0-strength lines with FULL ORIGIN TRACKING
          if (skippedLowStrength < 5) {
            console.error(`💀 ZERO STRENGTH LINE [${skippedLowStrength + 1}]: a=${line.a}, b=${line.b}, strength=${line.strength}`);
            
            if (line.origin) {
              console.error(`   🔍 ORIGIN: method=${line.origin.method}, phase=${line.origin.phase}, t=${line.origin.t.toFixed(3)}`);
              console.error(`   🔍 STRENGTH: raw=${line.origin.rawStrength}, protected=${line.origin.protectedStrength}`);
              console.error(`   🔍 VALUES: brightness=${line.origin.brightness}, fadeValue=${line.origin.fadeValue}`);
              console.error(`   🔍 STACK: ${line.origin.stackTrace}`);
            } else {
              console.error(`   ❌ NO ORIGIN DATA - Line created outside tracked system!`);
              console.error(`   🔍 Legacy Source: ${line.source || 'UNKNOWN'}`);
            }
          }
          skippedLowStrength++;
          continue;
        }
        
        // Ensure indices are within bounds
        if (line.a >= state.positions.length || line.b >= state.positions.length) {
          skippedBounds++;
          continue;
        }
        
        const posA = state.positions[line.a];
        const posB = state.positions[line.b];
        
        if (!posA || !posB) {
          skippedBounds++;
          continue;
        }
        
        // Apply brownian motion from animation
        const brownian = animationRef.current!['brownianOffsets'];
        
        // Use modulo to handle cases where indices exceed brownian array length
        const brownianIdxA = line.a % brownian.x.length;
        const brownianIdxB = line.b % brownian.x.length;
        
        const x1 = centerX + (posA[0] + brownian.x[brownianIdxA]) * state.scale;
        const y1 = centerY + (posA[1] + brownian.y[brownianIdxA]) * state.scale;
        const x2 = centerX + (posB[0] + brownian.x[brownianIdxB]) * state.scale;
        const y2 = centerY + (posB[1] + brownian.y[brownianIdxB]) * state.scale;
        
        // SIMPLE TRANSPARENCY: Use line.strength directly as alpha (no distance calculations)
        const alpha = Math.max(0.01, line.strength * 0.8); // Simple opacity based on crossfade strength
        
        if (alpha > 0) {
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          visibleLines++;
        } else {
          skippedLowAlpha++;
        }
      }
      
      // Smart logging - detect sudden visibility changes
      const totalExpectedLines = state.lines.length;
      const actualRenderedLines = visibleLines;
      const renderingEfficiency = totalExpectedLines > 0 ? (actualRenderedLines / totalExpectedLines) : 0;
      
      // Log every 100ms during transitions for detailed tracking
      const shouldLogDetailed = animationRef.current?.['machine']?.phase === 'morph';
      const logInterval = shouldLogDetailed ? 100 : 1000;
      const currentLogSecond = Math.floor(lastTimeRef.current / logInterval);
      const previousLogSecond = Math.floor((lastTimeRef.current - deltaTime) / logInterval);
      
      if (currentLogSecond !== previousLogSecond) {
        const machineState = animationRef.current?.['machine'];
        const phase = machineState?.phase || 'unknown';
        const t = machineState?.t || 0;
        
        console.log(`🎨 RENDER [${phase}:${t.toFixed(2)}]: ${actualRenderedLines}/${totalExpectedLines} lines (${(renderingEfficiency * 100).toFixed(1)}%) - skipped: strength=${skippedLowStrength}, bounds=${skippedBounds}, alpha=${skippedLowAlpha}`);
        
        // Flag concerning drops in line visibility
        if (renderingEfficiency < 0.1 && totalExpectedLines > 0) {
          console.error(`🚨 CRITICAL LINE DROP: Only ${(renderingEfficiency * 100).toFixed(1)}% of lines rendering!`);
        } else if (renderingEfficiency < 0.5 && totalExpectedLines > 50) {
          console.warn(`⚠️ LOW LINE VISIBILITY: Only ${(renderingEfficiency * 100).toFixed(1)}% of lines rendering`);
        }
      }
      
      // Track sudden drops in visible line count between frames
      const lastFrameVisibleLines = animationRef.current?.['lastFrameVisibleLines'] || 0;
      if (lastFrameVisibleLines > 0) {
        const lineDrop = lastFrameVisibleLines - actualRenderedLines;
        const dropPercentage = lineDrop / lastFrameVisibleLines;
        
        if (dropPercentage > 0.3 && lineDrop > 20) {
          console.error(`💥 SUDDEN LINE DISAPPEARANCE: ${lastFrameVisibleLines} → ${actualRenderedLines} (${lineDrop} lines, ${(dropPercentage * 100).toFixed(1)}% drop)`);
          console.error(`   Phase: ${animationRef.current?.['machine']?.phase}, t=${animationRef.current?.['machine']?.t?.toFixed(3)}`);
          console.error(`   Skipped: strength=${skippedLowStrength}, bounds=${skippedBounds}, alpha=${skippedLowAlpha}`);
        }
      }
      animationRef.current!['lastFrameVisibleLines'] = actualRenderedLines;
      
      // Draw particles
      ctx.fillStyle = nodeColor;
      ctx.globalAlpha = isDark ? 0.9 : 0.8;
      
      const particleSizes = animationRef.current!['particleSizes'];
      const brownian = animationRef.current!['brownianOffsets'];
      
      for (let i = 0; i < state.positions.length; i++) {
        const pos = state.positions[i];
        if (!pos) continue;
        
        // Use modulo to handle cases where we have more particles than brownian offsets
        const brownianIdx = i % brownian.x.length;
        const sizeIdx = i % particleSizes.length;
        
        const x = centerX + (pos[0] + brownian.x[brownianIdx]) * state.scale;
        const y = centerY + (pos[1] + brownian.y[brownianIdx]) * state.scale;
        const size = particleSizes[sizeIdx] * 2;
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.globalAlpha = 1;
      
      frameRef.current = requestAnimationFrame(animate);
    };
    
    frameRef.current = requestAnimationFrame(animate);
    
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [isDark]);
  
  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ background: isDark ? '#0a0a0a' : '#f0f0f0' }}
      />
      {/* Equation display */}
      <div className="absolute top-4 left-4 pointer-events-none z-30">
        <div 
          ref={equationRef}
          className="text-2xl font-light opacity-60 hover:opacity-100 transition-opacity duration-300"
          style={{ 
            fontFamily: 'KaTeX_Main, "Times New Roman", serif',
            textShadow: isDark ? '0 2px 4px rgba(0,0,0,0.5)' : '0 2px 4px rgba(255,255,255,0.5)'
          }}
        />
      </div>
    </>
  );
}