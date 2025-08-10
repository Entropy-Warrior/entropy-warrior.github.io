import React, { useState, useRef, Suspense, useMemo, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stats, Grid, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Shape3D, Vec3 } from '../animation/core/types';
import {
  generateTensor,
  generateGalaxy,
  generateGraph,
  generateMobiusRibbon,
  generateWormhole,
  generateDoubleHelix,
  generateTorusKnot,
  generateKleinBottle,
  generateSphere,
  generateHypercube,
  SHAPE_EQUATIONS
} from '../animation/shapes/mathematical';
// Simple Brownian motion state for true per-particle jitter
interface SimpleBrownianState {
  offsets: Vec3[];
}
import {
  type ThemeColor,
  type ThemeColors,
  getThemeColor,
  createThemeColor,
  darkToLight,
  DEFAULT_THEME_COLORS
} from '../animation/utils/theme';
import { getBounds, centerPositions } from '../animation/utils/transforms';

// ═══════════════════════════════════════════════════════════════
// SHAPE CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const SHAPES = {
  tensor: { generator: generateTensor, name: 'Tensor', equation: SHAPE_EQUATIONS.tensor },
  galaxy: { generator: generateGalaxy, name: 'Galaxy', equation: SHAPE_EQUATIONS.galaxy },
  graph: { generator: generateGraph, name: 'Graph Network', equation: SHAPE_EQUATIONS.graph },
  mobius: { generator: generateMobiusRibbon, name: 'Möbius Ribbon', equation: SHAPE_EQUATIONS.mobius },
  wormhole: { generator: generateWormhole, name: 'Wormhole', equation: SHAPE_EQUATIONS.wormhole },
  helix: { generator: generateDoubleHelix, name: 'Double Helix', equation: SHAPE_EQUATIONS.helix },
  torus: { generator: generateTorusKnot, name: 'Torus Knot', equation: SHAPE_EQUATIONS.torus },
  klein: { generator: generateKleinBottle, name: 'Klein Bottle', equation: SHAPE_EQUATIONS.klein },
  sphere: { generator: generateSphere, name: 'Sphere', equation: SHAPE_EQUATIONS.sphere },
  hypercube: { generator: generateHypercube, name: 'Hypercube', equation: SHAPE_EQUATIONS.hypercube }
};

// ═══════════════════════════════════════════════════════════════
// 3D SHAPE RENDERER
// ═══════════════════════════════════════════════════════════════

interface ShapeVisualizerProps {
  shape: Shape3D;
  showEdges: boolean;
  pointSize: number;
  pointSizeVariation: number;
  pointColor: string;
  pointOpacity: number;
  edgeColor: string;
  edgeOpacity: number;
  edgeStyle: 'solid' | 'dashed' | 'dotted';
  autoRotate: boolean;
  rotationSpeed: number;
  brownianMotion: boolean;
  brownianAmplitude: number;
  brownianSpeed: number;
}

