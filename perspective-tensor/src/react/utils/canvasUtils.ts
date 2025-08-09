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

// Theme utilities
function isDark(): boolean {
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
