import { useEffect, useRef } from 'react';
import {
  lerpVec3,
  type Vec3
} from './utils/mathUtils';
import {
  createBrownianOffsets,
  updateBrownianMotion,
  setupCanvas,
  getRenderColors,
  type BrownianOffsets
} from './utils/canvasUtils';
import {
  type Layout,
  type Bounds
} from './utils/layoutUtils';
import { 
  generateMathTensorLayout,
  generateMathGraphLayout,
  generateMathHelixLayout,
  generateMathWormholeLayout,
  generateMathTorusKnotLayout,
  generateMathSphericalLayout
} from './layouts/mathematicalLayouts';

// ═══════════════════════════════════════════════════════════════
// CORE TYPES & CONFIGURATION (Based on SimplifiedNetworkCanvas)
// ═══════════════════════════════════════════════════════════════

// Configuration - simplified for mathematical layouts
const CFG = {
  // Animation timing
  timing: { 
    pauseMs: 2000,      // Pause duration between morphs
    morphMs: 6000       // Morph animation duration
  },

  // Line rendering
  line: { 
    brightness: 0.8,            // Base line brightness
    baseAlpha: { dark: 0.3, light: 0.25 },      // Base transparency
    distanceBoost: { dark: 0.3, light: 0.25 },  // Extra alpha for long lines
    maxAlpha: { dark: 0.6, light: 0.5 },        // Maximum line opacity
    thickness: 0.5              // Line thickness
  },
  
  // Brownian motion
  brownian: { 
    amplitude: 1.5,           // Motion amplitude
    speed: 0.008,               // Motion speed (reduced by 50%)
    damping: 0.997,             // Motion damping (increased for smoother motion)
    delayMs: 600,               // Delay before starting
    rampMs: 500                 // Ramp-up duration
  },
  
  // Particle rendering
  particle: {
    radius: 2,                  // Particle radius
  },
  
  // Viewport
  viewport: {
    padding: 5,                 // Minimal canvas padding
    aspectRatio: 0.75           // Increased aspect ratio for taller canvas
  }
};

const N = 729; // 9^3 dots for all states

// Data types
enum State { Tensor, Morph1, Graph, Morph2, Wormhole, Morph3, TorusKnot, Spherical }

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
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT GENERATORS (From SimplifiedNetworkCanvas)
// ═══════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════
// STREAMLINED ANIMATION ENGINE
// ═══════════════════════════════════════════════════════════════

const easeInOutQuart = (t: number): number => 
  t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;


const getLineAlpha = (line: Line, distance: number, isDark: boolean): number => {
  const base = isDark ? CFG.line.baseAlpha.dark : CFG.line.baseAlpha.light;
  const boost = isDark ? CFG.line.distanceBoost.dark : CFG.line.distanceBoost.light;
  const max = isDark ? CFG.line.maxAlpha.dark : CFG.line.maxAlpha.light;
  
  const distFactor = Math.min(distance / 3.0, 1.0);
  return Math.min((base + distFactor * boost) * line.strength, max);
};

// Smart viewport fitting that maximizes use of available space
function calculateOptimalScale(bounds: Bounds, viewportWidth: number, viewportHeight: number, padding: number = CFG.viewport.padding): number {
  // Calculate the actual bounding box dimensions
  const boundsWidth = bounds.maxX - bounds.minX;
  const boundsHeight = bounds.maxY - bounds.minY;
  
  // For 2D projection, assume width is the effective dimension
  // Add minimal margin since layouts are maximized
  const effectiveWidth = boundsWidth * 1.05; // Just 5% margin for safety
  const effectiveHeight = boundsHeight * 1.05;
  
  // Available space after padding
  const availableWidth = viewportWidth - (2 * padding);
  const availableHeight = viewportHeight - (2 * padding);
  
  // Calculate scale factors for each dimension
  const scaleX = availableWidth / effectiveWidth;
  const scaleY = availableHeight / effectiveHeight;
  
  // Use the minimum scale to ensure everything fits
  const scale = Math.min(scaleX, scaleY);
  
  return Math.max(scale, 0.1); // Allow scaling down to 10% for small windows
}