function ShapeVisualizer({ 
  shape, 
  showEdges, 
  pointSize, 
  pointSizeVariation,
  pointColor,
  pointOpacity,
  edgeColor,
  edgeOpacity,
  edgeStyle,
  autoRotate,
  rotationSpeed,
  brownianMotion,
  brownianAmplitude,
  brownianSpeed
}: ShapeVisualizerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const edgesRef = useRef<THREE.LineSegments>(null);
  
  // Log when component mounts or key props change
  useEffect(() => {
    if (DEBUG_MODE) {
      console.log('🎨 SHAPE VISUALIZER RENDERING:', {
        shapeId: shape.id,
        pointsToRender: shape.positions.length,
        edgesToRender: shape.edges?.length || 0,
        pointSize,
        pointColor,
        showEdges,
        timestamp: new Date().toISOString()
      });
    }
  }, [shape.id, shape.positions.length]);
  
  // Initialize simple Brownian motion state
  const brownianState = useRef<SimpleBrownianState>({
    offsets: Array(shape.positions.length).fill(null).map(() => [0, 0, 0] as Vec3)
  });
  const originalPositions = useRef<Vec3[]>(shape.positions);
  
  // Reset Brownian state when settings change or motion is toggled
  useEffect(() => {
    brownianState.current = {
      offsets: Array(shape.positions.length).fill(null).map(() => [0, 0, 0] as Vec3)
    };
  }, [shape.positions.length, brownianMotion]);
  
  // Generate random sizes for each point
  const pointSizes = useMemo(() => {
    const sizes = new Float32Array(shape.positions.length);
    for (let i = 0; i < shape.positions.length; i++) {
      // Random size between pointSize and pointSize * (1 + variation)
      // Ensure minimum size for visibility
      sizes[i] = Math.max(0.1, pointSize * (1 + Math.random() * pointSizeVariation));
    }
    return sizes;
  }, [shape.positions.length, pointSize, pointSizeVariation]);
  
  // Auto-rotation and Brownian motion update
  useFrame((state, delta) => {
    // Rotation
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += rotationSpeed * delta;
    }
    
    // Always start from original positions, then apply Brownian if enabled
    if (pointsRef.current) {
      let displayPositions = originalPositions.current;
      
      // Apply true per-particle Brownian motion with size-dependent behavior
      if (brownianMotion) {
        // Base update interval from speed parameter
        const baseUpdateInterval = 1.0 / (brownianSpeed * 60); // Convert speed to seconds
        
        // Update each particle independently based on its size
        for (let i = 0; i < brownianState.current.offsets.length; i++) {
          // Size-dependent Brownian motion: smaller particles move more and update more frequently
          // Using Einstein-Smoluchowski equation: D ∝ 1/√(size)
          const particleSize = pointSizes[i];
          const sizeFactor = 1 / Math.sqrt(Math.max(particleSize, 0.1));
          
          // Smaller particles update more frequently
          const particleUpdateInterval = baseUpdateInterval / sizeFactor;
          
          // Check if this particle should update (each particle has its own update timing)
          if (Math.random() < (delta / particleUpdateInterval)) {
            // Size-dependent amplitude: smaller particles move more
            const sizeAdjustedAmplitude = brownianAmplitude * sizeFactor * 0.5;
            
            // Pure random jitter with size-adjusted amplitude
            brownianState.current.offsets[i] = [
              (Math.random() - 0.5) * sizeAdjustedAmplitude,
              (Math.random() - 0.5) * sizeAdjustedAmplitude,
              (Math.random() - 0.5) * sizeAdjustedAmplitude
            ];
          }
        }
        
        // Apply offsets to positions
        displayPositions = originalPositions.current.map((pos, i) => {
          const offset = brownianState.current.offsets[i];
          return [
            pos[0] + offset[0],
            pos[1] + offset[1],
            pos[2] + offset[2]
          ] as Vec3;
        });
      }
      
      // Update point positions
      const posArray = new Float32Array(displayPositions.flat());
      pointsRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
      
      // Update edges if visible
      if (showEdges && edgesRef.current && shape.edges) {
        const edgePositions: number[] = [];
        shape.edges.forEach(([a, b]) => {
          if (a < displayPositions.length && b < displayPositions.length) {
            edgePositions.push(...displayPositions[a], ...displayPositions[b]);
          }
        });
        edgesRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(edgePositions), 3));
      }
    }
  });
  
  // Create point geometry with sizes
  const pointsGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(shape.positions.flat());
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(pointSizes, 1));
    
    // Debug logging
    if (DEBUG_MODE) {
      console.log('📊 Creating point geometry buffer:', {
        shapeId: shape.id,
        shapePositions: shape.positions.length,
        pointSizesLength: pointSizes.length,
        positionsBufferLength: positions.length / 3,
        firstPointSize: pointSizes[0],
        avgPointSize: pointSizes.reduce((a, b) => a + b, 0) / pointSizes.length
      });
    }
    
    return geometry;
  }, [shape, pointSizes]);
  
  // Create edge geometry
  const edgesGeometry = useMemo(() => {
    if (!shape.edges || shape.edges.length === 0) return null;
    
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    
    shape.edges.forEach(([a, b]) => {
      if (a < shape.positions.length && b < shape.positions.length) {
        positions.push(...shape.positions[a], ...shape.positions[b]);
      }
    });
    
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    return geometry;
  }, [shape]);
  
  // Create edge material based on style
  const edgesMaterial = useMemo(() => {
    if (edgeStyle === 'solid') {
      // Use basic material for solid lines
      return new THREE.LineBasicMaterial({
        color: edgeColor,
        opacity: edgeOpacity,
        transparent: true
      });
    } else {
      // Use dashed material for dashed/dotted lines
      let dashSize = 0.3;
      let gapSize = 0.2;
      
      if (edgeStyle === 'dotted') {
        dashSize = 0.05;
        gapSize = 0.15;
      }
      
      return new THREE.LineDashedMaterial({
        color: edgeColor,
        opacity: edgeOpacity,
        transparent: true,
        dashSize: dashSize,
        gapSize: gapSize,
        scale: 1
      });
    }
  }, [edgeColor, edgeOpacity, edgeStyle]);
  
  // Custom shader material for variable point sizes
  const pointsMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(pointColor) },
        baseSize: { value: pointSize },
        opacity: { value: pointOpacity }
      },
      vertexShader: `
        attribute float size;
        varying float vSize;
        void main() {
          vSize = size;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          // Ensure minimum point size for visibility
          float distance = length(mvPosition.xyz);
          gl_PointSize = max(1.0, size * (300.0 / distance));
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float opacity;
        varying float vSize;
        void main() {
          vec2 xy = gl_PointCoord.xy - vec2(0.5);
          float r = length(xy);
          if (r > 0.5) discard;
          // Smooth edge for anti-aliasing
          float alpha = 1.0 - smoothstep(0.45, 0.5, r);
          // Apply opacity directly without double multiplication
          gl_FragColor = vec4(color, alpha * opacity);
        }
      `,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: true
    });
  }, [pointColor, pointSize, pointOpacity]);
  
  // Update material when properties change
  useEffect(() => {
    if (pointsMaterial) {
      pointsMaterial.uniforms.color.value = new THREE.Color(pointColor);
      pointsMaterial.uniforms.baseSize.value = pointSize;
      pointsMaterial.uniforms.opacity.value = pointOpacity;
    }
  }, [pointColor, pointSize, pointOpacity, pointsMaterial]);
  
  return (
    <group ref={groupRef}>
      {/* Points */}
      <points ref={pointsRef} geometry={pointsGeometry} material={pointsMaterial} />
      
      {/* Edges */}
      {showEdges && edgesGeometry && edgesMaterial && (
        <lineSegments 
          ref={(lineSegments) => {
            if (lineSegments && edgeStyle !== 'solid') {
              // Compute line distances for dashed lines to work
              lineSegments.computeLineDistances();
            }
            edgesRef.current = lineSegments;
          }}
          geometry={edgesGeometry} 
          material={edgesMaterial} 
        />
      )}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN TEST LAB COMPONENT
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// SETTINGS INTERFACE
// ═══════════════════════════════════════════════════════════════

interface ShapeSettings {
  selectedShape: keyof typeof SHAPES;
  pointCount: number;
  showEdges: boolean;
  showGrid: boolean;
  showStats: boolean;
  pointSize: number;
  pointSizeVariation: number;
  pointColor: ThemeColor; // Only ThemeColor now
  pointOpacity: number;
  edgeColor: ThemeColor; // Only ThemeColor now
  edgeOpacity: number;
  edgeStyle: 'solid' | 'dashed' | 'dotted';
  autoRotate: boolean;
  rotationSpeed: number;
  theme: 'dark' | 'light';
  brownianMotion: boolean;
  brownianAmplitude: number;
  brownianSpeed: number;
}

// Debug mode flag - set to true to enable console logging
const DEBUG_MODE = true;

// Complete settings structure for all shapes
interface AllShapeSettings {
  currentShape: keyof typeof SHAPES;
  globalSettings: Omit<ShapeSettings, 'selectedShape' | 'pointCount'>;
  shapeSpecific: {
    [key in keyof typeof SHAPES]?: {
      pointCount: number;
      // Add more shape-specific settings here if needed
    };
  };
}

// Collapsible Section Component
function CollapsibleSection({ 
  title, 
  isExpanded, 
  onToggle, 
  children,
  theme 
}: { 
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  theme: 'dark' | 'light';
}) {
  const textColor = theme === 'dark' ? '#fff' : '#000';
  const borderColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  
  return (
    <div style={{ marginBottom: '20px', borderBottom: `1px solid ${borderColor}`, paddingBottom: '10px' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '10px',
          background: 'transparent',
          color: textColor,
          border: 'none',
          borderBottom: `1px solid ${borderColor}`,
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 'bold',
          textAlign: 'left',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: isExpanded ? '15px' : '0'
        }}
      >
        {title}
        <span style={{ fontSize: '12px' }}>{isExpanded ? '▼' : '▶'}</span>
      </button>
      {isExpanded && (
        <div style={{ paddingLeft: '10px' }}>
          {children}
        </div>
      )}
    </div>
  );
}

export function ShapeTestLab() {
  // Use lazy initialization to load ALL settings ONLY on first mount
  const [allSettings] = useState<AllShapeSettings>(() => {
    const saved = localStorage.getItem('shapeTestLabAllSettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (DEBUG_MODE) {
          console.log('🚀 COMPONENT MOUNTING - Loading complete settings:', {
            allSettings: parsed,
            timestamp: new Date().toISOString()
          });
        }
        return parsed;
      } catch (e) {
        // Fall back to default settings
      }
    }
    // Default settings structure
    return {
      currentShape: 'tensor' as keyof typeof SHAPES,
      globalSettings: {
        showEdges: true,
        showGrid: true,
        showStats: true,
        pointSize: 1.0,
        pointSizeVariation: 0.5,
        pointColor: DEFAULT_THEME_COLORS.pointColor,
        pointOpacity: 0.9,
        edgeColor: DEFAULT_THEME_COLORS.edgeColor,
        edgeOpacity: 0.5,
        edgeStyle: 'solid' as const,
        autoRotate: true,
        rotationSpeed: 0.5,
        theme: 'dark' as const,
        brownianMotion: false,
        brownianAmplitude: 0.1,
        brownianSpeed: 1.0
      },
      shapeSpecific: {}
    };
  });
  
  // Current shape state
  const [selectedShape, setSelectedShape] = useState<keyof typeof SHAPES>(allSettings.currentShape);
  
  // Shape-specific settings state
  const [shapeSpecificSettings, setShapeSpecificSettings] = useState(allSettings.shapeSpecific);
  
  // Get point count for current shape
  const pointCount = shapeSpecificSettings[selectedShape]?.pointCount || 1000;
  
  // Custom setter that updates shape-specific settings
  const setPointCount = (count: number) => {
    setShapeSpecificSettings(prev => ({
      ...prev,
      [selectedShape]: {
        ...prev[selectedShape],
        pointCount: count
      }
    }));
    if (DEBUG_MODE) {
      console.log(`📐 Point count for ${selectedShape} set to ${count}`);
    }
  };
  // Global settings that apply to all shapes
  const [showEdges, setShowEdges] = useState(allSettings.globalSettings.showEdges);
  const [showGrid, setShowGrid] = useState(allSettings.globalSettings.showGrid);
  const [showStats, setShowStats] = useState(allSettings.globalSettings.showStats);
  const [pointSize, setPointSize] = useState(allSettings.globalSettings.pointSize);
  const [pointSizeVariation, setPointSizeVariation] = useState(allSettings.globalSettings.pointSizeVariation);
  const [pointColorTheme, setPointColorTheme] = useState<ThemeColor>(allSettings.globalSettings.pointColor);
  const [pointOpacity, setPointOpacity] = useState(allSettings.globalSettings.pointOpacity);
  const [edgeColorTheme, setEdgeColorTheme] = useState<ThemeColor>(allSettings.globalSettings.edgeColor);
  const [edgeOpacity, setEdgeOpacity] = useState(allSettings.globalSettings.edgeOpacity);
  const [edgeStyle, setEdgeStyle] = useState<'solid' | 'dashed' | 'dotted'>(allSettings.globalSettings.edgeStyle || 'solid');
  const [autoRotate, setAutoRotate] = useState(allSettings.globalSettings.autoRotate);
  const [rotationSpeed, setRotationSpeed] = useState(allSettings.globalSettings.rotationSpeed);
  const [theme, setTheme] = useState<'dark' | 'light'>(allSettings.globalSettings.theme);
  const [brownianMotion, setBrownianMotion] = useState(allSettings.globalSettings.brownianMotion);
  const [brownianAmplitude, setBrownianAmplitude] = useState(allSettings.globalSettings.brownianAmplitude);
  const [brownianSpeed, setBrownianSpeed] = useState(allSettings.globalSettings.brownianSpeed || 1.0);
  const [regenerateKey, setRegenerateKey] = useState(0);
  const [savedPresets, setSavedPresets] = useState<Record<string, ShapeSettings>>({});
  
  // Get actual colors based on current theme
  const pointColor = getThemeColor(pointColorTheme, theme);
  const edgeColor = getThemeColor(edgeColorTheme, theme);
  
  // Theme-based colors
  const backgroundColor = theme === 'dark' ? '#1a1a2e' : '#f0f0f0';
  const panelBackground = theme === 'dark' ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)';
  const textColor = theme === 'dark' ? '#fff' : '#000';
  const inputBackground = theme === 'dark' ? '#333' : '#fff';
  const inputBorder = theme === 'dark' ? '#555' : '#ccc';
  const gridColor = theme === 'dark' ? '#444' : '#bbb';
  const gridSectionColor = theme === 'dark' ? '#666' : '#999';
  
  // Generate shape - include selectedShape in dependencies to trigger re-render
  const currentShape = useMemo(() => {
    if (DEBUG_MODE) {
      console.log('🔄 GENERATING NEW SHAPE:', {
        shapeType: selectedShape,
        requestedPointCount: pointCount,
        timestamp: new Date().toISOString()
      });
    }
    
    const shape = SHAPES[selectedShape].generator(pointCount);
    
    // Normalize shape to standard viewport size
    const TARGET_SIZE = 10; // Standard size for all shapes
    
    // First center the shape
    const { centered, center } = centerPositions(shape.positions);
    
    // Get bounds of centered shape
    const bounds = getBounds(centered);
    const maxDim = Math.max(...bounds.size);
    
    if (DEBUG_MODE) {
      console.log('📊 Shape normalization:', {
        shape: selectedShape,
        actualPointsGenerated: shape.positions.length,
        requestedPoints: pointCount,
        edgeCount: shape.edges?.length || 0,
        originalBounds: bounds,
        maxDimension: maxDim,
        scaleFactor: maxDim > 0 ? TARGET_SIZE / maxDim : 1
      });
    }
    
    // Scale to target size if needed
    let normalizedPositions = centered;
    if (maxDim > 0) {
      const scaleFactor = TARGET_SIZE / maxDim;
      normalizedPositions = centered.map(p => [
        p[0] * scaleFactor,
        p[1] * scaleFactor,
        p[2] * scaleFactor
      ] as Vec3);
    }
    
    const finalShape = {
      ...shape,
      positions: normalizedPositions
    };
    
    if (DEBUG_MODE) {
      console.log('✅ SHAPE READY FOR RENDER:', {
        id: finalShape.id,
        finalPointCount: finalShape.positions.length,
        hasEdges: !!finalShape.edges,
        edgeCount: finalShape.edges?.length || 0
      });
    }
    
    return finalShape;
  }, [selectedShape, pointCount, regenerateKey]);
  
  const handleRegenerate = () => {
    setRegenerateKey(prev => prev + 1);
  };
  
  // ═══════════════════════════════════════════════════════════════
  // SETTINGS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════
  
  // Get current settings - defined as a callback to avoid stale closures
  // NOTE: We exclude selectedShape AND pointCount from persistent settings
  // Point counts are stored per-shape
  const getCurrentSettings = useCallback((): Omit<ShapeSettings, 'selectedShape' | 'pointCount'> => ({
    showEdges,
    showGrid,
    showStats,
    pointSize,
    pointSizeVariation,
    pointColor: pointColorTheme,
    pointOpacity,
    edgeColor: edgeColorTheme,
    edgeOpacity,
    edgeStyle,
    autoRotate,
    rotationSpeed,
    theme,
    brownianMotion,
    brownianAmplitude,
    brownianSpeed
  }), [
    showEdges, showGrid, showStats,
    pointSize, pointSizeVariation, pointColorTheme, pointOpacity,
    edgeColorTheme, edgeOpacity, edgeStyle, autoRotate, rotationSpeed,
    theme, brownianMotion, brownianAmplitude, brownianSpeed
  ]);
  
  // Apply settings
  const applySettings = (settings: Partial<ShapeSettings>) => {
    if (settings.selectedShape !== undefined) {
      setSelectedShape(settings.selectedShape);
    }
    if (settings.pointCount !== undefined) {
      setPointCount(settings.pointCount);
    }
    if (settings.showEdges !== undefined) {
      setShowEdges(settings.showEdges);
    }
    if (settings.showGrid !== undefined) {
      setShowGrid(settings.showGrid);
    }
    if (settings.showStats !== undefined) {
      setShowStats(settings.showStats);
    }
    if (settings.pointSize !== undefined) {
      setPointSize(settings.pointSize);
    }
    if (settings.pointSizeVariation !== undefined) {
      setPointSizeVariation(settings.pointSizeVariation);
    }
    
    // Handle both legacy string colors and new ThemeColor objects
    if (settings.pointColor !== undefined) {
      if (typeof settings.pointColor === 'string') {
        setPointColorTheme(createThemeColor(settings.pointColor));
      } else {
        setPointColorTheme(settings.pointColor);
      }
    }
    
    if (settings.pointOpacity !== undefined) {
      setPointOpacity(settings.pointOpacity);
    }
    
    // Handle both legacy string colors and new ThemeColor objects
    if (settings.edgeColor !== undefined) {
      if (typeof settings.edgeColor === 'string') {
        setEdgeColorTheme(createThemeColor(settings.edgeColor));
      } else {
        setEdgeColorTheme(settings.edgeColor);
      }
    }
    
    if (settings.edgeOpacity !== undefined) {
      setEdgeOpacity(settings.edgeOpacity);
    }
    if (settings.edgeStyle !== undefined) {
      setEdgeStyle(settings.edgeStyle);
    }
    if (settings.autoRotate !== undefined) {
      setAutoRotate(settings.autoRotate);
    }
    if (settings.rotationSpeed !== undefined) {
      setRotationSpeed(settings.rotationSpeed);
    }
    if (settings.theme !== undefined) {
      setTheme(settings.theme);
    }
    if (settings.brownianMotion !== undefined) {
      setBrownianMotion(settings.brownianMotion);
    }
    if (settings.brownianAmplitude !== undefined) {
      setBrownianAmplitude(settings.brownianAmplitude);
    }
    if (settings.brownianSpeed !== undefined) {
      setBrownianSpeed(settings.brownianSpeed);
    }
  };
  
  // Export complete settings as JSON
  const exportSettings = () => {
    const completeSettings: AllShapeSettings = {
      currentShape: selectedShape,
      globalSettings: {
        showEdges,
        showGrid,
        showStats,
        pointSize,
        pointSizeVariation,
        pointColor: pointColorTheme,
        pointOpacity,
        edgeColor: edgeColorTheme,
        edgeOpacity,
        edgeStyle,
        autoRotate,
        rotationSpeed,
        theme,
        brownianMotion,
        brownianAmplitude,
        brownianSpeed
      },
      shapeSpecific: shapeSpecificSettings
    };
    const json = JSON.stringify(completeSettings, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shape-settings-${selectedShape}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // Import settings from JSON
  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string) as AllShapeSettings;
        
        // Apply global settings
        if (imported.globalSettings) {
          setShowEdges(imported.globalSettings.showEdges);
          setShowGrid(imported.globalSettings.showGrid);
          setShowStats(imported.globalSettings.showStats);
          setPointSize(imported.globalSettings.pointSize);
          setPointSizeVariation(imported.globalSettings.pointSizeVariation);
          setPointColorTheme(imported.globalSettings.pointColor);
          setPointOpacity(imported.globalSettings.pointOpacity);
          setEdgeColorTheme(imported.globalSettings.edgeColor);
          setEdgeOpacity(imported.globalSettings.edgeOpacity);
          if (imported.globalSettings.edgeStyle) {
            setEdgeStyle(imported.globalSettings.edgeStyle);
          }
          setAutoRotate(imported.globalSettings.autoRotate);
          setRotationSpeed(imported.globalSettings.rotationSpeed);
          setTheme(imported.globalSettings.theme);
          setBrownianMotion(imported.globalSettings.brownianMotion);
          setBrownianAmplitude(imported.globalSettings.brownianAmplitude);
          setBrownianSpeed(imported.globalSettings.brownianSpeed || 1.0);
        }
        
        // Apply shape-specific settings
        if (imported.shapeSpecific) {
          setShapeSpecificSettings(imported.shapeSpecific);
        }
        
        // Set current shape
        if (imported.currentShape) {
          setSelectedShape(imported.currentShape);
        }
        
        if (DEBUG_MODE) {
          console.log('📥 Settings imported successfully:', imported);
        }
      } catch (error) {
        console.error('Failed to import settings:', error);
        alert('Failed to import settings. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };
  
  // Load saved presets from localStorage
  useEffect(() => {
    const savedPresetsData = localStorage.getItem('shapeTestLabPresets');
    if (savedPresetsData) {
      try {
        setSavedPresets(JSON.parse(savedPresetsData));
      } catch (error) {
        console.error('Failed to load presets:', error);
      }
    }
  }, []);
  
  // Apply theme to document body
  useEffect(() => {
    if (theme === 'dark') {
      document.body.style.backgroundColor = '#0a0a0a';
      document.body.style.color = '#ffffff';
    } else {
      document.body.style.backgroundColor = '#ffffff';  
      document.body.style.color = '#000000';
    }
  }, [theme]);
  
  // Auto-save ALL settings to localStorage whenever ANY setting changes
  useEffect(() => {
    const completeSettings: AllShapeSettings = {
      currentShape: selectedShape,
      globalSettings: {
        showEdges,
        showGrid,
        showStats,
        pointSize,
        pointSizeVariation,
        pointColor: pointColorTheme,
        pointOpacity,
        edgeColor: edgeColorTheme,
        edgeOpacity,
        edgeStyle,
        autoRotate,
        rotationSpeed,
        theme,
        brownianMotion,
        brownianAmplitude,
        brownianSpeed
      },
      shapeSpecific: shapeSpecificSettings
    };
    
    localStorage.setItem('shapeTestLabAllSettings', JSON.stringify(completeSettings));
    if (DEBUG_MODE) {
      console.log('💾 Complete settings saved:', {
        currentShape: selectedShape,
        globalSettings: completeSettings.globalSettings,
        shapeSpecificCounts: Object.fromEntries(
          Object.entries(shapeSpecificSettings).map(([shape, settings]) => 
            [shape, settings?.pointCount]
          )
        ),
        timestamp: new Date().toISOString()
      });
    }
  }, [
    selectedShape, shapeSpecificSettings,
    showEdges, showGrid, showStats,
    pointSize, pointSizeVariation, pointColorTheme, pointOpacity,
    edgeColorTheme, edgeOpacity, edgeStyle, autoRotate, rotationSpeed,
    theme, brownianMotion, brownianAmplitude, brownianSpeed
  ]);
  
  // Save preset (includes selectedShape for presets)
  const savePreset = (name: string) => {
    const settings = { selectedShape, ...getCurrentSettings() } as ShapeSettings;
    const newPresets = { ...savedPresets, [name]: settings };
    setSavedPresets(newPresets);
    localStorage.setItem('shapeTestLabPresets', JSON.stringify(newPresets));
  };
  
  // Load preset
  const loadPreset = (name: string) => {
    const preset = savedPresets[name];
    if (preset) {
      applySettings(preset);
    }
  };
  
  // Delete preset
  const deletePreset = (name: string) => {
    const newPresets = { ...savedPresets };
    delete newPresets[name];
    setSavedPresets(newPresets);
    localStorage.setItem('shapeTestLabPresets', JSON.stringify(newPresets));
  };
  
  const [panelWidth, setPanelWidth] = useState(380);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);
  
  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    shape: true,
    appearance: true,
    animation: false,
    camera: false,
    settings: false
  });
  
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = panelWidth;
    e.preventDefault();
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      
      const deltaX = e.clientX - dragStartX.current;
      const newWidth = Math.max(280, Math.min(1200, dragStartWidth.current + deltaX));
      setPanelWidth(newWidth);
    };
    
    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = 'auto';
        document.body.style.userSelect = 'auto';
      }
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);
  
  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', position: 'relative' }}>
      {/* Control Panel */}
      <div style={{
        width: `${panelWidth}px`,
        minWidth: `${panelWidth}px`,
        maxWidth: `${panelWidth}px`,
        height: '100vh',
        background: panelBackground,
        padding: '20px',
        overflowY: 'auto',
        borderRight: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
        color: textColor,
        position: 'relative',
        flexShrink: 0
      }}>
        {/* Resize Handle */}
        <div
          onMouseDown={handleMouseDown}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = theme === 'dark' ? 'rgba(100, 100, 255, 0.5)' : 'rgba(100, 100, 255, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)';
          }}
          style={{
            position: 'absolute',
            right: -4,
            top: 0,
            width: '8px',
            height: '100%',
            cursor: 'col-resize',
            background: theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
            transition: 'background 0.2s',
            zIndex: 1000
          }}
        />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: textColor, fontSize: '24px', margin: 0 }}>
            Shape Testing Lab
          </h2>
        </div>
        
        {/* Shape Selection Section */}
        <CollapsibleSection
          title="Shape Selection"
          isExpanded={expandedSections.shape}
          onToggle={() => setExpandedSections(prev => ({ ...prev, shape: !prev.shape }))}
          theme={theme}
        >
          {/* Shape Selection */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: textColor, display: 'block', marginBottom: '8px' }}>
              Shape Type
            </label>
            <select
              value={selectedShape}
              onChange={(e) => {
                const newShape = e.target.value as keyof typeof SHAPES;
                if (DEBUG_MODE) {
                  console.log('🔀 SHAPE SELECTION CHANGED:', {
                    from: selectedShape,
                    to: newShape,
                    currentPointSize: pointSize,
                    currentPointCount: pointCount,
                    currentPointColor: pointColorTheme,
                    willTheseSettingsPersist: 'YES - settings should remain the same',
                    currentSettings: getCurrentSettings()
                  });
                }
                setSelectedShape(newShape);
              }}
              style={{
                width: '100%',
                padding: '8px',
                background: inputBackground,
                color: textColor,
                border: `1px solid ${inputBorder}`,
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              {Object.entries(SHAPES).map(([key, config]) => (
                <option key={key} value={key}>{config.name}</option>
              ))}
            </select>
          </div>
          
          {/* Equation Display */}
          <div style={{
            marginBottom: '20px',
            padding: '12px',
            background: 'rgba(100, 100, 255, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(100, 100, 255, 0.3)'
          }}>
            <div style={{ color: '#aaa', fontSize: '12px', marginBottom: '4px' }}>
              Mathematical Form:
            </div>
            <div style={{ 
              color: '#fff', 
              fontSize: '18px', 
              fontFamily: 'monospace',
              textAlign: 'center'
            }}>
              {SHAPES[selectedShape].equation}
            </div>
          </div>
          
          {/* Shape Info */}
          <div style={{ marginBottom: '20px', color: '#aaa', fontSize: '12px' }}>
            <div>Rendered Points: {currentShape.positions.length}</div>
            {currentShape.positions.length !== pointCount && (
              <div style={{ color: '#ffaa00', fontSize: '11px' }}>
                (Requested: {pointCount}, shape uses {currentShape.positions.length})
              </div>
            )}
            <div>Edges: {currentShape.edges?.length || 0}</div>
            <div>Complexity: {(currentShape.metadata.complexity * 100).toFixed(0)}%</div>
          </div>
          
          {/* Point Count */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ color: textColor, display: 'block', marginBottom: '4px', fontSize: '14px' }}>
              Point Count: {pointCount}
            </label>
            <input
              type="range"
              min="100"
              max="3000"
              step="100"
              value={pointCount}
              onChange={(e) => {
                const newCount = Number(e.target.value);
                if (DEBUG_MODE) {
                  console.log('📈 Point count changed:', { from: pointCount, to: newCount });
                }
                setPointCount(newCount);
              }}
              style={{ width: '100%' }}
            />
          </div>
          
          {/* Regenerate Button */}
          <button
            onClick={handleRegenerate}
            style={{
              width: '100%',
              padding: '10px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Regenerate Shape
          </button>
        </CollapsibleSection>

        {/* Appearance Section */}
        <CollapsibleSection
          title="Appearance"
          isExpanded={expandedSections.appearance}
          onToggle={() => setExpandedSections(prev => ({ ...prev, appearance: !prev.appearance }))}
          theme={theme}
        >
          {/* Theme Toggle */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ color: textColor, display: 'block', marginBottom: '8px', fontSize: '14px' }}>
              Theme
            </label>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: theme === 'dark' ? '#444' : '#ddd',
                color: textColor,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              {theme === 'dark' ? '☀️ Switch to Light' : '🌙 Switch to Dark'}
            </button>
          </div>

          {/* Point Settings */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ color: textColor, display: 'block', marginBottom: '4px', fontSize: '14px' }}>
              Point Size: {pointSize.toFixed(2)}
            </label>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.01"
              value={pointSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                if (DEBUG_MODE) {
                  console.log('📏 Point size changed:', { from: pointSize, to: newSize });
                }
                setPointSize(newSize);
              }}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#888', marginTop: '2px' }}>
              <span>0.1</span>
              <span>0.5</span>
              <span>1.0</span>
              <span>1.5</span>
              <span>2.0</span>
            </div>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ color: textColor, display: 'block', marginBottom: '4px', fontSize: '14px' }}>
              Size Variation: {(pointSizeVariation * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0"
              max="10"
              step="0.1"
              value={pointSizeVariation}
              onChange={(e) => setPointSizeVariation(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ color: textColor, display: 'block', marginBottom: '4px', fontSize: '14px' }}>
              Point Color
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ color: textColor, fontSize: '12px' }}>Dark</label>
                <input
                  type="color"
                  value={pointColorTheme.dark}
                  onChange={(e) => setPointColorTheme({ ...pointColorTheme, dark: e.target.value })}
                  style={{ width: '100%', height: '30px' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ color: textColor, fontSize: '12px' }}>
                  Light {pointColorTheme.light ? '' : '(auto)'}
                </label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input
                    type="color"
                    value={pointColorTheme.light || darkToLight(pointColorTheme.dark)}
                    onChange={(e) => setPointColorTheme({ ...pointColorTheme, light: e.target.value })}
                    style={{ flex: 1, height: '30px' }}
                  />
                  {pointColorTheme.light && (
                    <button
                      onClick={() => setPointColorTheme({ ...pointColorTheme, light: undefined })}
                      style={{
                        padding: '0 8px',
                        background: '#ff4a4a',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                      title="Use automatic light color"
                    >
                      Auto
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
              Current: {pointColor}
            </div>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ color: textColor, display: 'block', marginBottom: '4px', fontSize: '14px' }}>
              Point Opacity: {(pointOpacity * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={pointOpacity}
              onChange={(e) => setPointOpacity(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          {/* Edge Settings */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ color: textColor, display: 'flex', alignItems: 'center', fontSize: '14px' }}>
              <input
                type="checkbox"
                checked={showEdges}
                onChange={(e) => setShowEdges(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Show Edges
            </label>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ color: textColor, display: 'block', marginBottom: '4px', fontSize: '14px' }}>
              Edge Color
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ color: textColor, fontSize: '12px' }}>Dark</label>
                <input
                  type="color"
                  value={edgeColorTheme.dark}
                  onChange={(e) => setEdgeColorTheme({ ...edgeColorTheme, dark: e.target.value })}
                  style={{ width: '100%', height: '30px' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ color: textColor, fontSize: '12px' }}>
                  Light {edgeColorTheme.light ? '' : '(auto)'}
                </label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input
                    type="color"
                    value={edgeColorTheme.light || darkToLight(edgeColorTheme.dark)}
                    onChange={(e) => setEdgeColorTheme({ ...edgeColorTheme, light: e.target.value })}
                    style={{ flex: 1, height: '30px' }}
                  />
                  {edgeColorTheme.light && (
                    <button
                      onClick={() => setEdgeColorTheme({ ...edgeColorTheme, light: undefined })}
                      style={{
                        padding: '0 8px',
                        background: '#ff4a4a',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                      title="Use automatic light color"
                    >
                      Auto
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>
              Current: {edgeColor}
            </div>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ color: textColor, display: 'block', marginBottom: '4px', fontSize: '14px' }}>
              Edge Opacity: {(edgeOpacity * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={edgeOpacity}
              onChange={(e) => setEdgeOpacity(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ color: textColor, display: 'block', marginBottom: '4px', fontSize: '14px' }}>
              Edge Style
            </label>
            <select
              value={edgeStyle}
              onChange={(e) => {
                const newStyle = e.target.value as 'solid' | 'dashed' | 'dotted';
                if (DEBUG_MODE) {
                  console.log('📐 Edge style changed:', { from: edgeStyle, to: newStyle });
                }
                setEdgeStyle(newStyle);
              }}
              style={{
                width: '100%',
                padding: '6px',
                background: inputBackground,
                color: textColor,
                border: `1px solid ${inputBorder}`,
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
          </div>

          {/* Grid and Stats */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ color: textColor, display: 'flex', alignItems: 'center', fontSize: '14px' }}>
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Show Grid
            </label>
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ color: textColor, display: 'flex', alignItems: 'center', fontSize: '14px' }}>
              <input
                type="checkbox"
                checked={showStats}
                onChange={(e) => setShowStats(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Show Stats
            </label>
          </div>
        </CollapsibleSection>

        {/* Animation Section */}
        <CollapsibleSection
          title="Animation"
          isExpanded={expandedSections.animation}
          onToggle={() => setExpandedSections(prev => ({ ...prev, animation: !prev.animation }))}
          theme={theme}
        >
          {/* Auto Rotate */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ color: textColor, display: 'flex', alignItems: 'center', fontSize: '14px' }}>
              <input
                type="checkbox"
                checked={autoRotate}
                onChange={(e) => setAutoRotate(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Auto Rotate
            </label>
          </div>
          
          {autoRotate && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ color: textColor, display: 'block', marginBottom: '4px', fontSize: '14px' }}>
                Rotation Speed: {rotationSpeed.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.1"
                value={rotationSpeed}
                onChange={(e) => setRotationSpeed(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          )}
          
          {/* Brownian Motion */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ color: textColor, display: 'flex', alignItems: 'center', fontSize: '14px' }}>
              <input
                type="checkbox"
                checked={brownianMotion}
                onChange={(e) => setBrownianMotion(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Brownian Motion
            </label>
          </div>
          
          {brownianMotion && (
            <>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ color: textColor, display: 'block', marginBottom: '4px', fontSize: '14px' }}>
                  Motion Amplitude (max: 0.5)
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="number"
                    min="0"
                    max="0.5"
                    step="0.001"
                    value={brownianAmplitude}
                    onChange={(e) => {
                      const val = Math.min(0.5, Math.max(0, Number(e.target.value)));
                      setBrownianAmplitude(val);
                    }}
                    style={{
                      width: '80px',
                      padding: '4px',
                      background: inputBackground,
                      color: textColor,
                      border: `1px solid ${inputBorder}`,
                      borderRadius: '4px'
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', color: '#888' }}>
                      Fine-tune: {brownianAmplitude.toFixed(3)}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="0.5"
                      step="0.001"
                      value={brownianAmplitude}
                      onChange={(e) => {
                        setBrownianAmplitude(Number(e.target.value));
                      }}
                      style={{ width: '100%' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#888' }}>
                      <span>0</span>
                      <span>0.25</span>
                      <span>0.5</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <label style={{ color: textColor, display: 'block', marginBottom: '4px', fontSize: '14px' }}>
                  Update Speed (Hz)
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="number"
                    min="0.1"
                    max="60"
                    step="0.1"
                    value={brownianSpeed}
                    onChange={(e) => {
                      const val = Math.min(60, Math.max(0.1, Number(e.target.value)));
                      setBrownianSpeed(val);
                    }}
                    style={{
                      width: '80px',
                      padding: '4px',
                      background: inputBackground,
                      color: textColor,
                      border: `1px solid ${inputBorder}`,
                      borderRadius: '4px'
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', color: '#888' }}>
                      Updates per second: {brownianSpeed.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="60"
                      step="0.1"
                      value={brownianSpeed}
                      onChange={(e) => {
                        setBrownianSpeed(Number(e.target.value));
                      }}
                      style={{ width: '100%' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#888' }}>
                      <span>0.1</span>
                      <span>30</span>
                      <span>60</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </CollapsibleSection>

        {/* Camera Section */}
        <CollapsibleSection
          title="Camera"
          isExpanded={expandedSections.camera}
          onToggle={() => setExpandedSections(prev => ({ ...prev, camera: !prev.camera }))}
          theme={theme}
        >
          <div style={{ color: textColor, fontSize: '14px', marginBottom: '10px' }}>
            Camera controls are managed by the 3D viewport:
          </div>
          <ul style={{ color: '#aaa', fontSize: '12px', marginLeft: '20px', marginBottom: '15px' }}>
            <li>Left mouse: Rotate</li>
            <li>Right mouse: Pan</li>
            <li>Mouse wheel: Zoom</li>
          </ul>
          <div style={{ fontSize: '12px', color: '#888' }}>
            Reset camera position by refreshing the page or reloading the shape.
          </div>
        </CollapsibleSection>

        {/* Settings Management Section */}
        <CollapsibleSection
          title="Settings Management"
          isExpanded={expandedSections.settings}
          onToggle={() => setExpandedSections(prev => ({ ...prev, settings: !prev.settings }))}
          theme={theme}
        >
          {/* Export/Import/Clear Row */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <button
              onClick={exportSettings}
              style={{
                flex: 1,
                padding: '8px',
                background: theme === 'dark' ? '#444' : '#ddd',
                color: textColor,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Export
            </button>
            <label style={{
              flex: 1,
              padding: '8px',
              background: theme === 'dark' ? '#444' : '#ddd',
              color: textColor,
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              textAlign: 'center'
            }}>
              Import
              <input
                type="file"
                accept=".json"
                onChange={importSettings}
                style={{ display: 'none' }}
              />
            </label>
            <button
              onClick={() => {
                localStorage.removeItem('shapeTestLabCurrentSettings');
                window.location.reload();
              }}
              style={{
                flex: 1,
                padding: '8px',
                background: '#ff4a4a',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
              title="Reset all settings to defaults"
            >
              Reset
            </button>
          </div>
          
          {/* Save Preset */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ color: textColor, display: 'block', marginBottom: '8px', fontSize: '14px' }}>
              Save as Preset
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Preset name..."
                id="preset-name-input"
                style={{
                  flex: 1,
                  padding: '8px',
                  background: inputBackground,
                  color: textColor,
                  border: `1px solid ${inputBorder}`,
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
              <button
                onClick={() => {
                  const input = document.getElementById('preset-name-input') as HTMLInputElement;
                  if (input?.value) {
                    savePreset(input.value);
                    input.value = '';
                  }
                }}
                style={{
                  padding: '8px 16px',
                  background: '#4a9eff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Save
              </button>
            </div>
          </div>
          
          {/* Load Preset */}
          {Object.keys(savedPresets).length > 0 && (
            <div>
              <label style={{ color: textColor, display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                Load Preset
              </label>
              <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                {Object.keys(savedPresets).map(name => (
                  <div
                    key={name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px',
                      marginBottom: '4px',
                      background: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                      borderRadius: '4px'
                    }}
                  >
                    <span style={{ color: textColor, fontSize: '14px', flex: 1 }}>{name}</span>
                    <button
                      onClick={() => loadPreset(name)}
                      style={{
                        padding: '4px 12px',
                        marginLeft: '8px',
                        background: '#4a9eff',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Load
                    </button>
                    <button
                      onClick={() => deletePreset(name)}
                      style={{
                        padding: '4px 12px',
                        marginLeft: '4px',
                        background: '#ff4a4a',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CollapsibleSection>
      </div>
      
      {/* 3D Viewport */}
      <div style={{ flex: 1, position: 'relative' }}>
        <style>{`
          .stats-panel {
            position: absolute !important;
            top: 10px !important;
            right: 10px !important;
            left: auto !important;
          }
        `}</style>
        <Canvas
          camera={{ position: [15, 10, 15], fov: 60 }}
          style={{ background: backgroundColor }}
        >
          <Suspense fallback={null}>
            {/* Lighting */}
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            <pointLight position={[-10, -10, -10]} intensity={0.5} />
            
            {/* Shape - key includes shape ID and point count to force re-creation only when necessary */}
            <ShapeVisualizer
              key={`${currentShape.id}-${currentShape.positions.length}-${regenerateKey}`}
              shape={currentShape}
              showEdges={showEdges}
              pointSize={pointSize}
              pointSizeVariation={pointSizeVariation}
              pointColor={pointColor}
              pointOpacity={pointOpacity}
              edgeColor={edgeColor}
              edgeOpacity={edgeOpacity}
              edgeStyle={edgeStyle}
              autoRotate={autoRotate}
              rotationSpeed={rotationSpeed}
              brownianMotion={brownianMotion}
              brownianAmplitude={brownianAmplitude}
              brownianSpeed={brownianSpeed}
            />
            
            {/* Grid */}
            {showGrid && (
              <Grid
                args={[30, 30]}
                cellSize={1}
                cellThickness={0.5}
                cellColor={gridColor}
                sectionSize={5}
                sectionThickness={1}
                sectionColor={gridSectionColor}
                fadeDistance={50}
                fadeStrength={1}
                followCamera={false}
                infiniteGrid={true}
              />
            )}
            
            {/* Controls */}
            <OrbitControls
              enableDamping
              dampingFactor={0.05}
              rotateSpeed={0.5}
              zoomSpeed={1}
              panSpeed={0.5}
            />
            
            {/* Stats - positioned in top-right corner */}
            {showStats && <Stats className="stats-panel" />}
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}