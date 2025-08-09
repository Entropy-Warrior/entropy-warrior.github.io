import type { Vec3 } from './mathUtils';
import type { Layout, Bounds } from './layoutUtils';

export interface CanvasRenderConfig {
  width: number;
  height: number;
  dpr: number;
  padding: number;
}

export interface RenderColors {
  nodeColor: string;
  lineColor: string;
  isDark: boolean;
}

// Canvas setup utilities
export function setupCanvas(
  canvas: HTMLCanvasElement,
  config: CanvasRenderConfig
): CanvasRenderingContext2D {
  canvas.width = Math.floor(config.width * config.dpr);
  canvas.height = Math.floor(config.height * config.dpr);
  canvas.style.width = config.width + 'px';
  canvas.style.height = config.height + 'px';
  
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(config.dpr, 0, 0, config.dpr, 0, 0);
  return ctx;
}

// Projection utilities
export function calculateScaleFactor(
  bounds: Bounds, 
  availableW: number, 
  availableH: number
): number {
  const modelWidth = Math.max(bounds.maxX - bounds.minX, 1e-6);
  const modelHeight = Math.max(bounds.maxY - bounds.minY, 1e-6);
  return Math.min(availableW / modelWidth, availableH / modelHeight);
}

export function projectPositions(
  positions: Vec3[],
  brownianOffsets: { x: number[]; y: number[]; z: number[] },
  scale: number,
  centerX: number,
  centerY: number,
  modelCenterX: number = 0,
  modelCenterY: number = 0
): { projectedX: number[]; projectedY: number[] } {
  const projectedX: number[] = new Array(positions.length);
  const projectedY: number[] = new Array(positions.length);

  for (let i = 0; i < positions.length; i++) {
    const p = positions[i];
    projectedX[i] = centerX + (p[0] + brownianOffsets.x[i] - modelCenterX) * scale;
    projectedY[i] = centerY + (p[1] + brownianOffsets.y[i] - modelCenterY) * scale;
  }

  return { projectedX, projectedY };
}

// Brownian motion utilities
export interface BrownianOffsets {
  x: number[];
  y: number[];
  z: number[];
}

export function createBrownianOffsets(nodeCount: number): BrownianOffsets {
  return {
    x: new Array(nodeCount).fill(0),
    y: new Array(nodeCount).fill(0),
    z: new Array(nodeCount).fill(0),
  };
}

export function updateBrownianMotion(
  offsets: BrownianOffsets,
  config: { amplitude: number; speed: number; damping?: number }
): void {
  const brownianStep = config.speed * config.amplitude;
  const damping = config.damping ?? 0.995;
  
  for (let i = 0; i < offsets.x.length; i++) {
    offsets.x[i] = offsets.x[i] * damping + (Math.random() - 0.5) * brownianStep;
    offsets.y[i] = offsets.y[i] * damping + (Math.random() - 0.5) * brownianStep;
    offsets.z[i] = offsets.z[i] * damping + (Math.random() - 0.5) * brownianStep;
  }
}

// Reusable transition logic for edge rendering
export function drawTransitionEdges(
  ctx: CanvasRenderingContext2D,
  currentLayout: Layout,
  targetLayout: Layout,
  morphT: number,
  projectedX: number[],
  projectedY: number[],
  baseAlpha: number
): void {
  // Rule 1: All existing connections break completely before 50% of transition
  if (morphT < 0.5) {
    const fadeOutProgress = morphT / 0.5; // 0 to 1 over first half
    const fadeOut = 1 - fadeOutProgress; // Linear fade from 1 to 0
    
    const currentEdges = currentLayout.edges;
    const currentBrightness = currentLayout.lineBrightness;
    
    for (let i = 0; i < currentEdges.length; i++) {
      const [a, b] = currentEdges[i];
      const alpha = currentBrightness[i] * fadeOut * baseAlpha;
      
      if (alpha > 0.01) {
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(projectedX[a], projectedY[a]);
        ctx.lineTo(projectedX[b], projectedY[b]);
        ctx.stroke();
      }
    }
  }
  
  // Rule 2: New connections appear only in second half (reverse of breaking logic)
  if (morphT > 0.5) {
    const fadeInProgress = (morphT - 0.5) / 0.5; // 0 to 1 over second half
    const fadeIn = fadeInProgress; // Linear fade from 0 to 1
    
    const targetEdges = targetLayout.edges;
    const targetBrightness = targetLayout.lineBrightness;
    
    for (let i = 0; i < targetEdges.length; i++) {
      const [a, b] = targetEdges[i];
      const alpha = targetBrightness[i] * fadeIn * baseAlpha;
      
      if (alpha > 0.01) {
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(projectedX[a], projectedY[a]);
        ctx.lineTo(projectedX[b], projectedY[b]);
        ctx.stroke();
      }
    }
  }
}

// Edge rendering utilities
export function drawEdges(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  projectedX: number[],
  projectedY: number[],
  baseAlpha: number
): void {
  const edges = layout.edges;
  const brightness = layout.lineBrightness;
  
  for (let i = 0; i < edges.length; i++) {
    const [a, b] = edges[i];
    const alpha = brightness[i] * baseAlpha;
    
    if (alpha > 0.01) {
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(projectedX[a], projectedY[a]);
      ctx.lineTo(projectedX[b], projectedY[b]);
      ctx.stroke();
    }
  }
}

// Node rendering utilities
export function drawNodes(
  ctx: CanvasRenderingContext2D,
  nodeCount: number,
  projectedX: number[],
  projectedY: number[],
  nodeColor: string,
  nodeRadius: number = 1.8
): void {
  ctx.fillStyle = nodeColor;
  ctx.globalAlpha = 1.0;
  
  for (let i = 0; i < nodeCount; i++) {
    ctx.beginPath();
    ctx.arc(projectedX[i], projectedY[i], nodeRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Theme utilities
export function isDark(): boolean {
  return document.documentElement.classList.contains('dark');
}

export function getRenderColors(): RenderColors {
  const dark = isDark();
  return {
    nodeColor: dark ? 'rgba(226, 232, 240, 0.6)' : 'rgba(30, 41, 59, 0.5)',
    lineColor: dark ? 'rgb(203, 213, 225)' : 'rgb(30, 41, 59)',
    isDark: dark,
  };
}
