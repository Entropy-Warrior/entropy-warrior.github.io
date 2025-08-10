import type { DynamicPointConfig, DeviceCapability } from './types';

// ═══════════════════════════════════════════════════════════════
// DYNAMIC POINT COUNT OPTIMIZATION
// ═══════════════════════════════════════════════════════════════

export class PointCountOptimizer {
  private static instance: PointCountOptimizer;
  private deviceCapability: DeviceCapability | null = null;
  private performanceHistory: number[] = [];
  
  // Singleton pattern for global optimizer
  static getInstance(): PointCountOptimizer {
    if (!PointCountOptimizer.instance) {
      PointCountOptimizer.instance = new PointCountOptimizer();
    }
    return PointCountOptimizer.instance;
  }
  
  constructor() {
    this.detectDeviceCapability();
  }
  
  // ═══════════════════════════════════════════════════════════════
  // DEVICE CAPABILITY DETECTION
  // ═══════════════════════════════════════════════════════════════
  
  private detectDeviceCapability(): void {
    // Check WebGL capabilities
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    if (!gl) {
      this.deviceCapability = 'low';
      return;
    }
    
    // Check various performance indicators
    const indicators = {
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxVertexUniformVectors: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
      cores: navigator.hardwareConcurrency || 2,
      memory: (navigator as any).deviceMemory || 4, // Device memory in GB
      gpu: this.detectGPUTier(gl)
    };
    
    // Score based on capabilities
    let score = 0;
    
    // Texture size scoring
    if (indicators.maxTextureSize >= 16384) score += 3;
    else if (indicators.maxTextureSize >= 8192) score += 2;
    else if (indicators.maxTextureSize >= 4096) score += 1;
    
    // CPU cores scoring  
    if (indicators.cores >= 8) score += 3;
    else if (indicators.cores >= 4) score += 2;
    else if (indicators.cores >= 2) score += 1;
    
    // Memory scoring
    if (indicators.memory >= 8) score += 3;
    else if (indicators.memory >= 4) score += 2;
    else if (indicators.memory >= 2) score += 1;
    
    // GPU tier scoring
    score += indicators.gpu;
    
    // Determine capability based on total score
    if (score >= 10) this.deviceCapability = 'high';
    else if (score >= 5) this.deviceCapability = 'medium';
    else this.deviceCapability = 'low';
  }
  
