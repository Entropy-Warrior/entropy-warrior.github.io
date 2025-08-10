import type { Vec3 } from '../core/types';

// ═══════════════════════════════════════════════════════════════
// BROWNIAN MOTION UTILITIES
// ═══════════════════════════════════════════════════════════════

export interface BrownianConfig {
  amplitude: number;      // Motion intensity
  speed: number;         // Rate of change
  damping: number;       // Smoothing factor (0-1)
  dimensionality?: '2d' | '3d'; // Apply to 2D or 3D
}

export interface BrownianState {
  offsets: Vec3[];       // Current offset for each point
  velocities: Vec3[];    // Velocity for smooth motion
  phases: Vec3[];        // Phase for periodic variation
}

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════

export function createBrownianState(pointCount: number): BrownianState {
  const offsets: Vec3[] = [];
  const velocities: Vec3[] = [];
  const phases: Vec3[] = [];
  
  for (let i = 0; i < pointCount; i++) {
    offsets.push([0, 0, 0]);
    velocities.push([0, 0, 0]);
    phases.push([
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    ]);
  }
  
  return { offsets, velocities, phases };
}

// ═══════════════════════════════════════════════════════════════
// UPDATE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function updateBrownianMotion(
  state: BrownianState,
  config: BrownianConfig,
  deltaTime: number = 16.67 // ~60fps
): void {
  const { amplitude, speed, damping, dimensionality = '3d' } = config;
  const dt = deltaTime / 1000; // Convert to seconds
  
  for (let i = 0; i < state.offsets.length; i++) {
    // Update phases
    state.phases[i][0] += speed * dt;
    state.phases[i][1] += speed * dt * 1.1; // Slightly different frequencies
    state.phases[i][2] += speed * dt * 0.9;
    
    // Calculate target offsets using sine waves with phase
    const target: Vec3 = [
      Math.sin(state.phases[i][0]) * amplitude,
      Math.sin(state.phases[i][1]) * amplitude,
      dimensionality === '3d' ? Math.sin(state.phases[i][2]) * amplitude : 0
    ];
    
    // Update velocities with damping
    for (let j = 0; j < 3; j++) {
      const force = (target[j] - state.offsets[i][j]) * 0.1;
      state.velocities[i][j] = state.velocities[i][j] * damping + force;
      state.offsets[i][j] += state.velocities[i][j];
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// SPECIALIZED BROWNIAN VARIATIONS
// ═══════════════════════════════════════════════════════════════

// Size-dependent Brownian motion (smaller = more jitter)
export function updateSizeAdaptiveBrownian(
  state: BrownianState,
  config: BrownianConfig,
  sizes: number[],
  deltaTime: number = 16.67
): void {
  const baseConfig = { ...config };
  
  for (let i = 0; i < state.offsets.length; i++) {
    // Inverse relationship: smaller size = more motion
    const sizeFactor = 1 / Math.max(sizes[i], 0.1);
    const adaptedAmplitude = config.amplitude * sizeFactor * 0.5;
    
    // Update this particle with adapted amplitude
    updateSingleParticleBrownian(state, i, { ...baseConfig, amplitude: adaptedAmplitude }, deltaTime);
  }
}

// Update single particle
function updateSingleParticleBrownian(
  state: BrownianState,
  index: number,
  config: BrownianConfig,
  deltaTime: number
): void {
  const { amplitude, speed, damping, dimensionality = '3d' } = config;
  const dt = deltaTime / 1000;
  
  // Update phase
  state.phases[index][0] += speed * dt;
  state.phases[index][1] += speed * dt * 1.1;
  state.phases[index][2] += speed * dt * 0.9;
  
  // Calculate target
  const target: Vec3 = [
    Math.sin(state.phases[index][0]) * amplitude,
    Math.sin(state.phases[index][1]) * amplitude,
    dimensionality === '3d' ? Math.sin(state.phases[index][2]) * amplitude : 0
  ];
  
  // Update velocity and position
  for (let j = 0; j < 3; j++) {
    const force = (target[j] - state.offsets[index][j]) * 0.1;
    state.velocities[index][j] = state.velocities[index][j] * damping + force;
    state.offsets[index][j] += state.velocities[index][j];
  }
}

// ═══════════════════════════════════════════════════════════════
// APPLICATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function applyBrownianToPositions(
  positions: Vec3[],
  brownianState: BrownianState
): Vec3[] {
  return positions.map((pos, i) => {
    const offset = brownianState.offsets[i] || [0, 0, 0];
    return [
      pos[0] + offset[0],
      pos[1] + offset[1],
      pos[2] + offset[2]
    ] as Vec3;
  });
}

// Apply with scaling factor
export function applyScaledBrownian(
  positions: Vec3[],
  brownianState: BrownianState,
  scale: number = 1.0
): Vec3[] {
  return positions.map((pos, i) => {
    const offset = brownianState.offsets[i] || [0, 0, 0];
    return [
      pos[0] + offset[0] * scale,
      pos[1] + offset[1] * scale,
      pos[2] + offset[2] * scale
    ] as Vec3;
  });
}

// ═══════════════════════════════════════════════════════════════
// PRESETS
// ═══════════════════════════════════════════════════════════════

export const BROWNIAN_PRESETS: Record<string, BrownianConfig> = {
  subtle: {
    amplitude: 0.5,
    speed: 0.005,
    damping: 0.98
  },
  
  standard: {
    amplitude: 1.5,
    speed: 0.008,
    damping: 0.997
  },
  
  energetic: {
    amplitude: 3.0,
    speed: 0.015,
    damping: 0.95
  },
  
  smooth: {
    amplitude: 1.0,
    speed: 0.003,
    damping: 0.999
  },
  
  chaotic: {
    amplitude: 5.0,
    speed: 0.02,
    damping: 0.9
  }
};