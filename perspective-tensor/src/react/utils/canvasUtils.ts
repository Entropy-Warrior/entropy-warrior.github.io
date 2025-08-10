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
  config: { amplitude: number; speed: number; damping?: number },
  particleSizes?: number[]
): void {
  // Base update probability from speed config
  const baseUpdateProbability = Math.min(1, config.speed);
  
  for (let i = 0; i < offsets.x.length; i++) {
    // Size-dependent Brownian motion: smaller particles move more and update more frequently
    // Using Einstein-Smoluchowski equation: D ∝ 1/√(size)
    const particleSize = particleSizes ? particleSizes[i] : 1.5; // Default size if not provided
    const sizeFactor = 1 / Math.sqrt(Math.max(particleSize, 0.1)); // Avoid division by zero
    
    // Smaller particles update more frequently
    const updateProbability = Math.min(1, baseUpdateProbability * sizeFactor);
    
    // Only update this particle if random chance allows (size-dependent probability)
    if (Math.random() < updateProbability) {
      // Size-dependent amplitude: smaller particles move more
      const sizeAdjustedAmplitude = config.amplitude * sizeFactor * 0.5; // Scale down a bit
      
      // Pure random jitter with size-adjusted amplitude
      offsets.x[i] = (Math.random() - 0.5) * sizeAdjustedAmplitude;
      offsets.y[i] = (Math.random() - 0.5) * sizeAdjustedAmplitude;
      offsets.z[i] = (Math.random() - 0.5) * sizeAdjustedAmplitude;
    }
  }
}

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