  private detectGPUTier(gl: WebGLRenderingContext): number {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return 1; // Conservative estimate
    
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
    
    // High-end GPUs
    if (renderer.includes('rtx') || renderer.includes('radeon rx 6') || 
        renderer.includes('m1') || renderer.includes('m2') || renderer.includes('m3')) {
      return 3;
    }
    // Mid-range GPUs
    else if (renderer.includes('gtx') || renderer.includes('radeon rx 5') || 
             renderer.includes('intel iris')) {
      return 2;
    }
    // Low-end or integrated
    return 1;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // POINT COUNT CALCULATION
  // ═══════════════════════════════════════════════════════════════
  
  calculate(config: DynamicPointConfig): number {
    // User override takes precedence
    if (config.user.preferredCount) {
      return this.clampPointCount(config.user.preferredCount);
    }
    
    // Base count calculation
    const baseCount = this.calculateBaseCount(config);
    
    // Apply modifiers
    const viewportModifier = this.getViewportModifier(config.viewport);
    const deviceModifier = this.getDeviceModifier(config.device.capability);
    const complexityModifier = this.getComplexityModifier(config.shape.complexity);
    const qualityModifier = this.getQualityModifier(config.user.qualityPreference);
    
    // Calculate final count
    const finalCount = Math.round(
      baseCount * viewportModifier * deviceModifier * complexityModifier * qualityModifier
    );
    
    // Apply adaptive adjustment based on performance history
    const adaptedCount = this.applyAdaptiveAdjustment(finalCount);
    
    return this.clampPointCount(adaptedCount);
  }
  
  private calculateBaseCount(config: DynamicPointConfig): number {
    // Different base counts for different shape types
    const baseByType: Record<string, number> = {
      'mathematical': 800,
      'arbitrary': 1000,
      'procedural': 600,
      'hybrid': 900
    };
    
    return baseByType[config.shape.type] || 800;
  }
  
  private getViewportModifier(viewport: { width: number; height: number; dpr: number }): number {
    // Normalize viewport size (1080p as baseline)
    const pixels = viewport.width * viewport.height;
    const baseline = 1920 * 1080;
    const ratio = Math.sqrt(pixels / baseline);
    
    // Consider device pixel ratio but cap it
    const dprFactor = Math.min(viewport.dpr, 2) / 2;
    
    // Combine factors with diminishing returns
    return Math.pow(ratio, 0.7) * (1 + dprFactor * 0.3);
  }
  
  private getDeviceModifier(capability: DeviceCapability): number {
    const modifiers: Record<DeviceCapability, number> = {
      'low': 0.4,
      'medium': 1.0,
      'high': 2.0
    };
    return modifiers[capability];
  }
  
  private getComplexityModifier(complexity: number): number {
    // More complex shapes need more points to look good
    // But with diminishing returns
    return 0.5 + Math.pow(complexity, 0.8) * 1.5;
  }
  
  private getQualityModifier(preference?: 'performance' | 'balanced' | 'quality'): number {
    const modifiers = {
      'performance': 0.6,
      'balanced': 1.0,
      'quality': 1.5
    };
    return modifiers[preference || 'balanced'];
  }
  
  private applyAdaptiveAdjustment(count: number): number {
    // If we have performance history, adjust based on it
    if (this.performanceHistory.length >= 5) {
      const avgFPS = this.performanceHistory.reduce((a, b) => a + b, 0) / this.performanceHistory.length;
      
      if (avgFPS < 30) {
        // Performance is poor, reduce count
        return Math.round(count * 0.8);
      } else if (avgFPS > 55) {
        // Performance is good, can increase slightly
        return Math.round(count * 1.1);
      }
    }
    
    return count;
  }
  
  private clampPointCount(count: number): number {
    const MIN_POINTS = 100;
    const MAX_POINTS = 5000;
    return Math.max(MIN_POINTS, Math.min(MAX_POINTS, count));
  }
  
  // ═══════════════════════════════════════════════════════════════
  // PERFORMANCE TRACKING
  // ═══════════════════════════════════════════════════════════════
  
  recordFrameRate(fps: number): void {
    this.performanceHistory.push(fps);
    
    // Keep only last 30 samples
    if (this.performanceHistory.length > 30) {
      this.performanceHistory.shift();
    }
  }
  
  getRecommendedCount(shapeComplexity: number = 0.5): number {
    const config: DynamicPointConfig = {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        dpr: window.devicePixelRatio || 1
      },
      device: {
        capability: this.deviceCapability || 'medium'
      },
      shape: {
        complexity: shapeComplexity,
        type: 'mathematical'
      },
      user: {}
    };
    
    return this.calculate(config);
  }
  
  // ═══════════════════════════════════════════════════════════════
  // SHAPE-SPECIFIC OPTIMIZATIONS
  // ═══════════════════════════════════════════════════════════════
  
  getOptimalCountForShape(shapeId: string, baseComplexity: number): number {
    // Shape-specific overrides for visual quality
    const shapeOptimizations: Record<string, { multiplier: number; min: number }> = {
      // Geometric shapes - need precise edges
      'tensor': { multiplier: 1.2, min: 729 }, // 9^3 for perfect grid
      'torus': { multiplier: 1.1, min: 600 },
      'mobius': { multiplier: 1.0, min: 500 },
      
      // Organic shapes - can be more flexible
      'galaxy': { multiplier: 1.3, min: 800 }, // Needs density for spiral
      'wormhole': { multiplier: 0.9, min: 400 },
      
      // Complex mathematical - need high detail
      'klein': { multiplier: 1.4, min: 1000 },
      'hypercube': { multiplier: 1.5, min: 1000 },
      
      // Procedural/organic - adaptive
      'bird': { multiplier: 0.8, min: 300 },
      'tree': { multiplier: 1.2, min: 600 },
      'abstract': { multiplier: 1.0, min: 500 }
    };
    
    const optimization = shapeOptimizations[shapeId] || { multiplier: 1.0, min: 500 };
    const baseCount = this.getRecommendedCount(baseComplexity);
    
    return Math.max(optimization.min, Math.round(baseCount * optimization.multiplier));
  }
}