class StreamlinedAnimation {
  private layouts: { [key in State]: Layout } = {} as any;
  private stateBounds: { [key in State]: Bounds } = {} as any;
  private unifiedScale: number = 1; // Single scale for all states
  private lines: Line[] = [];
  private machine: Machine;
  private brownianOffsets: BrownianOffsets;
  private particleMapping: number[] = []; // Maps particle index to position index in current state
  private targetMapping: number[] = []; // Maps particle index to position index in target state
  // Rotation state - simplified with a single rotation config object
  private rotation = {
    matrix: [[1,0,0],[0,1,0],[0,0,1]] as number[][],
    current: { axis: [0, 1, 0] as Vec3, speed: 1 },
    target: { axis: [0, 1, 0] as Vec3, speed: 1 },
    future: { axis: [0, 1, 0] as Vec3, speed: 1 },
    transitionProgress: 1,
    cycleCount: 0
  };
  private stateHistory: State[] = []; // Track last few states to avoid repetition
  private stateSequence: State[] = []; // Pre-generated randomized sequence

  constructor() {
    // Generate all 4 states with slight viewing angle randomness
    this.generateLayouts();
    
    // Initialize brownian motion offsets - always active
    this.brownianOffsets = createBrownianOffsets(N);
    
    // Initialize particle mapping - initially particles are at their index positions
    this.particleMapping = Array.from({ length: N }, (_, i) => i);
    this.targetMapping = Array.from({ length: N }, (_, i) => i);
    
    // Initialize with random states
    const firstState = this.getNextRandomState();
    this.stateHistory.push(firstState);
    const secondState = this.getNextRandomState();
    
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

  // Layout generator mapping for cleaner code
  private readonly layoutGenerators: Record<State, () => Layout> = {
    [State.Tensor]: generateMathTensorLayout,
    [State.Morph1]: () => generateMathHelixLayout(0), // Flat disk galaxy
    [State.Graph]: generateMathGraphLayout,
    [State.Morph2]: () => generateMathHelixLayout(1), // Möbius ribbon
    [State.Wormhole]: generateMathWormholeLayout,
    [State.Morph3]: () => generateMathHelixLayout(2), // DNA double helix
    [State.TorusKnot]: generateMathTorusKnotLayout,
    [State.Spherical]: generateMathSphericalLayout
  };

  private generateLayouts(): void {
    // Generate all layouts using the mapping
    for (const value of Object.values(State)) {
      if (typeof value === 'number') {
        const state = value as State;
        this.layouts[state] = this.layoutGenerators[state]();
        this.stateBounds[state] = this.layouts[state].bounds;
      }
    }
  }
  
  private getNextRandomState(): State {
    // Get all possible states (now 8 states!)
    const allStates = [
      State.Tensor, State.Morph1, State.Graph, State.Morph2, 
      State.Wormhole, State.Morph3, State.TorusKnot, State.Spherical
    ];
    
    // Filter out states that appeared in the last 2 steps (avoid repetition within 3 steps)
    const recentStates = this.stateHistory.slice(-2);
    const availableStates = allStates.filter(s => !recentStates.includes(s));
    
    // If somehow all states are excluded (shouldn't happen with 8 states), fallback
    if (availableStates.length === 0) {
      return allStates[Math.floor(Math.random() * allStates.length)];
    }
    
    // Pick a random state from available ones
    return availableStates[Math.floor(Math.random() * availableStates.length)];
  }
  
  updateUnifiedScale(width: number, height: number): void {
    // Calculate a single scale that works for all states (use the most conservative)
    const scales = Object.values(State)
      .filter(s => typeof s === 'number')
      .map(s => calculateOptimalScale(this.stateBounds[s as State], width, height, CFG.viewport.padding));
    this.unifiedScale = Math.min(...scales);
  }

  private initializeAllLines(): void {
    this.lines = this.layouts[this.machine.state].edges.map(([a, b]) => 
      ({ a, b, strength: 1.0 })
    );
  }

  private generateRandomMapping(): void {
    // Completely random shuffle of particles to new positions
    const availablePositions = Array.from({ length: N }, (_, i) => i);
    
    // Shuffle available positions randomly
    for (let i = availablePositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availablePositions[i], availablePositions[j]] = [availablePositions[j], availablePositions[i]];
    }
    
    // Assign shuffled positions to particles
    this.targetMapping = availablePositions;
  }

