import React, { useState, useRef, Suspense, useMemo, useEffect } from 'react';
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
import { 
  createBrownianState, 
  updateBrownianMotion, 
  applyBrownianToPositions,
  BROWNIAN_PRESETS,
  type BrownianState
} from '../animation/utils/brownian';

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
  autoRotate: boolean;
  rotationSpeed: number;
  brownianMotion: boolean;
  brownianPreset: string;
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
  autoRotate,
  rotationSpeed,
  brownianMotion,
  brownianPreset
}: ShapeVisualizerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const edgesRef = useRef<THREE.LineSegments>(null);
  
  // Initialize Brownian motion state
  const brownianState = useRef<BrownianState>(createBrownianState(shape.positions.length));
  const originalPositions = useRef<Vec3[]>(shape.positions);
  
  // Generate random sizes for each point
  const pointSizes = useMemo(() => {
    const sizes = new Float32Array(shape.positions.length);
    for (let i = 0; i < shape.positions.length; i++) {
      // Random size between pointSize and pointSize * (1 + variation)
      sizes[i] = pointSize * (1 + Math.random() * pointSizeVariation);
    }
    return sizes;
  }, [shape.positions.length, pointSize, pointSizeVariation]);
  
  // Auto-rotation and Brownian motion update
  useFrame((state, delta) => {
    // Rotation
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += rotationSpeed * delta;
    }
    
    // Brownian motion
    if (brownianMotion && pointsRef.current) {
      const preset = BROWNIAN_PRESETS[brownianPreset] || BROWNIAN_PRESETS.standard;
      updateBrownianMotion(brownianState.current, preset, delta * 1000);
      
      // Apply Brownian offsets to positions
      const newPositions = applyBrownianToPositions(originalPositions.current, brownianState.current);
      const posArray = new Float32Array(newPositions.flat());
      pointsRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
      
      // Update edges if visible
      if (showEdges && edgesRef.current && shape.edges) {
        const edgePositions: number[] = [];
        shape.edges.forEach(([a, b]) => {
          if (a < newPositions.length && b < newPositions.length) {
            edgePositions.push(...newPositions[a], ...newPositions[b]);
          }
        });
        edgesRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(edgePositions), 3));
      }
    } else if (!brownianMotion && pointsRef.current) {
      // Reset to original positions if Brownian is disabled
      const posArray = new Float32Array(originalPositions.current.flat());
      pointsRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
      
      // Reset edges too
      if (showEdges && edgesRef.current && shape.edges) {
        const edgePositions: number[] = [];
        shape.edges.forEach(([a, b]) => {
          if (a < originalPositions.current.length && b < originalPositions.current.length) {
            edgePositions.push(...originalPositions.current[a], ...originalPositions.current[b]);
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
          gl_PointSize = size * (300.0 / -mvPosition.z);
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
          float alpha = 1.0 - smoothstep(0.3, 0.5, r);
          gl_FragColor = vec4(color, alpha * opacity);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
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
      {showEdges && edgesGeometry && (
        <lineSegments ref={edgesRef} geometry={edgesGeometry}>
          <lineBasicMaterial 
            color={edgeColor} 
            transparent={true}
            opacity={0.5}
            linewidth={1}
          />
        </lineSegments>
      )}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN TEST LAB COMPONENT
// ═══════════════════════════════════════════════════════════════

export function ShapeTestLab() {
  const [selectedShape, setSelectedShape] = useState<keyof typeof SHAPES>('tensor');
  const [pointCount, setPointCount] = useState(1000);
  const [showEdges, setShowEdges] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showStats, setShowStats] = useState(true);
  const [pointSize, setPointSize] = useState(1.0);
  const [pointSizeVariation, setPointSizeVariation] = useState(0.5);
  const [pointColor, setPointColor] = useState('#ffffff');
  const [edgeColor, setEdgeColor] = useState('#00ffff');
  const [autoRotate, setAutoRotate] = useState(true);
  const [rotationSpeed, setRotationSpeed] = useState(0.5);
  const [backgroundColor, setBackgroundColor] = useState('#1a1a2e');
  const [brownianMotion, setBrownianMotion] = useState(false);
  const [brownianPreset, setBrownianPreset] = useState('standard');
  const [regenerateKey, setRegenerateKey] = useState(0);
  
  // Generate shape
  const currentShape = useMemo(() => {
    return SHAPES[selectedShape].generator(pointCount);
  }, [selectedShape, pointCount, regenerateKey]);
  
  const handleRegenerate = () => {
    setRegenerateKey(prev => prev + 1);
  };
  
  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex' }}>
      {/* Control Panel */}
      <div style={{
        width: '320px',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.9)',
        padding: '20px',
        overflowY: 'auto',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <h2 style={{ color: '#fff', marginBottom: '20px', fontSize: '24px' }}>
          Shape Testing Lab
        </h2>
        
        {/* Shape Selection */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ color: '#fff', display: 'block', marginBottom: '8px' }}>
            Shape Type
          </label>
          <select
            value={selectedShape}
            onChange={(e) => setSelectedShape(e.target.value as keyof typeof SHAPES)}
            style={{
              width: '100%',
              padding: '8px',
              background: '#333',
              color: '#fff',
              border: '1px solid #555',
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
          <div>Points: {currentShape.positions.length}</div>
          <div>Edges: {currentShape.edges?.length || 0}</div>
          <div>Complexity: {(currentShape.metadata.complexity * 100).toFixed(0)}%</div>
        </div>
        
        {/* Controls */}
        <div style={{ marginBottom: '15px' }}>
          <label style={{ color: '#fff', display: 'block', marginBottom: '4px', fontSize: '14px' }}>
            Point Count: {pointCount}
          </label>
          <input
            type="range"
            min="100"
            max="3000"
            step="100"
            value={pointCount}
            onChange={(e) => setPointCount(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ color: '#fff', display: 'block', marginBottom: '4px', fontSize: '14px' }}>
            Point Size: {pointSize.toFixed(2)}
          </label>
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={pointSize}
            onChange={(e) => setPointSize(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ color: '#fff', display: 'block', marginBottom: '4px', fontSize: '14px' }}>
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
          <label style={{ color: '#fff', display: 'block', marginBottom: '4px', fontSize: '14px' }}>
            Point Color
          </label>
          <input
            type="color"
            value={pointColor}
            onChange={(e) => setPointColor(e.target.value)}
            style={{ width: '100%', height: '30px' }}
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ color: '#fff', display: 'block', marginBottom: '4px', fontSize: '14px' }}>
            Edge Color
          </label>
          <input
            type="color"
            value={edgeColor}
            onChange={(e) => setEdgeColor(e.target.value)}
            style={{ width: '100%', height: '30px' }}
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ color: '#fff', display: 'block', marginBottom: '4px', fontSize: '14px' }}>
            Background Color
          </label>
          <input
            type="color"
            value={backgroundColor}
            onChange={(e) => setBackgroundColor(e.target.value)}
            style={{ width: '100%', height: '30px' }}
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ color: '#fff', display: 'flex', alignItems: 'center', fontSize: '14px' }}>
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
          <label style={{ color: '#fff', display: 'flex', alignItems: 'center', fontSize: '14px' }}>
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
          <label style={{ color: '#fff', display: 'flex', alignItems: 'center', fontSize: '14px' }}>
            <input
              type="checkbox"
              checked={showStats}
              onChange={(e) => setShowStats(e.target.checked)}
              style={{ marginRight: '8px' }}
            />
            Show Stats
          </label>
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ color: '#fff', display: 'flex', alignItems: 'center', fontSize: '14px' }}>
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
            <label style={{ color: '#fff', display: 'block', marginBottom: '4px', fontSize: '14px' }}>
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
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ color: '#fff', display: 'flex', alignItems: 'center', fontSize: '14px' }}>
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
          <div style={{ marginBottom: '15px' }}>
            <label style={{ color: '#fff', display: 'block', marginBottom: '4px', fontSize: '14px' }}>
              Motion Preset
            </label>
            <select
              value={brownianPreset}
              onChange={(e) => setBrownianPreset(e.target.value)}
              style={{
                width: '100%',
                padding: '6px',
                background: '#333',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="subtle">Subtle</option>
              <option value="standard">Standard</option>
              <option value="energetic">Energetic</option>
              <option value="smooth">Smooth</option>
              <option value="chaotic">Chaotic</option>
            </select>
          </div>
        )}
        
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
            cursor: 'pointer',
            marginTop: '20px'
          }}
        >
          Regenerate Shape
        </button>
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
            
            {/* Shape */}
            <ShapeVisualizer
              shape={currentShape}
              showEdges={showEdges}
              pointSize={pointSize}
              pointSizeVariation={pointSizeVariation}
              pointColor={pointColor}
              edgeColor={edgeColor}
              autoRotate={autoRotate}
              rotationSpeed={rotationSpeed}
              brownianMotion={brownianMotion}
              brownianPreset={brownianPreset}
            />
            
            {/* Grid */}
            {showGrid && (
              <Grid
                args={[30, 30]}
                cellSize={1}
                cellThickness={0.5}
                cellColor="#444"
                sectionSize={5}
                sectionThickness={1}
                sectionColor="#666"
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