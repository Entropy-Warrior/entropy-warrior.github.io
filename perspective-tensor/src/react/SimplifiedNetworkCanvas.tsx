import { useEffect, useRef } from 'react';

// Configuration - single source of truth
const CFG = {
  timing: { pauseMs: 1500, morphMs: 5000 }, // Slower animation
  graph: { hubs: 7, hubRadius: 0.18, hubCenterK: 3 },
  nn: { layerParts: [2, 3, 4, 5, 3, 2, 1], minDeg: 2, maxDeg: 6, layerSpread: 3.5, layerJitter: 0.15 },
  tensor: { grid: 9, spacing: 0.25, rotationX: -0.35, rotationY: 0.5, scale: 1.0 }, // Smaller spacing to fit in render area
  line: { brightnessMin: 0.25, brightnessMax: 1.0 },
  seeds: { base: 1337, graph: 9001, nn: 4242 },
};

const N = CFG.tensor.grid ** 3; // 729 dots

// Data types
enum State { Tensor, Graph, NN }

type Vec3 = [number, number, number];
type Edge = [number, number];

interface Layout {
  positions: Vec3[];
  edges: Edge[];
  lineBrightness: number[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

interface Machine {
  state: State;
  next: State;
  t: number;
  phase: 'pause' | 'morph';
  elapsed: number;
  startTime: number;
}

// Seeded random number generator
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % (2 ** 32);
    return this.seed / (2 ** 32);
  }

