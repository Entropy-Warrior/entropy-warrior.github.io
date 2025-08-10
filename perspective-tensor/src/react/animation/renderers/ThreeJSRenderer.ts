import * as THREE from 'three';
import type { Vec3 } from '../core/types';
import type { IRenderer, Line, RenderConfig } from './IRenderer';
import { ANIMATION_CONFIG as CFG } from '../../config';

export class ThreeJSRenderer implements IRenderer {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.OrthographicCamera | null = null;
  private particlesObject: THREE.Points | null = null;
  private linesObject: THREE.LineSegments | null = null;
  private particleMaterial: THREE.ShaderMaterial | null = null;
  private lineMaterial: THREE.LineBasicMaterial | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private gridMesh: THREE.Mesh | null = null;
  private gridMaterial: THREE.ShaderMaterial | null = null;
  private panOffset: { x: number; y: number } = { x: 0, y: 0 };
  private viewportRotationMatrix: THREE.Matrix4 = new THREE.Matrix4();
  private shapeRotationMatrix: THREE.Matrix4 = new THREE.Matrix4();
  
  // Buffers for efficient updates
  private maxParticles = 5000;
  private maxLines = 10000;
  private particlePositionBuffer: Float32Array;
  private particleSizeBuffer: Float32Array;
  private linePositionBuffer: Float32Array;
  private lineColorBuffer: Float32Array;

  constructor() {
    // Pre-allocate buffers
    this.particlePositionBuffer = new Float32Array(this.maxParticles * 3);
    this.particleSizeBuffer = new Float32Array(this.maxParticles);
    this.linePositionBuffer = new Float32Array(this.maxLines * 2 * 3);
    this.lineColorBuffer = new Float32Array(this.maxLines * 2 * 4);
  }

