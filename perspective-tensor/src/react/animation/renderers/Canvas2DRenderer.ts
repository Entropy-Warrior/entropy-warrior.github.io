import type { Vec3 } from '../core/types';
import type { IRenderer, Line, RenderConfig } from './IRenderer';
import { ANIMATION_CONFIG as CFG } from '../../config';

export class Canvas2DRenderer implements IRenderer {
  private ctx: CanvasRenderingContext2D | null = null;
  private canvas: HTMLCanvasElement | null = null;

  initialize(canvas: HTMLCanvasElement, width: number, height: number): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.resize(width, height);
  }

  private getLineAlpha(line: Line, distance: number, isDark: boolean): number {
    const base = isDark ? CFG.line.baseAlpha.dark : CFG.line.baseAlpha.light;
    const boost = isDark ? CFG.line.distanceBoost.dark : CFG.line.distanceBoost.light;
    const max = isDark ? CFG.line.maxAlpha.dark : CFG.line.maxAlpha.light;
    
    const distFactor = Math.min(distance / CFG.line.distanceThreshold, 1.0);
    return Math.min((base + distFactor * boost) * line.strength, max);
  }

  render(
    particlePositions: Vec3[],
    lines: Line[],
    config: RenderConfig
  ): void {
    if (!this.ctx) return;

    const ctx = this.ctx;
    const { 
      width, height, scale, centerX, centerY, 
      modelCenterX, modelCenterY, nodeColor, lineColor, 
      isDark, particleSizes, brownianOffsets 
    } = config;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw lines
    lines.forEach(line => {
      // Skip rendering lines that are essentially invisible
      if (line.strength < 0.01) return;
      
      // Get particle positions for this line
      const particleA = line.a;
      const particleB = line.b;
      
      if (particleA >= 0 && particleA < particlePositions.length && 
          particleB >= 0 && particleB < particlePositions.length) {
        const posA = particlePositions[particleA];
        const posB = particlePositions[particleB];
        
        // Calculate distance for visibility
        const dx = posA[0] - posB[0];
        const dy = posA[1] - posB[1];
        const dz = posA[2] - posB[2];
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        // Lines connect particles with their individual random brownian offsets
        const x1 = centerX + (posA[0] + brownianOffsets.x[particleA] - modelCenterX) * scale;
        const y1 = centerY + (posA[1] + brownianOffsets.y[particleA] - modelCenterY) * scale;
        const x2 = centerX + (posB[0] + brownianOffsets.x[particleB] - modelCenterX) * scale;
        const y2 = centerY + (posB[1] + brownianOffsets.y[particleB] - modelCenterY) * scale;
        
        // Simple thin transparent lines with distance-based alpha
        ctx.strokeStyle = lineColor;
        ctx.globalAlpha = this.getLineAlpha(line, distance, isDark);
        ctx.lineWidth = CFG.line.thickness;
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    });

    // Draw particles with continuous brownian motion and random sizes
    ctx.fillStyle = nodeColor;
    ctx.globalAlpha = 1.0;
    
    for (let particleIdx = 0; particleIdx < particlePositions.length; particleIdx++) {
      const pos = particlePositions[particleIdx];
      
      // Per-particle random brownian motion with individual offsets
      const x = centerX + (pos[0] + brownianOffsets.x[particleIdx] - modelCenterX) * scale;
      const y = centerY + (pos[1] + brownianOffsets.y[particleIdx] - modelCenterY) * scale;
      
      // Use the random size for this particle
      const radius = particleSizes[particleIdx];
      
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2); 
      ctx.fill();
    }
  }

  resize(width: number, height: number): void {
    if (!this.canvas) return;
    
    const dpr = Math.min(window.devicePixelRatio || 1, CFG.viewport.maxDevicePixelRatio);
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    
    if (this.ctx) {
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  dispose(): void {
    this.ctx = null;
    this.canvas = null;
  }

  isWebGL(): boolean {
    return false;
  }
}