  nextInRange(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

// Utility functions
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function distance3D(a: Vec3, b: Vec3): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function nextState(s: State): State {
  return s === State.Tensor ? State.Graph
       : s === State.Graph  ? State.NN
       : State.Tensor;
}

// Normalize a layout to be centered at the origin and return its 2D bounds
function centerPositionsAndGetBounds(positions: Vec3[], shiftLeft: number = 0): { centered: Vec3[]; bounds: { minX: number; maxX: number; minY: number; maxY: number } } {
  let sumX = 0, sumY = 0;
  for (let i = 0; i < positions.length; i++) {
    sumX += positions[i][0];
    sumY += positions[i][1];
  }
  const cx = sumX / Math.max(1, positions.length) - shiftLeft; // Shift center left
  const cy = sumY / Math.max(1, positions.length);

  const centered: Vec3[] = new Array(positions.length);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < positions.length; i++) {
    const x = positions[i][0] - cx;
    const y = positions[i][1] - cy;
    const z = positions[i][2];
    centered[i] = [x, y, z];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return { centered, bounds: { minX, maxX, minY, maxY } };
}

// Layout generators
function generateTensorLayout(): Layout {
  const positions: Vec3[] = [];
  const edges: Edge[] = [];
  const grid = CFG.tensor.grid;
  const spacing = CFG.tensor.spacing;
  const center = (grid - 1) * spacing / 2;
  const rotX = CFG.tensor.rotationX;
  const rotY = CFG.tensor.rotationY;
  const scale = CFG.tensor.scale;

  // Pre-calculate rotation matrices
  const sinX = Math.sin(rotX);
  const cosX = Math.cos(rotX);
  const sinY = Math.sin(rotY);
  const cosY = Math.cos(rotY);

  // Generate 9x9x9 grid positions with rotation and scaling
  for (let z = 0; z < grid; z++) {
    for (let y = 0; y < grid; y++) {
      for (let x = 0; x < grid; x++) {
        // Original position
        let px = (x * spacing - center) * scale;
        let py = (y * spacing - center) * scale;
        let pz = (z * spacing - center) * scale;

        // Apply Y rotation first
        const x1 = px * cosY + pz * sinY;
        const z1 = -px * sinY + pz * cosY;
        
        // Then X rotation
        const y2 = py * cosX - z1 * sinX;
        const z2 = py * sinX + z1 * cosX;

        positions.push([x1, y2, z2]);
      }
    }
  }

  // Generate grid edges (connect each dot to +x, +y, +z neighbors)
  for (let z = 0; z < grid; z++) {
    for (let y = 0; y < grid; y++) {
      for (let x = 0; x < grid; x++) {
        const idx = z * grid * grid + y * grid + x;
        
        // Connect to +x neighbor
        if (x < grid - 1) {
          const neighborIdx = z * grid * grid + y * grid + (x + 1);
          edges.push([idx, neighborIdx]);
        }
        
        // Connect to +y neighbor
        if (y < grid - 1) {
          const neighborIdx = z * grid * grid + (y + 1) * grid + x;
          edges.push([idx, neighborIdx]);
        }
        
        // Connect to +z neighbor
        if (z < grid - 1) {
          const neighborIdx = (z + 1) * grid * grid + y * grid + x;
          edges.push([idx, neighborIdx]);
        }
      }
    }
  }

  // Center positions and get bounds
  const { centered, bounds } = centerPositionsAndGetBounds(positions);

  // Calculate line brightness based on position (center elements more transparent)
  const lineBrightness = edges.map(([a, b]) => {
    const posA = centered[a];
    const posB = centered[b];
    
    // Check if either endpoint is near center (within 0.3 units of origin)
    const distFromCenterA = Math.sqrt(posA[0] * posA[0] + posA[1] * posA[1] + posA[2] * posA[2]);
    const distFromCenterB = Math.sqrt(posB[0] * posB[0] + posB[1] * posB[1] + posB[2] * posB[2]);
    const isNearCenter = distFromCenterA < 0.3 || distFromCenterB < 0.3;
    
    return isNearCenter ? 0.4 : 1.0; // Center elements more transparent
  });

  return { positions: centered, edges, lineBrightness, bounds };
}

function generateGraphLayout(): Layout {
  const rng = new SeededRandom(Math.floor(Math.random() * 1000000));
  const positions: Vec3[] = new Array(N);
  const edges: Edge[] = [];
  
  const hubs = CFG.graph.hubs;
  const hubRadius = CFG.graph.hubRadius;
  const hubCenterK = CFG.graph.hubCenterK;
  
  // Choose random hub indices
  const hubIndices = rng.shuffle(Array.from({ length: N }, (_, i) => i)).slice(0, hubs);
  
  // Position hub centers randomly in 3D space, accounting for cluster radius
  const maxPos = 1.4 - hubRadius; // Leave room for cluster radius
  const hubPositions: Vec3[] = [];
  for (let i = 0; i < hubs; i++) {
    hubPositions.push([
      rng.nextInRange(-maxPos, maxPos),
      rng.nextInRange(-maxPos, maxPos),
      rng.nextInRange(-maxPos, maxPos)
    ]);
    positions[hubIndices[i]] = hubPositions[i];
  }
  
  // Assign remaining dots to hubs and position them
  const remainingDots = Array.from({ length: N }, (_, i) => i).filter(i => !hubIndices.includes(i));
  const dotsPerHub = Math.floor(remainingDots.length / hubs);
  
  for (let h = 0; h < hubs; h++) {
    const startIdx = h * dotsPerHub;
    const endIdx = h === hubs - 1 ? remainingDots.length : (h + 1) * dotsPerHub;
    
    for (let i = startIdx; i < endIdx; i++) {
      const dotIdx = remainingDots[i];
      const hubCenter = hubPositions[h];
      
      // Random position within hub radius
      const theta = rng.next() * 2 * Math.PI;
      const phi = rng.next() * Math.PI;
      const r = rng.next() * hubRadius;
      
      positions[dotIdx] = [
        hubCenter[0] + r * Math.sin(phi) * Math.cos(theta),
        hubCenter[1] + r * Math.sin(phi) * Math.sin(theta),
        hubCenter[2] + r * Math.cos(phi)
      ];
      
      // Connect dot to its hub center
      edges.push([dotIdx, hubIndices[h]]);
    }
  }
  
  // Connect hub centers to each other (k nearest neighbors)
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
  
  // Center positions and get bounds
  const { centered, bounds } = centerPositionsAndGetBounds(positions as Vec3[]);

  // Calculate line brightness
  const lineBrightness = edges.map(([a, b]) => {
    const length = distance3D(centered[a], centered[b]);
    const maxLength = hubRadius * 2 + 2; // Approximate max possible length
    const normalizedLength = Math.min(length / maxLength, 1);
    return CFG.line.brightnessMin + normalizedLength * (CFG.line.brightnessMax - CFG.line.brightnessMin);
  });
  
  return { positions: centered, edges, lineBrightness, bounds };
}

function generateNNLayout(): Layout {
  const rng = new SeededRandom(CFG.seeds.nn);
  const positions: Vec3[] = new Array(N);
  const edges: Edge[] = [];
  
  const layerParts = CFG.nn.layerParts;
  const totalParts = layerParts.reduce((a, b) => a + b, 0);
  const layerCounts = layerParts.map(parts => Math.round(N * parts / totalParts));
  
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
    
    const middleLayer = (layerCounts.length - 1) / 2; // Center layer (2 for 5 layers)
    const x = (layer - middleLayer) * (CFG.nn.layerSpread / (layerCounts.length - 1))-1;
    
    // Calculate layer height based on relative layer size (layerParts)
    const maxLayerParts = Math.max(...layerParts);
    const layerHeightFactor = layerParts[layer] / maxLayerParts;
    const layerHeight = layerHeightFactor * 2; // Scale height based on layer size
    
    for (let i = 0; i < count; i++) {
      // Center nodes vertically within the layer's allocated height
      const y = (count > 1 ? -layerHeight/2 + (i / (count - 1)) * layerHeight : 0) + rng.nextInRange(-CFG.nn.layerJitter, CFG.nn.layerJitter);
      const z = rng.nextInRange(-CFG.nn.layerJitter, CFG.nn.layerJitter);
      
      positions[nodeIdx] = [x - 0.7, y, z]; // Shift all NN nodes left
      layerNodeIndices.push(nodeIdx);
      nodeIdx++;
    }
    
    layerNodes.push(layerNodeIndices);
  }
  
  // Connect between adjacent layers with random connections
  for (let layer = 0; layer < layerNodes.length - 1; layer++) {
    const currentLayer = layerNodes[layer];
    const nextLayer = layerNodes[layer + 1];
    
    for (const fromNode of currentLayer) {
      const targetCount = Math.min(
        CFG.nn.maxDeg,
        Math.max(CFG.nn.minDeg, Math.floor(nextLayer.length / currentLayer.length) + 1)
      );
      
      // Connect to random nodes in next layer
      const shuffledTargets = rng.shuffle([...nextLayer]);
      const selectedTargets = shuffledTargets.slice(0, targetCount);
      
      for (const toNode of selectedTargets) {
        edges.push([fromNode, toNode]);
      }
    }
  }
  
  // Center positions and get bounds, shifted left for NN
  const { centered, bounds } = centerPositionsAndGetBounds(positions as Vec3[], -0.2);

  // Calculate line brightness
  const lineBrightness = edges.map(([a, b]) => {
    const length = distance3D(centered[a], centered[b]);
    const maxLength = CFG.nn.layerSpread / (layerCounts.length - 1) + 2; // Approximate max
    const normalizedLength = Math.min(length / maxLength, 1);
    return CFG.line.brightnessMin + normalizedLength * (CFG.line.brightnessMax - CFG.line.brightnessMin);
  });
  
  return { positions: centered, edges, lineBrightness, bounds };
}

function isDark(): boolean {
  return document.documentElement.classList.contains('dark');
}

export default function SimplifiedNetworkCanvas({ nodeCount = N }: { nodeCount?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let destroyed = false;
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Generate layouts once
    const layouts = {
      [State.Tensor]: generateTensorLayout(),
      [State.Graph]: generateGraphLayout(),
      [State.NN]: generateNNLayout(),
    };

    // Compute global model extents across all states so scale stays constant
    const allBounds = [
      layouts[State.Tensor].bounds,
      layouts[State.Graph].bounds,
      layouts[State.NN].bounds,
    ];
    const globalModelWidth = Math.max(...allBounds.map(b => b.maxX - b.minX));
    const globalModelHeight = Math.max(...allBounds.map(b => b.maxY - b.minY));

    // State machine
    const machine: Machine = {
      state: State.Tensor,
      next: State.Graph,
      t: 0,
      phase: 'pause',
      elapsed: 0,
      startTime: 0,
    };

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
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

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

    const draw = (now: number) => {
      if (destroyed) return;

      if (machine.startTime === 0) {
        machine.startTime = now;
      }

      machine.elapsed = now - machine.startTime;

      // Update state machine
      if (machine.phase === 'pause') {
        if (machine.elapsed >= CFG.timing.pauseMs) {
          machine.phase = 'morph';
          machine.t = 0;
          machine.startTime = now;
          machine.elapsed = 0;
        }
      } else { // morph
        machine.t = Math.min(machine.elapsed / CFG.timing.morphMs, 1);
        if (machine.t === 1) {
          machine.state = machine.next;
          machine.next = nextState(machine.state);
          machine.phase = 'pause';
          machine.startTime = now;
          machine.elapsed = 0;
        }
      }

      ctx.clearRect(0, 0, width, height);

      const dark = isDark();
      const nodeColor = dark ? 'rgba(226, 232, 240, 0.8)' : 'rgba(30, 41, 59, 0.7)';
      const lineColor = dark ? 'rgb(203, 213, 225)' : 'rgb(30, 41, 59)';

      // Get current and target layouts
      const currentLayout = layouts[machine.state];
      const targetLayout = layouts[machine.next];

      // Calculate current positions (morph or static)
      const positions: Vec3[] = new Array(N);
      if (machine.phase === 'pause') {
        positions.splice(0, N, ...currentLayout.positions);
      } else {
        const easedT = easeInOutCubic(machine.t);
        for (let i = 0; i < N; i++) {
          positions[i] = lerpVec3(currentLayout.positions[i], targetLayout.positions[i], easedT);
        }
      }

      // Project 3D to 2D with automatic centering and scaling
      const centerX = width / 2;
      const centerY = height / 2;

      // Use constant scale based on the largest extents across all states
      const modelCenterX = 0;
      const modelCenterY = 0;
      const modelWidth = Math.max(globalModelWidth, 1e-6);
      const modelHeight = Math.max(globalModelHeight, 1e-6);

      const padding = 60; // pixels of padding from edge
      const availableW = Math.max(width - 2 * padding, 1);
      const availableH = Math.max(height - 2 * padding, 1);
      const scale = Math.min(availableW / modelWidth, availableH / modelHeight);

      const points2D = positions.map(([x, y]) => ({
        x: centerX + (x - modelCenterX) * scale,
        y: centerY + (y - modelCenterY) * scale,
      }));

      // Draw edges with crossfade
      ctx.lineWidth = 1;
      ctx.strokeStyle = lineColor;

      if (machine.phase === 'pause') {
        // Draw current state edges
        for (let i = 0; i < currentLayout.edges.length; i++) {
          const [a, b] = currentLayout.edges[i];
          const brightness = currentLayout.lineBrightness[i];
          ctx.globalAlpha = brightness * (dark ? 0.3 : 0.2);
          
          ctx.beginPath();
          ctx.moveTo(points2D[a].x, points2D[a].y);
          ctx.lineTo(points2D[b].x, points2D[b].y);
          ctx.stroke();
        }
      } else {
        // Crossfade between current and target edges with eased timing
        const easedT = easeInOutCubic(machine.t);
        
        // Slower edge transitions for dramatic changes (graph <-> NN)
        const isGraphToNN = (machine.state === State.Graph && machine.next === State.NN) ||
                           (machine.state === State.NN && machine.next === State.Graph);
        
        let edgeFadeOut, edgeFadeIn;
        if (isGraphToNN) {
          // Delayed fade-in for incoming edges to reduce visual noise
          edgeFadeOut = Math.max(0, 1 - easedT * 1.5); // Fade out faster
          edgeFadeIn = Math.max(0, (easedT - 0.3) / 0.7); // Fade in later
        } else {
          edgeFadeOut = 1 - easedT;
          edgeFadeIn = easedT;
        }

        // Draw outgoing edges (fading out)
        for (let i = 0; i < currentLayout.edges.length; i++) {
          const [a, b] = currentLayout.edges[i];
          const brightness = currentLayout.lineBrightness[i];
          ctx.globalAlpha = brightness * edgeFadeOut * (dark ? 0.3 : 0.2);
          
          ctx.beginPath();
          ctx.moveTo(points2D[a].x, points2D[a].y);
          ctx.lineTo(points2D[b].x, points2D[b].y);
          ctx.stroke();
        }

        // Draw incoming edges (fading in)
        for (let i = 0; i < targetLayout.edges.length; i++) {
          const [a, b] = targetLayout.edges[i];
          const brightness = targetLayout.lineBrightness[i];
          ctx.globalAlpha = brightness * edgeFadeIn * (dark ? 0.3 : 0.2);
          
          ctx.beginPath();
          ctx.moveTo(points2D[a].x, points2D[a].y);
          ctx.lineTo(points2D[b].x, points2D[b].y);
          ctx.stroke();
        }
      }

      // Draw nodes
      ctx.fillStyle = nodeColor;
      
      for (let i = 0; i < points2D.length; i++) {
        const point = points2D[i];
        
        // Apply transparency for center nodes in tensor state
        if (machine.state === State.Tensor || 
           (machine.phase === 'morph' && machine.state === State.NN && machine.next === State.Tensor) ||
           (machine.phase === 'morph' && machine.state === State.Graph && machine.next === State.Tensor)) {
          const pos = positions[i];
          const distFromCenter = Math.sqrt(pos[0] * pos[0] + pos[1] * pos[1] + pos[2] * pos[2]);
          const transparencyFactor = distFromCenter < 0.3 ? 0.9 : 1.0;
          
          // During morph, blend the transparency
          if (machine.phase === 'morph') {
            const easedT = easeInOutCubic(machine.t);
            const morphFactor = machine.next === State.Tensor ? easedT : (1 - easedT);
            ctx.globalAlpha = 1.0 - morphFactor * (1.0 - transparencyFactor);
          } else {
            ctx.globalAlpha = transparencyFactor;
          }
        } else {
          ctx.globalAlpha = 1.0;
        }
        
        ctx.beginPath();
        ctx.arc(point.x, point.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      requestAnimationFrame(draw);
    };

    requestAnimationFrame(draw);

    return () => {
      destroyed = true;
      ro.disconnect();
      roParent?.disconnect();
      window.removeEventListener('resize', onWinResize);
    };
  }, [nodeCount]);

  return (
    <canvas ref={canvasRef} className="block w-full" aria-hidden="true" />
  );
}
