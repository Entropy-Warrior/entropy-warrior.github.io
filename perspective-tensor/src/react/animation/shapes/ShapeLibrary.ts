import type { Shape3D, ShapeType, Vec3 } from '../core/types';
import { MathematicalShapes } from './MathematicalShapes';
import { ProceduralShapes } from './ProceduralShapes';

// ═══════════════════════════════════════════════════════════════
// UNIFIED SHAPE LIBRARY
// ═══════════════════════════════════════════════════════════════

export class ShapeLibrary {
  private static instance: ShapeLibrary;
  private shapes: Map<string, Shape3D> = new Map();
  private generators: Map<string, (pointCount: number) => Shape3D> = new Map();
  private mathematical: MathematicalShapes;
  private procedural: ProceduralShapes;
  
  static getInstance(): ShapeLibrary {
    if (!ShapeLibrary.instance) {
      ShapeLibrary.instance = new ShapeLibrary();
    }
    return ShapeLibrary.instance;
  }
  
  constructor() {
    this.mathematical = new MathematicalShapes();
    this.procedural = new ProceduralShapes();
    this.registerBuiltInShapes();
  }
  
  // ═══════════════════════════════════════════════════════════════
  // SHAPE REGISTRATION
  // ═══════════════════════════════════════════════════════════════
  
  private registerBuiltInShapes(): void {
    // Register mathematical shape generators
    const mathShapes = [
      'tensor', 'galaxy', 'graph', 'mobius', 'wormhole',
      'helix', 'torus', 'klein', 'sphere', 'hypercube'
    ];
    
    mathShapes.forEach(name => {
      this.generators.set(name, (count) => this.mathematical.generate(name, count));
    });
    
    // Register procedural generators
    const proceduralTypes = {
      animals: ['bird', 'fish', 'butterfly', 'horse', 'elephant', 'dragon'],
      plants: ['tree', 'flower', 'fern', 'mushroom'],
      abstract: ['crystal', 'nebula', 'fractal', 'wave']
    };
    
    Object.entries(proceduralTypes).forEach(([category, types]) => {
      types.forEach(type => {
        this.generators.set(type, (count) => this.procedural.generate(category as any, type, count));
      });
    });
  }
  
  // ═══════════════════════════════════════════════════════════════
  // SHAPE GENERATION & RETRIEVAL
  // ═══════════════════════════════════════════════════════════════
  
  getShape(id: string, pointCount?: number): Shape3D {
    // Check cache first
    const cacheKey = `${id}_${pointCount || 'default'}`;
    if (this.shapes.has(cacheKey)) {
      return this.shapes.get(cacheKey)!;
    }
    
    // Generate if we have a generator
    if (this.generators.has(id)) {
      const shape = this.generators.get(id)!(pointCount || 1000);
      this.shapes.set(cacheKey, shape);
      return shape;
    }
    
    throw new Error(`Shape "${id}" not found in library`);
  }
  
  generateDynamic(id: string, pointCount: number): Shape3D {
    if (!this.generators.has(id)) {
      throw new Error(`No generator for shape "${id}"`);
    }
    
    return this.generators.get(id)!(pointCount);
  }
  
  // ═══════════════════════════════════════════════════════════════
  // CUSTOM SHAPE LOADING
  // ═══════════════════════════════════════════════════════════════
  
