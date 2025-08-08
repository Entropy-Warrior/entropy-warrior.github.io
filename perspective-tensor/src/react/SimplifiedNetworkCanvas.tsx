import { useEffect, useRef } from 'react';

// Configuration - single source of truth
const CFG = {
  timing: { pauseMs: 1500, morphMs: 5000 }, // Slower animation
  graph: { hubs: 7, hubRadius: 0.18, hubCenterK: 3, minHubDistance: 0.45, heightScale: 1.4 },
  nn: { layerParts: [2, 3, 4, 5, 3, 2, 1], minDeg: 2, maxDeg: 6, layerSpread: 3.5, layerJitter: 0.15, heightScale: 1.5 },
  tensor: { grid: 9, spacing: 0.35, rotationX: -0.35, rotationY: 0.5, scale: 1.3 }, // Increased spacing and scale for larger cube
  line: { brightnessMin: 0.25, brightnessMax: 1.0 },
  brownian: { amplitude: 1.118, speed: 0.004 }, // More pronounced jiggle amplitude and speed

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

function distanceSquared3D(a: Vec3, b: Vec3): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return dx * dx + dy * dy + dz * dz;
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
function generateTensorLayout(rotOverride?: { x: number; y: number }): Layout {
  const positions: Vec3[] = [];
  const edges: Edge[] = [];
  const grid = CFG.tensor.grid;
  const spacing = CFG.tensor.spacing;
  const center = (grid - 1) * spacing * 0.5; // Optimized division
  const rotX = rotOverride?.x ?? CFG.tensor.rotationX;
  const rotY = rotOverride?.y ?? CFG.tensor.rotationY;
  const scale = CFG.tensor.scale;

  // Pre-calculate rotation matrices and combined scaling
  const sinX = Math.sin(rotX);
  const cosX = Math.cos(rotX);
  const sinY = Math.sin(rotY);
  const cosY = Math.cos(rotY);
  const scaledSpacing = spacing * scale;

  // Generate 9x9x9 grid positions with optimized rotation and scaling
  for (let z = 0; z < grid; z++) {
    const pzBase = (z * scaledSpacing - center * scale);
    for (let y = 0; y < grid; y++) {
      const pyBase = (y * scaledSpacing - center * scale);
      for (let x = 0; x < grid; x++) {
        const pxBase = (x * scaledSpacing - center * scale);

        // Apply Y rotation first - optimized
        const x1 = pxBase * cosY + pzBase * sinY;
        const z1 = pzBase * cosY - pxBase * sinY;
        
        // Then X rotation - optimized
        const y2 = pyBase * cosX - z1 * sinX;
        const z2 = pyBase * sinX + z1 * cosX;

        positions.push([x1, y2, z2]);
      }
    }
  }

  // Generate grid edges (connect each dot to +x, +y, +z neighbors) - optimized
  const gridSq = grid * grid;
  for (let z = 0; z < grid; z++) {
    const zOffset = z * gridSq;
    for (let y = 0; y < grid; y++) {
      const yOffset = y * grid;
      const baseIdx = zOffset + yOffset;
      for (let x = 0; x < grid; x++) {
        const idx = baseIdx + x;
        
        // Connect to +x neighbor
        if (x < grid - 1) {
          edges.push([idx, idx + 1]);
        }
        
        // Connect to +y neighbor
        if (y < grid - 1) {
          edges.push([idx, idx + grid]);
        }
        
        // Connect to +z neighbor
        if (z < grid - 1) {
          edges.push([idx, idx + gridSq]);
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
  const positions: Vec3[] = new Array(N);
  const edges: Edge[] = [];
  
  const hubs = CFG.graph.hubs;
  const hubRadius = CFG.graph.hubRadius;
  const hubCenterK = CFG.graph.hubCenterK;
  const minHubDistance = CFG.graph.minHubDistance ?? hubRadius * 2.2;
  const heightScale = CFG.graph.heightScale;
  
  // Choose random hub indices  
  const allIndices = Array.from({ length: N }, (_, i) => i);
  // Fisher-Yates shuffle using Math.random()
  for (let i = allIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allIndices[i], allIndices[j]] = [allIndices[j], allIndices[i]];
  }
  const hubIndices = allIndices.slice(0, hubs);
  
  // Position hub centers randomly in 3D space ensuring minimum inter-hub distance
  const maxPosX = 1.4 - hubRadius; // Leave room for cluster radius in X
  const maxPosY = 1.4 - hubRadius; // Leave room for cluster radius in Y  
  const maxPosZ = 1.4 - hubRadius; // Leave room for cluster radius in Z
  const hubPositions: Vec3[] = [];
  for (let i = 0; i < hubs; i++) {
    let chosen: Vec3 | null = null;
    let bestCandidate: Vec3 = [0, 0, 0];
    let bestMinDist = -Infinity;
    const attempts = 600;
    for (let a = 0; a < attempts; a++) {
      const candidate: Vec3 = [
        Math.random() * (2 * maxPosX) - maxPosX,
        Math.random() * (2 * maxPosY * heightScale) - maxPosY * heightScale,
        Math.random() * (2 * maxPosZ) - maxPosZ,
      ];
      let minDistToExisting = Infinity;
      for (let j = 0; j < hubPositions.length; j++) {
        const d = distance3D(candidate, hubPositions[j]);
        if (d < minDistToExisting) minDistToExisting = d;
        // Early exit if already below best or threshold
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
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.random() * Math.PI;
      const r = Math.random() * hubRadius;
      
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
  const positions: Vec3[] = new Array(N);
  const edges: Edge[] = [];
  
  // Randomize layer distribution while maintaining relative proportions
  const layerParts = CFG.nn.layerParts;
  const totalParts = layerParts.reduce((a, b) => a + b, 0);
  const heightScale = CFG.nn.heightScale;
  
  // Add some randomness to layer sizes (±20% variation)
  const randomizedParts = layerParts.map(parts => {
    const variation = 0.2; // 20% variation
    const multiplier = 1 + (Math.random() * 2 - 1) * variation;
    return Math.max(0.1, parts * multiplier); // Ensure minimum size
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
    
    const middleLayer = (layerCounts.length - 1) / 2; // Center layer (2 for 5 layers)
    const x = (layer - middleLayer) * (CFG.nn.layerSpread / (layerCounts.length - 1))-1;
    
    // Calculate layer height based on relative layer size (layerParts)
    const maxLayerParts = Math.max(...layerParts);
    const layerHeightFactor = layerParts[layer] / maxLayerParts;
    const layerHeight = layerHeightFactor * 2 * heightScale; // Scale height based on layer size and height scale
    
    for (let i = 0; i < count; i++) {
      // Center nodes vertically within the layer's allocated height with randomization
      const baseY = count > 1 ? -layerHeight/2 + (i / (count - 1)) * layerHeight : 0;
      const y = baseY + (Math.random() * 2 - 1) * CFG.nn.layerJitter;
      const z = (Math.random() * 2 - 1) * CFG.nn.layerJitter;
      
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
      const shuffledTargets = [...nextLayer];
      // Fisher-Yates shuffle using Math.random()
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

    // Generate initial layouts - will be regenerated on state transitions for true randomness
    const angleJitter = 0.6; // radians - increased for more variation
    
    const generateRandomTensorRotation = () => {
      // Constrain angles to ensure good 3D perspective
      // X rotation: -60° to -15° (good top-down view)
      // Y rotation: 15° to 75° (good side angle)
      const minX = -Math.PI / 3;  // -60°
      const maxX = -Math.PI / 12; // -15°
      const minY = Math.PI / 12;  // 15°
      const maxY = 5 * Math.PI / 12; // 75°
      
      return {
        x: minX + Math.random() * (maxX - minX),
        y: minY + Math.random() * (maxY - minY),
      };
    };

    const layouts = {
      [State.Tensor]: generateTensorLayout(generateRandomTensorRotation()),
      [State.Graph]: generateGraphLayout(),
      [State.NN]: generateNNLayout(),
    };

    // Calculate individual scale factors for each state to maximize canvas usage
    const calculateScaleFactor = (bounds: { minX: number; maxX: number; minY: number; maxY: number }, availableW: number, availableH: number) => {
      const modelWidth = Math.max(bounds.maxX - bounds.minX, 1e-6);
      const modelHeight = Math.max(bounds.maxY - bounds.minY, 1e-6);
      return Math.min(availableW / modelWidth, availableH / modelHeight);
    };

    // Store individual bounds for each state
    const stateBounds = {
      [State.Tensor]: layouts[State.Tensor].bounds,
      [State.Graph]: layouts[State.Graph].bounds,
      [State.NN]: layouts[State.NN].bounds,
    };

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

    // Reusable projection buffers to reduce per-frame allocations
    const projectedX: number[] = new Array(N);
    const projectedY: number[] = new Array(N);

    // Brownian motion offsets for each dot (persistent across frames)
    const brownianOffsetX: number[] = new Array(N).fill(0);
    const brownianOffsetY: number[] = new Array(N).fill(0);
    const brownianOffsetZ: number[] = new Array(N).fill(0);

    let rafId = 0;

    const draw = (now: number) => {
      if (destroyed) return;

      if (machine.startTime === 0) {
        machine.startTime = now;
      }

      machine.elapsed = now - machine.startTime;

      // Update state machine
      if (machine.phase === 'pause') {
        if (machine.elapsed >= CFG.timing.pauseMs) {
          // Before starting morph, regenerate the target layout for true randomness
          // This ensures smooth transitions while maintaining randomness
          layouts[machine.next] = 
            machine.next === State.Tensor ? generateTensorLayout(generateRandomTensorRotation()) :
            machine.next === State.Graph ? generateGraphLayout() :
            generateNNLayout();
          
          // Update bounds for the regenerated layout
          stateBounds[machine.next] = layouts[machine.next].bounds;
          
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
      const isMorphing = machine.phase === 'morph';
      const easedMorphT = isMorphing ? easeInOutCubic(machine.t) : 0;
      const positions: Vec3[] = isMorphing ? new Array(N) : currentLayout.positions;
      if (isMorphing) {
        for (let i = 0; i < N; i++) {
          positions[i] = lerpVec3(currentLayout.positions[i], targetLayout.positions[i], easedMorphT);
        }
      }

      // Project 3D to 2D with dynamic scaling for maximum space usage
      const centerX = width / 2;
      const centerY = height / 2;
      const modelCenterX = 0;
      const modelCenterY = 0;

      const padding = 60; // pixels of padding from edge
      const availableW = Math.max(width - 2 * padding, 1);
      const availableH = Math.max(height - 2 * padding, 1);

      // Calculate scale factors for current and target states
      const currentScale = calculateScaleFactor(stateBounds[machine.state], availableW, availableH);
      const targetScale = calculateScaleFactor(stateBounds[machine.next], availableW, availableH);

      // Update Brownian motion for all dots - optimized calculations
      const brownianStep = CFG.brownian.speed * CFG.brownian.amplitude;
      const damping = 0.995;
      
      for (let i = 0; i < N; i++) {
        // Optimized random walk with single multiplication per axis
        brownianOffsetX[i] = brownianOffsetX[i] * damping + (Math.random() - 0.5) * brownianStep;
        brownianOffsetY[i] = brownianOffsetY[i] * damping + (Math.random() - 0.5) * brownianStep;
        brownianOffsetZ[i] = brownianOffsetZ[i] * damping + (Math.random() - 0.5) * brownianStep;
      }

      // Smoothly interpolate scale during morphing
      const scale = isMorphing ? 
        lerp(currentScale, targetScale, easedMorphT) : 
        currentScale;

      // Project 3D to 2D with Brownian motion applied - optimized single loop
      for (let i = 0; i < N; i++) {
        const p = positions[i];
        // Combined projection and jiggle calculation
        projectedX[i] = centerX + (p[0] + brownianOffsetX[i] - modelCenterX) * scale;
        projectedY[i] = centerY + (p[1] + brownianOffsetY[i] - modelCenterY) * scale;
      }

      // Draw edges with crossfade - optimized rendering
      ctx.lineWidth = 1;
      ctx.strokeStyle = lineColor;
      const baseAlpha = dark ? 0.3 : 0.2;

      if (!isMorphing) {
        // Draw current state edges - optimized with early alpha calculation
        const edges = currentLayout.edges;
        const brightness = currentLayout.lineBrightness;
        for (let i = 0; i < edges.length; i++) {
          const [a, b] = edges[i];
          const alpha = brightness[i] * baseAlpha;
          if (alpha > 0.01) { // Skip nearly transparent edges
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.moveTo(projectedX[a], projectedY[a]);
            ctx.lineTo(projectedX[b], projectedY[b]);
            ctx.stroke();
          }
        }
      } else {
        // Crossfade between current and target edges with eased timing
        const easedT = easedMorphT;
        
        // Optimized fade calculations
        const isGraphToNN = (machine.state === State.Graph && machine.next === State.NN) ||
                           (machine.state === State.NN && machine.next === State.Graph);
        
        const edgeFadeOut = isGraphToNN ? Math.max(0, 1 - easedT * 1.5) : 1 - easedT;
        const edgeFadeIn = isGraphToNN ? Math.max(0, (easedT - 0.3) / 0.7) : easedT;

        // Draw outgoing edges (fading out) - batched
        if (edgeFadeOut > 0) {
          const edges = currentLayout.edges;
          const brightness = currentLayout.lineBrightness;
          for (let i = 0; i < edges.length; i++) {
            const [a, b] = edges[i];
            const alpha = brightness[i] * edgeFadeOut * baseAlpha;
            if (alpha > 0.01) { // Skip nearly transparent edges
              ctx.globalAlpha = alpha;
              ctx.beginPath();
              ctx.moveTo(projectedX[a], projectedY[a]);
              ctx.lineTo(projectedX[b], projectedY[b]);
              ctx.stroke();
            }
          }
        }

        // Draw incoming edges (fading in) - batched
        if (edgeFadeIn > 0) {
          const edges = targetLayout.edges;
          const brightness = targetLayout.lineBrightness;
          for (let i = 0; i < edges.length; i++) {
            const [a, b] = edges[i];
            const alpha = brightness[i] * edgeFadeIn * baseAlpha;
            if (alpha > 0.01) { // Skip nearly transparent edges
              ctx.globalAlpha = alpha;
              ctx.beginPath();
              ctx.moveTo(projectedX[a], projectedY[a]);
              ctx.lineTo(projectedX[b], projectedY[b]);
              ctx.stroke();
            }
          }
        }
      }

      // Draw nodes
      ctx.fillStyle = nodeColor;
      
      for (let i = 0; i < N; i++) {
        
        // Apply transparency for center nodes in tensor state
        if (machine.state === State.Tensor || 
           (machine.phase === 'morph' && machine.state === State.NN && machine.next === State.Tensor) ||
           (machine.phase === 'morph' && machine.state === State.Graph && machine.next === State.Tensor)) {
          const pos = positions[i];
          // Use base position (without jiggle) for transparency calculation to maintain structure
          const distFromCenter = Math.sqrt(pos[0] * pos[0] + pos[1] * pos[1] + pos[2] * pos[2]);
          const transparencyFactor = distFromCenter < 0.3 ? 0.9 : 1.0;
          
          // During morph, blend the transparency
          if (isMorphing) {
            const morphFactor = machine.next === State.Tensor ? easedMorphT : (1 - easedMorphT);
            ctx.globalAlpha = 1.0 - morphFactor * (1.0 - transparencyFactor);
          } else {
            ctx.globalAlpha = transparencyFactor;
          }
        } else {
          ctx.globalAlpha = 1.0;
        }
        
        ctx.beginPath();
        ctx.arc(projectedX[i], projectedY[i], 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);

    return () => {
      destroyed = true;
      cancelAnimationFrame(rafId);
      ro.disconnect();
      roParent?.disconnect();
      window.removeEventListener('resize', onWinResize);
    };
  }, [nodeCount]);

  return (
    <canvas ref={canvasRef} className="block w-full" aria-hidden="true" />
  );
}
