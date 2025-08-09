import { useEffect, useRef } from 'react';
import { lerp, lerpVec3, easeInOutCubic, generateRandomRotation, type Vec3 } from './utils/mathUtils';
import { setupCanvas, getRenderColors, calculateScaleFactor, type RenderColors } from './utils/canvasUtils';
import { generateTensorLayout } from './layouts/tensorLayout';
import { generateFibonacciLayout } from './layouts/fibonacciLayout';
import { centerPositionsAndGetBounds, distance3D, createSimpleBrightness } from './utils/layoutUtils';
import type { Bounds, Layout } from './utils/layoutUtils';

// ═══════════════════════════════════════════════════════════════
// CORE TYPES & CONFIGURATION (Based on SimplifiedNetworkCanvas)
// ═══════════════════════════════════════════════════════════════

// Configuration matching SimplifiedNetworkCanvas
const CFG = {
  timing: { pauseMs: 3000, morphMs: 4000 },
  graph: { hubs: 7, hubRadius: 0.18, hubCenterK: 3, minHubDistance: 0.45, heightScale: 1.4 },
  nn: { layerParts: [2, 3, 4, 5, 3, 2, 1], minDeg: 0, maxDeg: 2, layerSpread: 3.5, layerJitter: 0.15, heightScale: 1.5 },
  tensor: { grid: 9, spacing: 0.35, rotationX: -0.35, rotationY: 0.5, scale: 1.3 },
  fibonacci: { 
    funnelHeight: 3.5, maxRadius: 3.2, minRadius: 0.25, 
    circularLines: 22, tiltAngle: Math.PI * 0.35 
  },
  line: { brightness: 0.8 },
  brownian: { amplitude: 1.118, speed: 0.004, damping: 0.995 },
};

const N = CFG.tensor.grid ** 3; // 729 dots - same as SimplifiedNetworkCanvas

// Data types
enum State { Tensor, Graph, Fibonacci, NN }

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
  birthTime: number;
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT GENERATORS (From SimplifiedNetworkCanvas)
// ═══════════════════════════════════════════════════════════════

function nextState(s: State): State {
  return s === State.Tensor ? State.Graph
       : s === State.Graph  ? State.Fibonacci
       : s === State.Fibonacci ? State.NN
       : State.Tensor;
}

