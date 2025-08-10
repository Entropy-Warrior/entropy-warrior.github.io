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

// Re-export Brownian types and functions from main utils for compatibility
export type { BrownianOffsets } from '../../utils/canvasUtils';
export { createBrownianOffsets, updateBrownianMotion } from '../../utils/canvasUtils';

// Theme utilities
function isDark(): boolean {
  return document.documentElement.classList.contains('dark');
}

export function getRenderColors(): RenderColors {
  const dark = isDark();
  
  // Just use the hardcoded colors that we know work
  // These correspond to Tailwind's gray colors
  return {
    nodeColor: dark ? 'rgba(226, 232, 240, 0.6)' : 'rgba(30, 41, 59, 0.5)',
    lineColor: dark ? 'rgb(203, 213, 225)' : 'rgb(30, 41, 59)',
    isDark: dark,
  };
}