  private updateRotation(): void {
    // Smoothly transition rotation parameters over 3 complete cycles
    if (this.rotation.transitionProgress < 1) {
      const cyclesForTransition = 3;
      const totalCycleDuration = CFG.timing.pauseMs + CFG.timing.morphMs;
      const currentCycleTime = this.machine.phase === 'pause' 
        ? this.machine.elapsed 
        : CFG.timing.pauseMs + this.machine.elapsed;
      
      const totalProgress = (this.rotation.cycleCount * totalCycleDuration + currentCycleTime) / 
                          (cyclesForTransition * totalCycleDuration);
      this.rotation.transitionProgress = Math.min(1, totalProgress);
      const t = easeInOutQuart(this.rotation.transitionProgress);
      
      // Slerp between current and target axis
      this.rotation.current.axis = this.slerpVec3(
        this.rotation.current.axis, 
        this.rotation.target.axis, 
        t
      );
      
      // Interpolate speed
      this.rotation.current.speed = this.rotation.current.speed * (1 - t) + 
                                   this.rotation.target.speed * t;
    }

    // Apply incremental rotation
    const baseRotationSpeed = Math.PI / 20000;
    const deltaAngle = this.rotation.current.speed * baseRotationSpeed * 16.67;
    
    if (Math.abs(deltaAngle) > 0.0001) {
      this.rotation.matrix = this.multiplyRotationMatrix(
        this.rotation.matrix,
        this.createRotationMatrix(this.rotation.current.axis, deltaAngle)
      );
    }
  }

  private slerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
    const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    
    if (Math.abs(dot) > 0.9999) {
      return [...b];
    }
    
    const theta = Math.acos(Math.max(-1, Math.min(1, dot)));
    const sinTheta = Math.sin(theta);
    
    if (Math.abs(sinTheta) < 0.001) {
      return [...b];
    }
    
    const wa = Math.sin((1 - t) * theta) / sinTheta;
    const wb = Math.sin(t * theta) / sinTheta;
    
    const result: Vec3 = [
      wa * a[0] + wb * b[0],
      wa * a[1] + wb * b[1],
      wa * a[2] + wb * b[2]
    ];
    