// Generate graph layout with predetermined connections (from SimplifiedNetworkCanvas)
function generateGraphLayout(): Layout {
  const positions: Vec3[] = new Array(N);
  const edges: [number, number][] = [];
  
  const hubs = CFG.graph.hubs;
  const hubRadius = CFG.graph.hubRadius;
  const hubCenterK = CFG.graph.hubCenterK;
  const minHubDistance = CFG.graph.minHubDistance ?? hubRadius * 2.2;
  const heightScale = CFG.graph.heightScale;
  
  // Choose random hub indices  
  const allIndices = Array.from({ length: N }, (_, i) => i);
  for (let i = allIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allIndices[i], allIndices[j]] = [allIndices[j], allIndices[i]];
  }
  const hubIndices = allIndices.slice(0, hubs);
  
  // Position hub centers
  const maxPosXZ = 1.4 - hubRadius;
  const maxPosY = 0.8;
  const hubPositions: Vec3[] = [];
  for (let i = 0; i < hubs; i++) {
    let chosen: Vec3 | null = null;
    let bestCandidate: Vec3 = [0, 0, 0];
    let bestMinDist = -Infinity;
    const attempts = 600;
    for (let a = 0; a < attempts; a++) {
      const candidate: Vec3 = [
        Math.random() * (2 * maxPosXZ) - maxPosXZ,
        (Math.random() * 2 - 1) * maxPosY * heightScale,
        Math.random() * (2 * maxPosXZ) - maxPosXZ,
      ];
      let minDistToExisting = Infinity;
      for (let j = 0; j < hubPositions.length; j++) {
        const d = distance3D(candidate, hubPositions[j]);
        if (d < minDistToExisting) minDistToExisting = d;
        if (minDistToExisting < bestMinDist && bestMinDist >= minHubDistance) break;
      }
      if (minDistToExisting > bestMinDist) {
        bestMinDist = minDistToExisting;
        bestCandidate = candidate;
      }
      if (minDistToExisting >= minHubDistance) {
        chosen = candidate;
        break;
      }
    }
    const finalPos = chosen ?? bestCandidate;
    hubPositions.push(finalPos);
    positions[hubIndices[i]] = finalPos;
  }
  
  // Position remaining dots in clusters
  const remainingDots = Array.from({ length: N }, (_, i) => i).filter(i => !hubIndices.includes(i));
  const dotsPerHub = Math.floor(remainingDots.length / hubs);
  
  for (let h = 0; h < hubs; h++) {
    const startIdx = h * dotsPerHub;
    const endIdx = h === hubs - 1 ? remainingDots.length : (h + 1) * dotsPerHub;
    
    for (let i = startIdx; i < endIdx; i++) {
      const dotIdx = remainingDots[i];
      const hubCenter = hubPositions[h];
      
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.random() * Math.PI;
      const r = Math.random() * hubRadius;
      
      positions[dotIdx] = [
        hubCenter[0] + r * Math.sin(phi) * Math.cos(theta),
        hubCenter[1] + r * Math.sin(phi) * Math.sin(theta),
        hubCenter[2] + r * Math.cos(phi)
      ];
      
      // Connect dot to hub center
      edges.push([dotIdx, hubIndices[h]]);
    }
  }
  
  // Connect hub centers
  for (let i = 0; i < hubs; i++) {
    const hubPos = hubPositions[i];
    const distances = hubIndices
      .map((idx, j) => ({ idx, dist: j === i ? Infinity : distance3D(hubPos, hubPositions[j]) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, hubCenterK);
    
    for (const { idx } of distances) {
      edges.push([hubIndices[i], idx]);
    }
  }
  
  const { centered, bounds } = centerPositionsAndGetBounds(positions);
  const lineBrightness = createSimpleBrightness(edges.length, CFG.line.brightness);
  
  return { positions: centered, edges, lineBrightness, bounds };
}

// Generate NN layout (from SimplifiedNetworkCanvas)
function generateNNLayout(): Layout {
  const positions: Vec3[] = new Array(N);
  const edges: [number, number][] = [];
  
  const layerParts = CFG.nn.layerParts;
  const heightScale = CFG.nn.heightScale;
  
  // Randomize layer sizes slightly
  const randomizedParts = layerParts.map(parts => {
    const variation = 0.2;
    const multiplier = 1 + (Math.random() * 2 - 1) * variation;
    return Math.max(0.1, parts * multiplier);
  });
  const randomizedTotal = randomizedParts.reduce((a, b) => a + b, 0);
  const layerCounts = randomizedParts.map(parts => Math.round(N * parts / randomizedTotal));
  
  // Adjust to exact N
  let diff = layerCounts.reduce((a, b) => a + b, 0) - N;
  let idx = 0;
  while (diff !== 0) {
    if (diff > 0 && layerCounts[idx] > 1) {
      layerCounts[idx]--;
      diff--;
    } else if (diff < 0) {
      layerCounts[idx]++;
      diff++;
    }
    idx = (idx + 1) % layerCounts.length;
  }
  
  // Position nodes in layers
  let nodeIdx = 0;
  const layerNodes: number[][] = [];
  
  for (let layer = 0; layer < layerCounts.length; layer++) {
    const count = layerCounts[layer];
    const layerNodeIndices: number[] = [];
    
    const middleLayer = (layerCounts.length - 1) / 2;
    const x = (layer - middleLayer) * (CFG.nn.layerSpread / (layerCounts.length - 1)) - 1;
    
    const maxLayerParts = Math.max(...layerParts);
    const layerHeightFactor = layerParts[layer] / maxLayerParts;
    const layerHeight = layerHeightFactor * 2 * heightScale;
    
    for (let i = 0; i < count; i++) {
      const baseY = count > 1 ? -layerHeight/2 + (i / (count - 1)) * layerHeight : 0;
      const y = baseY + (Math.random() * 2 - 1) * CFG.nn.layerJitter;
      const z = (Math.random() * 2 - 1) * CFG.nn.layerJitter;
      
      positions[nodeIdx] = [x - 0.7, y, z];
      layerNodeIndices.push(nodeIdx);
      nodeIdx++;
    }
    
    layerNodes.push(layerNodeIndices);
  }
  
  // Connect between adjacent layers
  for (let layer = 0; layer < layerNodes.length - 1; layer++) {
    const currentLayer = layerNodes[layer];
    const nextLayer = layerNodes[layer + 1];
    
    for (const fromNode of currentLayer) {
      const targetCount = Math.min(
        CFG.nn.maxDeg,
        Math.max(CFG.nn.minDeg, Math.floor(nextLayer.length / currentLayer.length) + 1)
      );
      
      const shuffledTargets = [...nextLayer];
      for (let i = shuffledTargets.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledTargets[i], shuffledTargets[j]] = [shuffledTargets[j], shuffledTargets[i]];
      }
      const selectedTargets = shuffledTargets.slice(0, targetCount);
      
      for (const toNode of selectedTargets) {
        edges.push([fromNode, toNode]);
      }
    }
  }
  
  const { centered, bounds } = centerPositionsAndGetBounds(positions, -0.2);
  const lineBrightness = createSimpleBrightness(edges.length, CFG.line.brightness);
  
  return { positions: centered, edges, lineBrightness, bounds };
}