  initialize(canvas: HTMLCanvasElement, width: number, height: number): void {
    this.canvas = canvas;
    
    // Create WebGL renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,  // No transparency needed
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, CFG.viewport.maxDevicePixelRatio));
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0x0a0a0a, 1);  // Dark background, fully opaque
    this.renderer.autoClear = true;
    
    // Create scene
    this.scene = new THREE.Scene();
    
    // Create orthographic camera (matches Canvas2D projection)
    const halfW = width / 2;
    const halfH = height / 2;
    // Set near plane to negative and far plane to large value to avoid clipping
    this.camera = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, -1000, 1000);
    this.camera.position.z = 100;
    
    // Create particle system
    this.setupParticles();
    
    // Create line system
    this.setupLines();
    
    // Create grid
    this.setupGrid();
  }

  private setupParticles(): void {
    if (!this.scene) return;
    
    const geometry = new THREE.BufferGeometry();
    
    // Set up position attribute
    geometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositionBuffer, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(this.particleSizeBuffer, 1));
    
    // Create custom shader material for per-particle sizes
    const vertexShader = `
      attribute float size;
      varying float vSize;
      void main() {
        vSize = size;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        // Scale point size based on the size attribute
        gl_PointSize = size * 4.0;  // Increased multiplier for better visibility
        gl_Position = projectionMatrix * mvPosition;
      }
    `;
    
    const fragmentShader = `
      uniform vec3 color;
      uniform float opacity;
      varying float vSize;
      void main() {
        vec2 xy = gl_PointCoord.xy - vec2(0.5);
        float r = dot(xy, xy);
        if (r > 0.25) discard;
        // Simple circle without gradient for consistent appearance
        gl_FragColor = vec4(color, opacity);
      }
    `;
    
    this.particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(0x888888) },
        opacity: { value: 0.6 }
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,  // Disable depth writing for particles
      depthTest: false,   // Disable depth testing - render all particles
      blending: THREE.NormalBlending  // Changed from AdditiveBlending to match Canvas2D
    });
    
    this.particlesObject = new THREE.Points(geometry, this.particleMaterial);
    this.scene.add(this.particlesObject);
  }

  private setupLines(): void {
    if (!this.scene) return;
    
    const geometry = new THREE.BufferGeometry();
    
    // Set up attributes
    geometry.setAttribute('position', new THREE.BufferAttribute(this.linePositionBuffer, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.lineColorBuffer, 4));
    
    // Create material
    this.lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.NormalBlending,
      linewidth: 1 // Note: linewidth > 1 only works with some browsers
    });
    
    this.linesObject = new THREE.LineSegments(geometry, this.lineMaterial);
    this.scene.add(this.linesObject);
  }

  private setupGrid(): void {
    if (!this.scene || !this.camera) return;
    
    // Create infinite grid using shaders
    const vertexShader = `
      varying vec3 vPosition;
      varying vec2 vUv;
      uniform mat4 uRotationMatrix;
      
      void main() {
        vPosition = position;
        vUv = uv;
        // Apply rotation to the grid
        vec4 rotatedPos = uRotationMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * rotatedPos;
      }
    `;
    
    const fragmentShader = `
      varying vec3 vPosition;
      varying vec2 vUv;
      uniform bool uIsDark;
      uniform float uOpacity;
      uniform vec2 uResolution;
      uniform float uScale;
      
      float grid(vec2 st, float res) {
        vec2 grid = abs(fract(st - 0.5) - 0.5) / fwidth(st);
        return min(grid.x, grid.y);
      }
      
      void main() {
        // Get world position for grid lines, scaled with zoom
        vec2 worldPos = vPosition.xy / uScale; // Use scale to match shape units
        
        // Create multi-scale grid system with finer inner grids
        float line1 = 1.0 - min(grid(worldPos * 1.0, 10.0), 1.0);   // Very fine grid every 1 unit
        float line2 = 1.0 - min(grid(worldPos * 0.2, 10.0), 1.0);   // Fine grid every 5 units  
        float line3 = 1.0 - min(grid(worldPos * 0.1, 10.0), 1.0);   // Medium grid every 10 units
        float line4 = 1.0 - min(grid(worldPos * 0.01, 10.0), 1.0);  // Major grid every 100 units
        
        // Axis lines
        float axisX = 1.0 - smoothstep(0.0, 2.0 / uResolution.x, abs(vPosition.y));
        float axisY = 1.0 - smoothstep(0.0, 2.0 / uResolution.y, abs(vPosition.x));
        
        // Combine grids with different intensities for hierarchy
        // Finest grid is very subtle, gets more prominent as grid gets coarser
        float gridIntensity = line1 * 0.15 + line2 * 0.25 + line3 * 0.4 + line4 * 0.7;
        float axisIntensity = max(axisX, axisY) * 1.0;
        
        float finalIntensity = max(gridIntensity, axisIntensity);
        
        // Color based on theme with slightly different colors for grid hierarchy
        vec3 fineGridColor = uIsDark ? vec3(0.3, 0.3, 0.3) : vec3(0.6, 0.6, 0.6);   // Subtle for fine grid
        vec3 coarseGridColor = uIsDark ? vec3(0.5, 0.5, 0.5) : vec3(0.4, 0.4, 0.4); // More visible for coarse grid
        vec3 axisColor = uIsDark ? vec3(0.8, 0.8, 0.8) : vec3(0.2, 0.2, 0.2);       // Prominent for axes
        
        // Mix colors based on which grid lines are most prominent
        vec3 gridColor = mix(fineGridColor, coarseGridColor, (line3 * 0.4 + line4 * 0.7) / (gridIntensity + 0.001));
        vec3 color = mix(gridColor, axisColor, axisIntensity / (gridIntensity + axisIntensity + 0.001));
        
        // Fade out at edges for smooth appearance
        vec2 screenPos = gl_FragCoord.xy / uResolution;
        vec2 fadeFactors = smoothstep(vec2(0.0), vec2(0.08), screenPos) * 
                          smoothstep(vec2(0.0), vec2(0.08), vec2(1.0) - screenPos);
        float edgeFade = fadeFactors.x * fadeFactors.y;
        
        finalIntensity *= edgeFade;
        
        if (finalIntensity < 0.01) discard;
        
        gl_FragColor = vec4(color, finalIntensity * uOpacity);
      }
    `;
    
    // Create a large plane for the grid
    const gridSize = 10000; // Large enough to appear infinite
    const geometry = new THREE.PlaneGeometry(gridSize, gridSize);
    
    this.gridMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uRotationMatrix: { value: new THREE.Matrix4() },
        uIsDark: { value: true },
        uOpacity: { value: 0.6 },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uScale: { value: 20.0 }
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    
    this.gridMesh = new THREE.Mesh(geometry, this.gridMaterial);
    this.gridMesh.renderOrder = -1; // Render before other objects
    this.scene.add(this.gridMesh);
  }

  public setGridVisible(visible: boolean): void {
    if (this.gridMesh) {
      this.gridMesh.visible = visible;
    }
  }

  public setPanOffset(x: number, y: number): void {
    this.panOffset.x = x;
    this.panOffset.y = y;
    // Don't move the camera - we're moving the space instead
  }
  
  public setViewportRotation(rotationX: number, rotationY: number): void {
    // Create rotation matrix for viewport (affects both grid and shape from viewpoint)
    const rotX = new THREE.Matrix4().makeRotationX(rotationX);
    const rotY = new THREE.Matrix4().makeRotationY(rotationY);
    this.viewportRotationMatrix.multiplyMatrices(rotY, rotX);
    
    // Apply viewport rotation to grid - grid rotates with viewport
    if (this.gridMaterial) {
      this.gridMaterial.uniforms.uRotationMatrix.value = this.viewportRotationMatrix;
    }
  }

  public setShapeRotation(rotationX: number, rotationY: number): void {
    // Create rotation matrix for shape only (affects particles and lines, NOT grid)
    const rotX = new THREE.Matrix4().makeRotationX(rotationX);
    const rotY = new THREE.Matrix4().makeRotationY(rotationY);
    this.shapeRotationMatrix.multiplyMatrices(rotY, rotX);
    // Grid is NOT affected by shape rotation - it stays stationary in space
  }

  private hexToRgb(hex: string | any): { r: number; g: number; b: number } {
    // Handle invalid input - fallback to white
    if (!hex || typeof hex !== 'string') {
      console.warn('Invalid color passed to hexToRgb:', hex);
      return { r: 1, g: 1, b: 1 }; // White fallback
    }
    // Handle rgb() format
    if (hex.startsWith('rgb')) {
      const matches = hex.match(/\d+/g);
      if (matches) {
        return {
          r: parseInt(matches[0]) / 255,
          g: parseInt(matches[1]) / 255,
          b: parseInt(matches[2]) / 255
        };
      }
    }
    
    // Handle hex format
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    } : { r: 0.5, g: 0.5, b: 0.5 };
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
    if (!this.renderer || !this.scene || !this.camera || !this.particlesObject || !this.linesObject) return;

    const { 
      scale, centerX, centerY, 
      modelCenterX, modelCenterY, nodeColor, lineColor, 
      isDark, particleSizes, brownianOffsets,
      pointOpacity = 0.9, edgeOpacity = 0.5,
      showGrid = true, panOffset = { x: 0, y: 0 }
    } = config;

    // Update background color based on theme
    if (this.renderer) {
      this.renderer.setClearColor(isDark ? 0x0a0a0a : 0xf0f0f0, 1);
    }
    
    // Update grid visibility, theme, and scale
    this.setGridVisible(showGrid);
    if (this.gridMaterial) {
      this.gridMaterial.uniforms.uIsDark.value = isDark;
      this.gridMaterial.uniforms.uResolution.value.set(this.canvas?.width || 800, this.canvas?.height || 600);
      this.gridMaterial.uniforms.uScale.value = scale;
    }
    
    // Update pan offset
    this.setPanOffset(panOffset.x, panOffset.y);

    // Update particle colors and opacity
    if (this.particleMaterial) {
      const color = this.hexToRgb(nodeColor);
      this.particleMaterial.uniforms.color.value.setRGB(color.r, color.g, color.b);
      this.particleMaterial.uniforms.opacity.value = pointOpacity;
    }

    // Update particle positions and sizes
    const numParticles = Math.min(particlePositions.length, this.maxParticles);
    for (let i = 0; i < numParticles; i++) {
      const pos = particlePositions[i];
      const idx = i * 3;
      
      // Apply brownian motion and transformations
      const basePos = new THREE.Vector3(
        (pos[0] + brownianOffsets.x[i] - modelCenterX) * scale,
        (pos[1] + brownianOffsets.y[i] - modelCenterY) * scale,
        pos[2] * scale
      );
      
      // Apply combined rotations: shape rotation first, then viewport rotation
      basePos.applyMatrix4(this.shapeRotationMatrix);
      basePos.applyMatrix4(this.viewportRotationMatrix);
      
      this.particlePositionBuffer[idx] = basePos.x;
      this.particlePositionBuffer[idx + 1] = basePos.y;
      this.particlePositionBuffer[idx + 2] = basePos.z;
      
      // Set particle size - keep it small to match Canvas2D
      this.particleSizeBuffer[i] = particleSizes[i]; // No multiplier, use size as-is
    }
    
    // Update particle geometry
    const particleGeometry = this.particlesObject.geometry;
    const posAttr = particleGeometry.getAttribute('position') as THREE.BufferAttribute;
    const sizeAttr = particleGeometry.getAttribute('size') as THREE.BufferAttribute;
    
    // Update the buffer data
    for (let j = 0; j < numParticles * 3; j++) {
      (posAttr.array as Float32Array)[j] = this.particlePositionBuffer[j];
    }
    posAttr.needsUpdate = true;
    
    for (let j = 0; j < numParticles; j++) {
      (sizeAttr.array as Float32Array)[j] = this.particleSizeBuffer[j];
    }
    sizeAttr.needsUpdate = true;
    
    particleGeometry.setDrawRange(0, numParticles);

    // Update line positions and colors
    const lineRgb = this.hexToRgb(lineColor);
    let lineIndex = 0;
    
    for (const line of lines) {
      if (line.strength < 0.01 || lineIndex >= this.maxLines) continue;
      
      const particleA = line.a;
      const particleB = line.b;
      
      if (particleA >= 0 && particleA < numParticles && 
          particleB >= 0 && particleB < numParticles) {
        const posA = particlePositions[particleA];
        const posB = particlePositions[particleB];
        
        // Calculate distance for alpha
        const dx = posA[0] - posB[0];
        const dy = posA[1] - posB[1];
        const dz = posA[2] - posB[2];
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const alpha = this.getLineAlpha(line, distance, isDark) * (edgeOpacity || 1.0);
        
        // Set line start point
        const idx1 = lineIndex * 6;
        const startPos = new THREE.Vector3(
          (posA[0] + brownianOffsets.x[particleA] - modelCenterX) * scale,
          (posA[1] + brownianOffsets.y[particleA] - modelCenterY) * scale,
          posA[2] * scale
        );
        const endPos = new THREE.Vector3(
          (posB[0] + brownianOffsets.x[particleB] - modelCenterX) * scale,
          (posB[1] + brownianOffsets.y[particleB] - modelCenterY) * scale,
          posB[2] * scale
        );
        
        // Apply combined rotations: shape rotation first, then viewport rotation
        startPos.applyMatrix4(this.shapeRotationMatrix);
        startPos.applyMatrix4(this.viewportRotationMatrix);
        endPos.applyMatrix4(this.shapeRotationMatrix);
        endPos.applyMatrix4(this.viewportRotationMatrix);
        
        this.linePositionBuffer[idx1] = startPos.x;
        this.linePositionBuffer[idx1 + 1] = startPos.y;
        this.linePositionBuffer[idx1 + 2] = startPos.z;
        this.linePositionBuffer[idx1 + 3] = endPos.x;
        this.linePositionBuffer[idx1 + 4] = endPos.y;
        this.linePositionBuffer[idx1 + 5] = endPos.z;
        
        // Set line colors with alpha
        const colorIdx = lineIndex * 8;
        // Start point color
        this.lineColorBuffer[colorIdx] = lineRgb.r;
        this.lineColorBuffer[colorIdx + 1] = lineRgb.g;
        this.lineColorBuffer[colorIdx + 2] = lineRgb.b;
        this.lineColorBuffer[colorIdx + 3] = alpha;
        // End point color
        this.lineColorBuffer[colorIdx + 4] = lineRgb.r;
        this.lineColorBuffer[colorIdx + 5] = lineRgb.g;
        this.lineColorBuffer[colorIdx + 6] = lineRgb.b;
        this.lineColorBuffer[colorIdx + 7] = alpha;
        
        lineIndex++;
      }
    }
    
    // Update line geometry
    const lineGeometry = this.linesObject.geometry;
    const linePosAttr = lineGeometry.getAttribute('position') as THREE.BufferAttribute;
    const lineColorAttr = lineGeometry.getAttribute('color') as THREE.BufferAttribute;
    
    // Update the buffer data
    for (let j = 0; j < lineIndex * 6; j++) {
      (linePosAttr.array as Float32Array)[j] = this.linePositionBuffer[j];
    }
    linePosAttr.needsUpdate = true;
    
    for (let j = 0; j < lineIndex * 8; j++) {
      (lineColorAttr.array as Float32Array)[j] = this.lineColorBuffer[j];
    }
    lineColorAttr.needsUpdate = true;
    
    lineGeometry.setDrawRange(0, lineIndex * 2);

    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }

  resize(width: number, height: number): void {
    if (!this.renderer || !this.camera) return;
    
    this.renderer.setSize(width, height);
    
    const halfW = width / 2;
    const halfH = height / 2;
    this.camera.left = -halfW;
    this.camera.right = halfW;
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.updateProjectionMatrix();
    
    // Update grid resolution uniform
    if (this.gridMaterial) {
      this.gridMaterial.uniforms.uResolution.value.set(width, height);
    }
  }

  dispose(): void {
    if (this.particlesObject) {
      this.particlesObject.geometry.dispose();
      if (this.particlesObject.material instanceof THREE.Material) {
        this.particlesObject.material.dispose();
      }
    }
    
    if (this.linesObject) {
      this.linesObject.geometry.dispose();
      if (this.linesObject.material instanceof THREE.Material) {
        this.linesObject.material.dispose();
      }
    }
    
    if (this.gridMesh) {
      this.gridMesh.geometry.dispose();
      if (this.gridMaterial) {
        this.gridMaterial.dispose();
      }
    }
    
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.particlesObject = null;
    this.linesObject = null;
    this.canvas = null;
  }

  isWebGL(): boolean {
    return true;
  }
}