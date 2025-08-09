// ═══════════════════════════════════════════════════════════════
// ANIMATION CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export const ANIMATION_CONFIG = {
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
    thickness: 0.5,             // Line thickness
    distanceThreshold: 3.0,     // Distance factor threshold for alpha calculation
    visibilityThreshold: 0.01,  // Minimum alpha for line to be visible
    fadeTransitionPoint: 0.5    // Point during morph where lines switch mappings
  },
  
  // Brownian motion
  brownian: { 
    amplitude: 1.5,           // Motion amplitude
    speed: 0.008,               // Motion speed (reduced by 50%)
    damping: 0.997             // Motion damping (increased for smoother motion)
  },
  
  // Particles
  particles: {
    count: 729,         // 9^3 particles
    size: {
      min: 0.5,         // Minimum particle size
      max: 3.0,         // Maximum particle size
      mean: 1.5,        // Mean particle size
      stddev: 0.5       // Standard deviation for size distribution
    }
  },

  // Rotation
  rotation: {
    baseSpeed: Math.PI / 20000,  // Base rotation speed
    deltaTime: 16.67,            // Delta time for rotation calculation (60fps)
    transitionCycles: 3,         // Number of cycles for rotation transition
    speedMin: 0.9,               // Minimum speed multiplier
    speedVariation: 0.2          // Speed variation range
  },

  // Viewport
  viewport: {
    padding: 5,                 // Minimal canvas padding
    aspectRatio: 0.9,           // Further increased aspect ratio for maximum height
    scaleMultiplier: 1.02,       // Global scale adjustment factor - increased to take advantage of edge fading
    boundsMargin: 1.05,         // Safety margin for bounds calculation (5%)
    minScale: 0.1,              // Minimum scale factor (10%)
    maxDevicePixelRatio: 2,     // Maximum device pixel ratio
    reservedHeight: 200,        // Reserved height for UI elements
    minHeight: 400              // Minimum canvas height
  }
} as const;