// ═══════════════════════════════════════════════════════════════
// STREAMLINED ANIMATION ENGINE
// ═══════════════════════════════════════════════════════════════

class StreamlinedAnimation {
  private layouts: { [key in State]: Layout } = {} as any;
  private stateBounds: { [key in State]: Bounds } = {} as any;
  private lines: Line[] = [];
  private machine: Machine;

  constructor() {
    // Generate all 4 states with slight viewing angle randomness
    this.generateLayouts();
    
    this.machine = {
      state: State.Tensor,
      next: State.Graph,
      t: 0,
      phase: 'pause',
      elapsed: 0,
      startTime: 0,
    };
  }

  private generateLayouts(): void {
    // Generate layouts with random viewing angles (only variance)
    this.layouts[State.Tensor] = generateTensorLayout(CFG.tensor, generateRandomRotation(), CFG.line.brightness);
    this.layouts[State.Graph] = generateGraphLayout();
    this.layouts[State.Fibonacci] = generateFibonacciLayout({ ...CFG.fibonacci, nodeCount: N }, CFG.line.brightness);
    this.layouts[State.NN] = generateNNLayout();

    // Store bounds
    Object.values(State).forEach(state => {
      if (typeof state === 'number') {
        this.stateBounds[state] = this.layouts[state].bounds;
      }
    });
  }

  update(time: number): void {
    if (this.machine.startTime === 0) {
      this.machine.startTime = time;
    }

    this.machine.elapsed = time - this.machine.startTime;

    // Update state machine
    if (this.machine.phase === 'pause') {
      if (this.machine.elapsed >= CFG.timing.pauseMs) {
        // Regenerate target layout for variation
        this.regenerateTargetLayout();
        
        this.machine.phase = 'morph';
        this.machine.t = 0;
        this.machine.startTime = time;
        this.machine.elapsed = 0;
      }
    } else { // morph
      this.machine.t = Math.min(this.machine.elapsed / CFG.timing.morphMs, 1);
      if (this.machine.t === 1) {
        this.machine.state = this.machine.next;
        this.machine.next = nextState(this.machine.state);
        this.machine.phase = 'pause';
        this.machine.startTime = time;
        this.machine.elapsed = 0;
      }
    }

    this.updateLines();
  }

  private regenerateTargetLayout(): void {
    // Add viewing angle randomness to target layout
    const target = this.machine.next;
    if (target === State.Tensor) {
      this.layouts[target] = generateTensorLayout(CFG.tensor, generateRandomRotation(), CFG.line.brightness);
    } else if (target === State.Graph) {
      this.layouts[target] = generateGraphLayout();
    } else if (target === State.Fibonacci) {
      this.layouts[target] = generateFibonacciLayout({ ...CFG.fibonacci, nodeCount: N }, CFG.line.brightness);
    } else if (target === State.NN) {
      this.layouts[target] = generateNNLayout();
    }
    this.stateBounds[target] = this.layouts[target].bounds;
  }

  private updateLines(): void {
    const isMorphing = this.machine.phase === 'morph';
    const t = this.machine.t;

    if (isMorphing) {
      // Simple fade out in first half, fade in in second half
      if (t < 0.5) {
        // First half: fade out current layout lines
        const fadeOut = 1 - (t / 0.5); // 1 to 0 over first half
        this.lines = this.lines.filter(line => {
          const currentEdges = this.layouts[this.machine.state].edges;
          const isCurrentEdge = currentEdges.some(([a, b]) => 
            (line.a === a && line.b === b) || (line.a === b && line.b === a)
          );
          
          if (isCurrentEdge) {
            line.strength = fadeOut;
            return fadeOut > 0.01;
          }
          return false; // Remove lines not in current layout
        });
      } else {
        // Second half: fade in target layout lines
        const fadeIn = (t - 0.5) / 0.5; // 0 to 1 over second half
        this.generateNewLines(fadeIn, this.layouts[this.machine.next].edges);
      }
    } else {
      // Steady state: maintain existing lines from current layout
      this.maintainSteadyLines();
    }
  }

