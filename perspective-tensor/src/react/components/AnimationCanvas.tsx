import { useEffect, useRef } from 'react';
import {
  lerpVec3,
  type Vec3,
  slerpVec3,
  createRotationMatrix,
  multiplyMatrices,
  applyMatrixToVector,
  getPerpendicularAxis,
  easeInOutQuart,
  randomNormal,
  type Matrix3x3,
  createBrownianOffsets,
  updateBrownianMotion,
  setupCanvas,
  getRenderColors,
  type BrownianOffsets,
  type Layout,
  type Bounds
} from '../utils';
import { LAYOUT_STATES, LAYOUT_GENERATORS, type LayoutState } from '../layouts';
import { ANIMATION_CONFIG as CFG } from '../config';

// ═══════════════════════════════════════════════════════════════
// CORE TYPES & CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const N = CFG.particles.count; // Use count from config

// Use imported types
type State = LayoutState;

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
// STREAMLINED ANIMATION ENGINE
// ═══════════════════════════════════════════════════════════════


const getLineAlpha = (line: Line, distance: number, isDark: boolean): number => {
  const base = isDark ? CFG.line.baseAlpha.dark : CFG.line.baseAlpha.light;
  const boost = isDark ? CFG.line.distanceBoost.dark : CFG.line.distanceBoost.light;
  const max = isDark ? CFG.line.maxAlpha.dark : CFG.line.maxAlpha.light;
  
  const distFactor = Math.min(distance / CFG.line.distanceThreshold, 1.0);
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
  private particleMapping: number[] = []; // Maps particle index to position index in current state
  private targetMapping: number[] = []; // Maps particle index to position index in target state
  private particleSizes: number[] = []; // Random sizes for each particle
  // Rotation state - simplified with a single rotation config object
  private rotation = {
    matrix: [[1,0,0],[0,1,0],[0,0,1]] as Matrix3x3,
    current: { axis: [0, 1, 0] as Vec3, speed: 1 },
    target: { axis: [0, 1, 0] as Vec3, speed: 1 },
    future: { axis: [0, 1, 0] as Vec3, speed: 1 },
    transitionProgress: 1,
    cycleCount: 0
  };
  private previousState: State | null = null; // Track previous state to avoid repetition

  constructor() {
    // Generate all 4 states with slight viewing angle randomness
    this.generateLayouts();
    
    // Initialize brownian motion offsets - always active
    this.brownianOffsets = createBrownianOffsets(N);
    
    // Initialize particle mapping - initially particles are at their index positions
    this.particleMapping = Array.from({ length: N }, (_, i) => i);
    this.targetMapping = Array.from({ length: N }, (_, i) => i);
    
    // Initialize particle sizes with normal distribution around 1.5
    this.particleSizes = this.generateParticleSizes();
    
    // Initialize with random states
    const firstState = this.getNextRandomState();
    this.previousState = firstState;
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

  // Use imported layout generators
  private readonly layoutGenerators = LAYOUT_GENERATORS;

  private generateLayouts(): void {
    // Generate all layouts using the mapping
    for (const state of LAYOUT_STATES) {
      this.layouts[state] = this.layoutGenerators[state]();
      this.stateBounds[state] = this.layouts[state].bounds;
    }
  }
  
  private generateParticleSizes(): number[] {
    // Generate normally distributed particle sizes
    const sizes: number[] = [];
    for (let i = 0; i < N; i++) {
      const size = Math.max(
        CFG.particles.size.min, 
        Math.min(
          CFG.particles.size.max, 
          randomNormal(CFG.particles.size.mean, CFG.particles.size.stddev)
        )
      );
      sizes.push(size);
    }
    return sizes;
  }
  
  private getNextRandomState(): State {
    // Filter out the previous state to avoid immediate repetition
    const availableStates = this.previousState !== null 
      ? LAYOUT_STATES.filter(s => s !== this.previousState)
      : [...LAYOUT_STATES];
    
    // Pick a random state from available ones
    return availableStates[Math.floor(Math.random() * availableStates.length)];
  }
  
  updateUnifiedScale(width: number, height: number): void {
    // Calculate a single scale that works for all states (use the most conservative)
    const scales = LAYOUT_STATES
      .map(s => calculateOptimalScale(this.stateBounds[s], width, height, CFG.viewport.padding));
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
      this.rotation.current.axis = slerpVec3(
        this.rotation.current.axis, 
        this.rotation.target.axis, 
        t
      );
      
      // Interpolate speed
      this.rotation.current.speed = this.rotation.current.speed * (1 - t) + 
                                   this.rotation.target.speed * t;
    }

    // Apply incremental rotation
    const baseRotationSpeed = CFG.rotation.baseSpeed;
    const deltaAngle = this.rotation.current.speed * baseRotationSpeed * CFG.rotation.deltaTime;
    
    if (Math.abs(deltaAngle) > 0.0001) {
      this.rotation.matrix = multiplyMatrices(
        this.rotation.matrix,
        createRotationMatrix(this.rotation.current.axis, deltaAngle)
      );
    }
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
        // State transition complete
        // Update previous state
        this.previousState = this.machine.state;
        this.machine.next = this.getNextRandomState();
        
        // Update rotation cycles
        this.updateRotationCycle();
        
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
    const perpAxis = getPerpendicularAxis(currentAxis);
    
    // Random perturbation angle (45-135 degrees)
    const perturbAngle = Math.PI / 4 + Math.random() * Math.PI / 2;
    
    // Rotate current axis around perpendicular by perturbAngle
    const rotMatrix = createRotationMatrix(perpAxis, perturbAngle);
    const newAxis = applyMatrixToVector(currentAxis, rotMatrix, true); // Normalize for axis
    
    // Small speed variation (0.9x to 1.1x)
    const speed = CFG.rotation.speedMin + Math.random() * CFG.rotation.speedVariation;
    
    return { axis: newAxis, speed };
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
    
    // Use the unified scale for all states (no snapping)
    const scale = this.unifiedScale * CFG.viewport.scaleMultiplier;

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
      particlePositions[particleIdx] = applyMatrixToVector(pos, this.rotation.matrix);
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
        const mapping = this.machine.t < CFG.line.fadeTransitionPoint ? this.particleMapping : this.targetMapping;
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

    // Draw particles with continuous brownian motion and random sizes
    ctx.fillStyle = colors.nodeColor;
    ctx.globalAlpha = 1.0;
    
    for (let particleIdx = 0; particleIdx < N; particleIdx++) {
      const pos = particlePositions[particleIdx];
      
      // Brownian motion is always active (apply per-state width/height scaling)
      const x = centerX + (pos[0] + this.brownianOffsets.x[particleIdx] * CFG.brownian.amplitude - modelCenterX) * scale * widthScale;
      const y = centerY + (pos[1] + this.brownianOffsets.y[particleIdx] * CFG.brownian.amplitude - modelCenterY) * scale * heightScale;
      
      // Use the random size for this particle
      const radius = this.particleSizes[particleIdx];
      
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2); 
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
    const dpr = Math.min(window.devicePixelRatio || 1, CFG.viewport.maxDevicePixelRatio);

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
      // Reserve less space to give the plot more room at the top
      const reservedHeight = CFG.viewport.reservedHeight;
      const maxCanvasHeight = Math.max(viewportHeight - reservedHeight, CFG.viewport.minHeight);
      
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