  async loadFromFile(path: string): Promise<Shape3D> {
    const extension = path.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'json':
        return this.loadFromJSON(path);
      case 'obj':
        return this.loadFromOBJ(path);
      case 'ply':
        return this.loadFromPLY(path);
      default:
        throw new Error(`Unsupported file format: ${extension}`);
    }
  }
  
  private async loadFromJSON(path: string): Promise<Shape3D> {
    const response = await fetch(path);
    const data = await response.json();
    
    // Validate and transform data
    if (!data.positions || !Array.isArray(data.positions)) {
      throw new Error('Invalid JSON shape format');
    }
    
    const shape: Shape3D = {
      id: data.id || path.split('/').pop()?.replace('.json', '') || 'custom',
      type: 'arbitrary',
      positions: data.positions.map((p: number[]) => [p[0], p[1], p[2] || 0] as Vec3),
      edges: data.edges,
      normals: data.normals,
      metadata: {
        name: data.name || 'Custom Shape',
        description: data.description,
        complexity: data.complexity || 0.5
      }
    };
    
    this.shapes.set(shape.id, shape);
    return shape;
  }
  
  private async loadFromOBJ(path: string): Promise<Shape3D> {
    const response = await fetch(path);
    const text = await response.text();
    
    const positions: Vec3[] = [];
    const edges: [number, number][] = [];
    
    // Parse OBJ format
    const lines = text.split('\n');
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts[0] === 'v') {
        // Vertex position
        positions.push([
          parseFloat(parts[1]),
          parseFloat(parts[2]),
          parseFloat(parts[3])
        ]);
      } else if (parts[0] === 'l') {
        // Line element
        edges.push([
          parseInt(parts[1]) - 1, // OBJ uses 1-based indexing
          parseInt(parts[2]) - 1
        ]);
      }
    }
    
    const shape: Shape3D = {
      id: path.split('/').pop()?.replace('.obj', '') || 'obj-shape',
      type: 'arbitrary',
      positions,
      edges,
      metadata: {
        name: 'OBJ Shape',
        complexity: 0.7
      }
    };
    
    this.shapes.set(shape.id, shape);
    return shape;
  }
  
  private async loadFromPLY(path: string): Promise<Shape3D> {
    // PLY (Polygon File Format) loader
    const response = await fetch(path);
    const buffer = await response.arrayBuffer();
    
    // Simple ASCII PLY parser (binary PLY would need more complex parsing)
    const text = new TextDecoder().decode(buffer);
    const lines = text.split('\n');
    
    let vertexCount = 0;
    let inHeader = true;
    let currentLine = 0;
    const positions: Vec3[] = [];
    
    for (const line of lines) {
      if (inHeader) {
        if (line.startsWith('element vertex')) {
          vertexCount = parseInt(line.split(' ')[2]);
        } else if (line === 'end_header') {
          inHeader = false;
        }
      } else if (positions.length < vertexCount) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3) {
          positions.push([
            parseFloat(parts[0]),
            parseFloat(parts[1]),
            parseFloat(parts[2])
          ]);
        }
      }
    }
    
    const shape: Shape3D = {
      id: path.split('/').pop()?.replace('.ply', '') || 'ply-shape',
      type: 'arbitrary',
      positions,
      metadata: {
        name: 'PLY Point Cloud',
        complexity: 0.8
      }
    };
    
    this.shapes.set(shape.id, shape);
    return shape;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // SHAPE CREATION & EDITING
  // ═══════════════════════════════════════════════════════════════
  
  createCustomShape(id: string, positions: Vec3[], metadata?: Partial<Shape3D['metadata']>): Shape3D {
    const shape: Shape3D = {
      id,
      type: 'arbitrary',
      positions,
      metadata: {
        name: metadata?.name || id,
        description: metadata?.description,
        complexity: metadata?.complexity || 0.5,
        ...metadata
      }
    };
    
    this.shapes.set(id, shape);
    return shape;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // SHAPE QUERIES & LISTING
  // ═══════════════════════════════════════════════════════════════
  
  listAvailableShapes(): string[] {
    return Array.from(new Set([
      ...Array.from(this.generators.keys()),
      ...Array.from(this.shapes.keys())
    ]));
  }
  
  getShapesByCategory(category: string): string[] {
    const categories: Record<string, string[]> = {
      'geometric': ['tensor', 'torus', 'sphere', 'hypercube'],
      'mathematical': ['mobius', 'klein', 'graph'],
      'cosmic': ['galaxy', 'wormhole', 'nebula'],
      'organic': ['helix', 'tree', 'flower', 'fern'],
      'animals': ['bird', 'fish', 'butterfly', 'horse', 'elephant', 'dragon'],
      'abstract': ['crystal', 'fractal', 'wave']
    };
    
    return categories[category] || [];
  }
  
  getShapeMetadata(id: string): Shape3D['metadata'] | null {
    const shape = this.shapes.get(id);
    if (shape) return shape.metadata;
    
    // Try to generate to get metadata
    if (this.generators.has(id)) {
      const tempShape = this.generators.get(id)!(100);
      return tempShape.metadata;
    }
    
    return null;
  }
  
  // ═══════════════════════════════════════════════════════════════
  // SHAPE TRANSFORMATIONS
  // ═══════════════════════════════════════════════════════════════
  
  normalizeShape(shape: Shape3D): Shape3D {
    // Center and scale to unit cube
    const positions = shape.positions;
    
    // Find bounds
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    
    positions.forEach(p => {
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i], p[i]);
        max[i] = Math.max(max[i], p[i]);
      }
    });
    
    // Center
    const center = min.map((m, i) => (m + max[i]) / 2);
    const scale = Math.max(...max.map((m, i) => m - min[i]));
    
    // Transform positions
    const normalized = positions.map(p => 
      p.map((v, i) => (v - center[i]) / scale * 2) as Vec3
    );
    
    return {
      ...shape,
      positions: normalized
    };
  }
  
  resampleShape(shape: Shape3D, targetCount: number): Shape3D {
    const currentCount = shape.positions.length;
    
    if (currentCount === targetCount) return shape;
    
    if (targetCount < currentCount) {
      // Downsample using uniform selection
      const step = currentCount / targetCount;
      const resampled: Vec3[] = [];
      
      for (let i = 0; i < targetCount; i++) {
        const index = Math.floor(i * step);
        resampled.push(shape.positions[index]);
      }
      
      return { ...shape, positions: resampled };
    } else {
      // Upsample using interpolation
      const resampled: Vec3[] = [...shape.positions];
      
      while (resampled.length < targetCount) {
        const idx = Math.floor(Math.random() * (resampled.length - 1));
        const p1 = resampled[idx];
        const p2 = resampled[idx + 1];
        const t = Math.random();
        
        // Linear interpolation
        const newPoint: Vec3 = [
          p1[0] * (1 - t) + p2[0] * t,
          p1[1] * (1 - t) + p2[1] * t,
          p1[2] * (1 - t) + p2[2] * t
        ];
        
        resampled.splice(idx + 1, 0, newPoint);
      }
      
      return { ...shape, positions: resampled.slice(0, targetCount) };
    }
  }
}