  private generateNewLines(fadeIn: number, targetEdges: [number, number][]): void {
    // Create all target edges with current fade level
    targetEdges.forEach(([a, b]) => {
      // Check if line already exists
      const existingLine = this.lines.find(line => 
        (line.a === a && line.b === b) || (line.a === b && line.b === a)
      );
      
      if (existingLine) {
        // Update existing line strength
        existingLine.strength = fadeIn;
      } else {
        // Create new line
        this.lines.push({
          a, b,
          strength: fadeIn,
          birthTime: performance.now()
        });
      }
    });
  }

  private maintainSteadyLines(): void {
    const currentEdges = this.layouts[this.machine.state].edges;
    
    // Remove lines not in current layout
    this.lines = this.lines.filter(line => {
      return currentEdges.some(([a, b]) => 
        (line.a === a && line.b === b) || (line.a === b && line.b === a)
      );
    });

    // Add missing lines from current layout
    const attempts = Math.min(3, currentEdges.length / 30);
    for (let i = 0; i < attempts; i++) {
      const edge = currentEdges[Math.floor(Math.random() * currentEdges.length)];
      const [a, b] = edge;
      
      if (!this.lines.some(line => 
        (line.a === a && line.b === b) || (line.a === b && line.b === a)
      )) {
        this.lines.push({
          a, b,
          strength: 1.0,
          birthTime: performance.now()
        });
      }
    }
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const colors = getRenderColors();
    
    // Calculate current bounds and scaling (from SimplifiedNetworkCanvas approach)
    const currentLayout = this.layouts[this.machine.state];
    const targetLayout = this.layouts[this.machine.next];
    
    const centerX = width / 2;
    const centerY = height / 2;
    const modelCenterX = 0;
    const modelCenterY = 0;

    const padding = 60;
    const availableW = Math.max(width - 2 * padding, 1);
    const availableH = Math.max(height - 2 * padding, 1);

    const currentScale = calculateScaleFactor(this.stateBounds[this.machine.state], availableW, availableH);
    const targetScale = calculateScaleFactor(this.stateBounds[this.machine.next], availableW, availableH);

    const isMorphing = this.machine.phase === 'morph';
    const easedT = isMorphing ? easeInOutCubic(this.machine.t) : 0;
    const scale = isMorphing ? lerp(currentScale, targetScale, easedT) : currentScale;

    // Calculate current positions
    const positions: Vec3[] = isMorphing ? new Array(N) : currentLayout.positions;
    if (isMorphing) {
      for (let i = 0; i < N; i++) {
        positions[i] = lerpVec3(currentLayout.positions[i], targetLayout.positions[i], easedT);
      }
    }

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw lines
    ctx.strokeStyle = colors.lineColor;
    ctx.lineWidth = 1;
    
    this.lines.forEach(line => {
      const posA = positions[line.a];
      const posB = positions[line.b];
      
      const x1 = centerX + (posA[0] - modelCenterX) * scale;
      const y1 = centerY + (posA[1] - modelCenterY) * scale;
      const x2 = centerX + (posB[0] - modelCenterX) * scale;
      const y2 = centerY + (posB[1] - modelCenterY) * scale;
      
      const alpha = line.strength * (colors.isDark ? 0.3 : 0.2);
      ctx.globalAlpha = alpha;
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });

    // Draw particles
    ctx.fillStyle = colors.nodeColor;
    ctx.globalAlpha = 1.0;
    
    for (let i = 0; i < N; i++) {
      const pos = positions[i];
      const x = centerX + (pos[0] - modelCenterX) * scale;
      const y = centerY + (pos[1] - modelCenterY) * scale;
      
      ctx.beginPath();
      ctx.arc(x, y, 1.8, 0, Math.PI * 2);
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
      const parentWidth = sizingEl?.clientWidth || window.innerWidth || 0;
      width = parentWidth;
      height = Math.round(parentWidth * 0.75); // 4:3 aspect ratio
      setupCanvas(canvas, { width, height, dpr, padding: 60 });
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
    const sizingEl = getSizingElement();
    let roParent: ResizeObserver | null = null;
    if (sizingEl) {
      roParent = new ResizeObserver(resize);
      roParent.observe(sizingEl);
    }
    const onWinResize = () => resize();
    window.addEventListener('resize', onWinResize);
    
    rafId = requestAnimationFrame(animate);

    return () => {
      destroyed = true;
      cancelAnimationFrame(rafId);
      ro.disconnect();
      roParent?.disconnect();
      window.removeEventListener('resize', onWinResize);
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