    // Normalize
    const len = Math.sqrt(result[0]**2 + result[1]**2 + result[2]**2);
    return len > 0 ? [result[0]/len, result[1]/len, result[2]/len] : result;
  }

  private createRotationMatrix(axis: Vec3, angle: number): number[][] {
    const [ax, ay, az] = axis;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const t = 1 - c;
    
    return [
      [c + ax*ax*t, ax*ay*t - az*s, ax*az*t + ay*s],
      [ay*ax*t + az*s, c + ay*ay*t, ay*az*t - ax*s],
      [az*ax*t - ay*s, az*ay*t + ax*s, c + az*az*t]
    ];
  }

  private multiplyRotationMatrix(a: number[][], b: number[][]): number[][] {
    const result = [[0,0,0],[0,0,0],[0,0,0]];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        for (let k = 0; k < 3; k++) {
          result[i][j] += a[i][k] * b[k][j];
        }
      }
    }
    return result;
  }

  update(time: number): void {
    if (this.machine.startTime === 0) {
      this.machine.startTime = time;
    }

    this.machine.elapsed = time - this.machine.startTime;

    // ALWAYS update brownian motion - it never stops
    updateBrownianMotion(this.brownianOffsets, CFG.brownian);

    // Update rotation
    this.updateRotation();
    
    // Update state machine
    if (this.machine.phase === 'pause') {
      if (this.machine.elapsed >= CFG.timing.pauseMs) {
        // Start morphing - just generate random mapping, don't regenerate layouts yet
        this.generateRandomMapping();
        
        this.machine.phase = 'morph';
        this.machine.t = 0;
        this.machine.startTime = time;
        this.machine.elapsed = 0;
      }
    } else { // morph
      this.machine.t = Math.min(this.machine.elapsed / CFG.timing.morphMs, 1);
      
      if (this.machine.t === 1) {
        // Transition complete - update particle mapping
        this.particleMapping = [...this.targetMapping];
        
        // Update state
        this.machine.state = this.machine.next;
        
        // Add current state to history and get next random state
        this.stateHistory.push(this.machine.state);
        // Keep only last 3 states in history
        if (this.stateHistory.length > 3) {
          this.stateHistory.shift();
        }
        this.machine.next = this.getNextRandomState();
        
        // Update rotation cycles
        this.updateRotationCycle();
        
        // Regenerate layouts that haven't been used recently
        // Find states that are not in current, next, or recent history
        const allStates = [
          State.Tensor, State.Morph1, State.Graph, State.Morph2, 
          State.Wormhole, State.Morph3, State.TorusKnot, State.Spherical
        ];
        const recentlyUsed = new Set([this.machine.state, this.machine.next, ...this.stateHistory.slice(-2)]);
        const statesToRegenerate = allStates.filter(s => !recentlyUsed.has(s));
        
        // Regenerate layouts for states that haven't been used recently
        statesToRegenerate.forEach(state => {
          this.layouts[state] = this.layoutGenerators[state]();
          this.stateBounds[state] = this.layouts[state].bounds;
        });
        
        // State already updated above, just reset phase
        this.machine.phase = 'pause';
        this.machine.startTime = time;
        this.machine.elapsed = 0;
      }
    }

    this.updateLines();
  }

  private updateRotationCycle(): void {
    this.rotation.cycleCount++;
    
    // Every 3 cycles, start a new rotation transition
    if (this.rotation.cycleCount >= 3) {
      // Shift future to target
      this.rotation.target = { ...this.rotation.future };
      
      // Generate new future rotation
      this.rotation.future = this.generateNewRotation(this.rotation.future.axis);
      
      // Reset counters
      this.rotation.cycleCount = 0;
      this.rotation.transitionProgress = 0;
    }
  }

  private generateNewRotation(currentAxis: Vec3): { axis: Vec3, speed: number } {
    // Generate perpendicular axis for rotation
    const perpAxis = this.getPerpendicularAxis(currentAxis);
    
    // Random perturbation angle (45-135 degrees)
    const perturbAngle = Math.PI / 4 + Math.random() * Math.PI / 2;
    
    // Rotate current axis around perpendicular by perturbAngle
    const rotMatrix = this.createRotationMatrix(perpAxis, perturbAngle);
    const newAxis = this.applyRotationToVector(currentAxis, rotMatrix, true); // Normalize for axis
    
    // Small speed variation (0.9x to 1.1x)
    const speed = 0.9 + Math.random() * 0.2;
    
    return { axis: newAxis, speed };
  }

  private getPerpendicularAxis(axis: Vec3): Vec3 {
    let perpAxis: Vec3;
    if (Math.abs(axis[2]) < 0.9) {
      perpAxis = [-axis[1], axis[0], 0];
    } else {
      perpAxis = [0, -axis[2], axis[1]];
    }
    
    // Normalize
    const len = Math.sqrt(perpAxis[0]**2 + perpAxis[1]**2 + perpAxis[2]**2);
    return len > 0 ? [perpAxis[0]/len, perpAxis[1]/len, perpAxis[2]/len] : perpAxis;
  }

  private applyRotationToVector(vec: Vec3, matrix: number[][], normalize: boolean = false): Vec3 {
    const result: Vec3 = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        result[i] += matrix[i][j] * vec[j];
      }
    }
    if (normalize) {
      // Only normalize when needed (for axis vectors)
      const len = Math.sqrt(result[0]**2 + result[1]**2 + result[2]**2);
      return len > 0 ? [result[0]/len, result[1]/len, result[2]/len] : result;
    }
    return result;
  }

  private updateLines(): void {
    const isMorphing = this.machine.phase === 'morph';
    
    if (isMorphing) {
      const t = this.machine.t;
      
      // Simple fade out and fade in
      const fadeOut = Math.max(0, 1 - t * 2); // Fade out in first 50%
      const fadeIn = Math.max(0, (t - 0.5) * 2); // Fade in in last 50%
      
      // During morph, fade out current lines and fade in target lines
      const currentEdges = this.layouts[this.machine.state].edges;
      const targetEdges = this.layouts[this.machine.next].edges;
      
      // Combine fading lines
      this.lines = [
        ...(fadeOut > 0 ? currentEdges.map(([a, b]) => ({ a, b, strength: fadeOut })) : []),
        ...(fadeIn > 0 ? targetEdges.map(([a, b]) => ({ a, b, strength: fadeIn })) : [])
      ];
    } else {
      // Steady state: show current layout lines at full strength
      const currentEdges = this.layouts[this.machine.state].edges;
      
      // Only rebuild if needed (line count mismatch)
      if (this.lines.length !== currentEdges.length) {
        this.lines = currentEdges.map(([a, b]) => ({ a, b, strength: 1.0 }));
      } else {
        this.lines.forEach(line => line.strength = 1.0);
      }
    }
  }


  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const colors = getRenderColors();
    
    // Calculate current bounds and scaling
    const currentLayout = this.layouts[this.machine.state];
    const targetLayout = this.layouts[this.machine.next];
    
    // All states use the same scaling (1.0) - size differences come from intrinsic layout
    const widthScale = 1.0;
    const heightScale = 1.0;
    
    const centerX = width / 2;
    const centerY = height / 2;
    const modelCenterX = 0;  // Model is pre-centered at origin
    const modelCenterY = 0;  // Model is pre-centered at origin

    const isMorphing = this.machine.phase === 'morph';
    const easedT = isMorphing ? easeInOutQuart(this.machine.t) : 0;
    
    // Use the unified scale for all states (no snapping), multiplied by 1.2 for larger display
    const scale = this.unifiedScale * 1.2;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate particle positions based on mapping
    const particlePositions: Vec3[] = new Array(N);
    
    for (let particleIdx = 0; particleIdx < N; particleIdx++) {
      let pos: Vec3;
      if (isMorphing) {
        // During morph, interpolate from current to target position
        const currentPosIdx = this.particleMapping[particleIdx];
        const targetPosIdx = this.targetMapping[particleIdx];
        const currentPos = currentLayout.positions[currentPosIdx];
        const targetPos = targetLayout.positions[targetPosIdx];
        pos = lerpVec3(currentPos, targetPos, easedT);
      } else {
        // In steady state, use current mapping
        const posIdx = this.particleMapping[particleIdx];
        pos = currentLayout.positions[posIdx];
      }
      
      // Apply accumulated rotation matrix
      particlePositions[particleIdx] = this.applyRotationToVector(pos, this.rotation.matrix);
    }

    // Draw lines connecting the actual particles (with brownian motion)
    
    this.lines.forEach(line => {
      // Skip rendering lines that are essentially invisible
      if (line.strength < 0.01) return;
      
      // Find which particles are at positions line.a and line.b
      let particleA = -1;
      let particleB = -1;
      
      // During morph or steady state, find particles at the line endpoints
      if (isMorphing) {
        // During first half of morph, use current mapping; second half use target
        const mapping = this.machine.t < 0.5 ? this.particleMapping : this.targetMapping;
        for (let i = 0; i < N; i++) {
          if (mapping[i] === line.a) particleA = i;
          if (mapping[i] === line.b) particleB = i;
          if (particleA >= 0 && particleB >= 0) break;
        }
      } else {
        // In steady state, use current mapping
        for (let i = 0; i < N; i++) {
          if (this.particleMapping[i] === line.a) particleA = i;
          if (this.particleMapping[i] === line.b) particleB = i;
          if (particleA >= 0 && particleB >= 0) break;
        }
      }
      
      // If we found both particles, draw the line
      if (particleA >= 0 && particleB >= 0) {
        const posA = particlePositions[particleA];
        const posB = particlePositions[particleB];
        
        // Calculate distance for visibility
        const dx = posA[0] - posB[0];
        const dy = posA[1] - posB[1];
        const dz = posA[2] - posB[2];
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        // Lines connect particles with their brownian motion (apply per-state width/height scaling)
        const x1 = centerX + (posA[0] + this.brownianOffsets.x[particleA] * CFG.brownian.amplitude - modelCenterX) * scale * widthScale;
        const y1 = centerY + (posA[1] + this.brownianOffsets.y[particleA] * CFG.brownian.amplitude - modelCenterY) * scale * heightScale;
        const x2 = centerX + (posB[0] + this.brownianOffsets.x[particleB] * CFG.brownian.amplitude - modelCenterX) * scale * widthScale;
        const y2 = centerY + (posB[1] + this.brownianOffsets.y[particleB] * CFG.brownian.amplitude - modelCenterY) * scale * heightScale;
        
        // Simple thin transparent lines with distance-based alpha
        ctx.strokeStyle = colors.lineColor;
        ctx.globalAlpha = getLineAlpha(line, distance, colors.isDark);
        ctx.lineWidth = CFG.line.thickness;
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    });

    // Draw particles with continuous brownian motion
    ctx.fillStyle = colors.nodeColor;
    ctx.globalAlpha = 1.0;
    
    for (let particleIdx = 0; particleIdx < N; particleIdx++) {
      const pos = particlePositions[particleIdx];
      
      // Brownian motion is always active (apply per-state width/height scaling)
      const x = centerX + (pos[0] + this.brownianOffsets.x[particleIdx] * CFG.brownian.amplitude - modelCenterX) * scale * widthScale;
      const y = centerY + (pos[1] + this.brownianOffsets.y[particleIdx] * CFG.brownian.amplitude - modelCenterY) * scale * heightScale;
      
      ctx.beginPath();
      ctx.arc(x, y, CFG.particle.radius, 0, Math.PI * 2); 
      ctx.fill();
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// REACT COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function StreamlinedAnimationCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let destroyed = false;
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const animation = new StreamlinedAnimation();
    let rafId = 0;

    const getSizingElement = (): HTMLElement | null => {
      let el: HTMLElement | null = canvas.parentElement as HTMLElement | null;
      while (el && el.clientWidth === 0) el = el.parentElement as HTMLElement | null;
      return el;
    };

    const resize = () => {
      const sizingEl = getSizingElement();
      const parentWidth = sizingEl?.clientWidth || 0;
      if (parentWidth === 0) return; // Don't resize if parent has no width
      
      // Canvas dimensions responsive to both width and available height
      width = parentWidth;
      
      // Calculate height based on viewport, leaving room for header, footer, and text
      const viewportHeight = window.innerHeight;
      // Reserve space for: header (~64px), footer (~64px), text (~80px), padding (~80px)
      const reservedHeight = 288;
      const maxCanvasHeight = Math.max(viewportHeight - reservedHeight, 300);
      
      // Use the smaller of: aspect-ratio-based height or max available height
      const aspectHeight = Math.round(parentWidth * CFG.viewport.aspectRatio);
      height = Math.min(aspectHeight, maxCanvasHeight);
      
      // Update the unified scale whenever canvas resizes
      animation.updateUnifiedScale(width, height);
      
      setupCanvas(canvas, { width, height, dpr, padding: CFG.viewport.padding });
    };

    const animate = (time: number) => {
      if (destroyed) return;

      animation.update(time);
      animation.render(ctx, width, height);

      rafId = requestAnimationFrame(animate);
    };

    // Initialize
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    
    // Only observe parent element, not window
    const sizingEl = getSizingElement();
    let roParent: ResizeObserver | null = null;
    if (sizingEl) {
      roParent = new ResizeObserver(resize);
      roParent.observe(sizingEl);
    }
    
    rafId = requestAnimationFrame(animate);

    return () => {
      destroyed = true;
      cancelAnimationFrame(rafId);
      ro.disconnect();
      roParent?.disconnect();
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="block w-full" 
      aria-hidden="true"
    />
  );
}