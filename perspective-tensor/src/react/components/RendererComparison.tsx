import { useEffect, useRef, useState } from 'react';
import { Canvas2DRenderer } from '../animation/renderers/Canvas2DRenderer';
import { ThreeJSRenderer } from '../animation/renderers/ThreeJSRenderer';
import type { IRenderer, RenderConfig } from '../animation/renderers/IRenderer';
import type { Vec3 } from '../animation/core/types';
import {
  generateTensor,
  generateGalaxy,
  generateWormhole,
  generateSphere,
  generateHypercube,
} from '../animation/shapes/mathematical';
import { 
  createBrownianOffsets, 
  updateBrownianMotion
} from '../animation/utils';

// Performance stats display
function StatsDisplay({ 
  fps, 
  renderTime, 
  particleCount, 
  renderer 
}: { 
  fps: number; 
  renderTime: number; 
  particleCount: number;
  renderer: string;
}) {
  const bgColor = renderer === 'WebGL' ? 'rgba(0, 255, 0, 0.1)' : 'rgba(0, 100, 255, 0.1)';
  const borderColor = renderer === 'WebGL' ? 'rgba(0, 255, 0, 0.3)' : 'rgba(0, 100, 255, 0.3)';
  
  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      left: '10px',
      padding: '15px',
      background: bgColor,
      border: `2px solid ${borderColor}`,
      borderRadius: '8px',
      color: '#fff',
      fontFamily: 'monospace',
      fontSize: '14px',
      minWidth: '200px',
      backdropFilter: 'blur(10px)',
      zIndex: 100
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '16px' }}>
        {renderer} Renderer
      </div>
      <div>FPS: <span style={{ 
        color: fps >= 55 ? '#00ff00' : fps >= 30 ? '#ffff00' : '#ff0000',
        fontWeight: 'bold' 
      }}>{fps.toFixed(1)}</span></div>
      <div>Render: {renderTime.toFixed(2)}ms</div>
      <div>Particles: {particleCount}</div>
    </div>
  );
}

// Diff Monitor Component
function DiffMonitor({ canvas2DStats, webGLStats }: { 
  canvas2DStats: { fps: number; renderTime: number };
  webGLStats: { fps: number; renderTime: number };
}) {
  const fpsDiff = webGLStats.fps - canvas2DStats.fps;
  const renderDiff = canvas2DStats.renderTime - webGLStats.renderTime; // Positive means WebGL is faster
  const speedup = canvas2DStats.renderTime > 0 ? (canvas2DStats.renderTime / webGLStats.renderTime) : 1;
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '20px',
      background: 'rgba(20, 20, 40, 0.95)',
      border: '2px solid #444',
      borderRadius: '12px',
      color: '#fff',
      fontFamily: 'monospace',
      fontSize: '14px',
      minWidth: '400px',
      backdropFilter: 'blur(20px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
      zIndex: 1000
    }}>
      <div style={{ 
        fontWeight: 'bold', 
        marginBottom: '12px', 
        fontSize: '16px',
        textAlign: 'center',
        background: 'linear-gradient(90deg, #0064ff 0%, #00ff00 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      }}>
        Performance Comparison (60-frame avg)
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        <div>
          <div style={{ color: '#888', fontSize: '12px', marginBottom: '4px' }}>FPS Difference</div>
          <div style={{ 
            fontSize: '20px',
            fontWeight: 'bold',
            color: fpsDiff > 0 ? '#00ff00' : fpsDiff < 0 ? '#ff4444' : '#888'
          }}>
            {fpsDiff > 0 ? '+' : ''}{fpsDiff.toFixed(1)} FPS
          </div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
            {fpsDiff > 0 ? 'WebGL faster' : fpsDiff < 0 ? 'Canvas2D faster' : 'Equal'}
          </div>
        </div>
        
        <div>
          <div style={{ color: '#888', fontSize: '12px', marginBottom: '4px' }}>Render Speed</div>
          <div style={{ 
            fontSize: '20px',
            fontWeight: 'bold',
            color: speedup > 1.1 ? '#00ff00' : speedup < 0.9 ? '#ff4444' : '#888'
          }}>
            {speedup.toFixed(2)}x
          </div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
            {speedup > 1.1 ? 'WebGL faster' : speedup < 0.9 ? 'Canvas2D faster' : 'Similar'}
          </div>
        </div>
      </div>
      
      <div style={{ 
        marginTop: '15px', 
        paddingTop: '15px', 
        borderTop: '1px solid #333',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '10px',
        fontSize: '12px'
      }}>
        <div>
          <div style={{ color: '#0064ff' }}>Canvas2D</div>
          <div>{canvas2DStats.fps.toFixed(1)} FPS</div>
          <div>{canvas2DStats.renderTime.toFixed(2)}ms</div>
        </div>
        <div style={{ textAlign: 'center', color: '#666' }}>
          <div>vs</div>
          <div style={{ fontSize: '10px' }}>
            {renderDiff > 0 ? `${renderDiff.toFixed(2)}ms saved` : ''}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#00ff00' }}>WebGL</div>
          <div>{webGLStats.fps.toFixed(1)} FPS</div>
          <div>{webGLStats.renderTime.toFixed(2)}ms</div>
        </div>
      </div>
    </div>
  );
}

// Individual renderer panel
function RendererPanel({ 
  type,
  shape,
  particleCount,
  showEdges,
  autoRotate,
  brownianMotion,
  width,
  onStatsUpdate
}: {
  type: 'canvas2d' | 'webgl';
  shape: string;
  particleCount: number;
  showEdges: boolean;
  autoRotate: boolean;
  brownianMotion: boolean;
  width?: string;
  onStatsUpdate?: (fps: number, renderTime: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<IRenderer | null>(null);
  const animationRef = useRef<number>(0);
  
  const [stats, setStats] = useState({ fps: 60, renderTime: 0, particles: 0 });
  
  // Shape generation
  const shapeGenerators: Record<string, (count: number) => any> = {
    tensor: generateTensor,
    galaxy: generateGalaxy,
    wormhole: generateWormhole,
    sphere: generateSphere,
    hypercube: generateHypercube
  };
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Initialize renderer
    const renderer = type === 'webgl' 
      ? new ThreeJSRenderer() 
      : new Canvas2DRenderer();
    
    // Get parent dimensions
    const parent = canvas.parentElement;
    const width = parent?.clientWidth || window.innerWidth / 2;
    const height = parent?.clientHeight || window.innerHeight - 200;
    
    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    
    renderer.initialize(canvas, width, height);
    rendererRef.current = renderer;
    
    // Generate shape
    const shapeData = shapeGenerators[shape](particleCount);
    const positions = shapeData.positions;
    const edges = shapeData.edges || [];
    
    // Setup animation state
    let rotation = 0;
    const brownianOffsets = createBrownianOffsets(positions.length);
    const particleSizes = new Array(positions.length).fill(0).map(() => 0.5 + Math.random() * 1.5);
    
    // Convert edges to line format
    const lines = edges.map(([a, b]: [number, number]) => ({
      a,
      b,
      strength: 1.0
    }));
    
    // Independent timing for this renderer
    let lastFrameTime = performance.now();
    let frameCount = 0;
    let frameTimes: number[] = [];
    let renderTimes: number[] = [];
    const maxFrameSamples = 60; // More samples for better average
    let statsUpdateCounter = 0;
    const statsUpdateInterval = 60; // Update stats every 60 frames (about 1 second)
    
    // Animation loop
    const animate = () => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastFrameTime;
      lastFrameTime = currentTime;
      
      // Track frame times independently
      frameTimes.push(deltaTime);
      if (frameTimes.length > maxFrameSamples) {
        frameTimes.shift();
      }
      
      // Update Brownian motion
      if (brownianMotion) {
        updateBrownianMotion(brownianOffsets, {
          amplitude: 0.02,
          speed: deltaTime / 1000
        });
      }
      
      // Apply rotation
      let rotatedPositions = positions;
      if (autoRotate) {
        rotation += 0.01;
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        rotatedPositions = positions.map((pos: Vec3) => {
          const [x, y, z] = pos;
          return [
            x * cos - z * sin,
            y,
            x * sin + z * cos
          ] as Vec3;
        });
      }
      
      // Render
      const renderStart = performance.now();
      
      const config: RenderConfig = {
        width: canvas.width,
        height: canvas.height,
        scale: 20,
        centerX: canvas.clientWidth / 2,
        centerY: canvas.clientHeight / 2,
        modelCenterX: 0,
        modelCenterY: 0,
        nodeColor: 'rgba(100, 150, 255, 0.8)',
        lineColor: 'rgba(100, 150, 255, 0.4)',
        isDark: true,
        particleSizes,
        brownianOffsets
      };
      
      renderer.render(rotatedPositions, showEdges ? lines : [], config);
      
      const renderTime = performance.now() - renderStart;
      
      // Track render times
      renderTimes.push(renderTime);
      if (renderTimes.length > maxFrameSamples) {
        renderTimes.shift();
      }
      
      // Update stats display every 10 frames (local display)
      frameCount++;
      if (frameCount >= 10) {
        // Calculate FPS from this renderer's own frame times
        const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
        const fps = avgFrameTime > 0 ? 1000 / avgFrameTime : 60;
        
        setStats({
          fps,
          renderTime: renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length,
          particles: positions.length
        });
        frameCount = 0;
      }
      
      // Update parent stats less frequently (for diff monitor)
      statsUpdateCounter++;
      if (statsUpdateCounter >= statsUpdateInterval && onStatsUpdate) {
        const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
        const avgRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
        const fps = avgFrameTime > 0 ? 1000 / avgFrameTime : 60;
        onStatsUpdate(fps, avgRenderTime);
        statsUpdateCounter = 0;
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    // Handle resize
    const handleResize = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      renderer.resize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [type, shape, particleCount, showEdges, autoRotate, brownianMotion]); // onStatsUpdate excluded to prevent re-renders
  
  return (
    <div style={{ 
      flex: width ? 'none' : 1,
      width: width || 'auto',
      minWidth: '300px',
      position: 'relative',
      background: '#0a0a0a',
      border: '1px solid #333',
      height: '100%'
    }}>
      <canvas 
        ref={canvasRef}
        style={{ 
          width: '100%', 
          height: '100%',
          display: 'block'
        }}
      />
      <StatsDisplay 
        fps={stats.fps}
        renderTime={stats.renderTime}
        particleCount={stats.particles}
        renderer={type === 'webgl' ? 'WebGL' : 'Canvas2D'}
      />
    </div>
  );
}

// Main comparison component
export default function RendererComparison() {
  const [shape, setShape] = useState('galaxy');
  const [particleCount, setParticleCount] = useState(1000);
  const [showEdges, setShowEdges] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [brownianMotion, setBrownianMotion] = useState(false);
  const [showCanvas2D, setShowCanvas2D] = useState(true);
  const [showWebGL, setShowWebGL] = useState(true);
  const [splitView, setSplitView] = useState(true);
  const [canvas2DStats, setCanvas2DStats] = useState({ fps: 0, renderTime: 0 });
  const [webGLStats, setWebGLStats] = useState({ fps: 0, renderTime: 0 });
  
  return (
    <div style={{ 
      width: '100%', 
      height: '100vh', 
      display: 'flex',
      flexDirection: 'column',
      background: '#000',
      color: '#fff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0
    }}>
      {/* Control Panel */}
      <div style={{
        padding: '15px 20px',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        borderBottom: '2px solid #333',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
      }}>
        <h1 style={{ 
          margin: '0 0 15px 0',
          fontSize: '24px',
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Renderer Performance Comparison
        </h1>
        
        <div style={{ 
          display: 'flex', 
          gap: '30px', 
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          {/* Shape Selection */}
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#aaa' }}>
              Shape
            </label>
            <select
              value={shape}
              onChange={(e) => setShape(e.target.value)}
              style={{
                padding: '8px 12px',
                background: '#2a2a3e',
                color: '#fff',
                border: '1px solid #444',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              <option value="tensor">Tensor</option>
              <option value="galaxy">Galaxy</option>
              <option value="wormhole">Wormhole</option>
              <option value="sphere">Sphere</option>
              <option value="hypercube">Hypercube</option>
            </select>
          </div>
          
          {/* Particle Count */}
          <div style={{ minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', color: '#aaa' }}>
              Particles: <span style={{ color: '#667eea', fontWeight: 'bold' }}>{particleCount}</span>
            </label>
            <input
              type="range"
              min="100"
              max="5000"
              step="100"
              value={particleCount}
              onChange={(e) => setParticleCount(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          
          {/* Toggles */}
          <div style={{ display: 'flex', gap: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showEdges}
                onChange={(e) => setShowEdges(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              <span style={{ fontSize: '14px' }}>Show Edges</span>
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoRotate}
                onChange={(e) => setAutoRotate(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              <span style={{ fontSize: '14px' }}>Auto Rotate</span>
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={brownianMotion}
                onChange={(e) => setBrownianMotion(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              <span style={{ fontSize: '14px' }}>Brownian Motion</span>
            </label>
          </div>
          
          {/* Renderer Toggles */}
          <div style={{ 
            display: 'flex', 
            gap: '10px',
            marginLeft: 'auto',
            paddingLeft: '20px',
            borderLeft: '2px solid #333'
          }}>
            <button
              onClick={() => setSplitView(!splitView)}
              style={{
                padding: '8px 16px',
                background: splitView ? '#764ba2' : '#333',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                transition: 'all 0.2s',
                display: showCanvas2D && showWebGL ? 'block' : 'none'
              }}
              title="Toggle split view"
            >
              ⟷ Split {splitView ? 'ON' : 'OFF'}
            </button>
            
            <button
              onClick={() => setShowCanvas2D(!showCanvas2D)}
              style={{
                padding: '8px 16px',
                background: showCanvas2D ? '#0064ff' : '#333',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                transition: 'all 0.2s'
              }}
            >
              Canvas2D {showCanvas2D ? 'ON' : 'OFF'}
            </button>
            
            <button
              onClick={() => setShowWebGL(!showWebGL)}
              style={{
                padding: '8px 16px',
                background: showWebGL ? '#00ff00' : '#333',
                color: showWebGL ? '#000' : '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                transition: 'all 0.2s'
              }}
            >
              WebGL {showWebGL ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Renderer Panels */}
      <div style={{ 
        flex: 1, 
        display: 'flex',
        gap: '2px',
        padding: '2px',
        background: '#000',
        overflow: 'hidden',
        minHeight: 0  // Important for flex children to shrink properly
      }}>
        {splitView && showCanvas2D && showWebGL ? (
          // Split view - both renderers side by side
          <>
            <RendererPanel
              type="canvas2d"
              shape={shape}
              particleCount={particleCount}
              showEdges={showEdges}
              autoRotate={autoRotate}
              brownianMotion={brownianMotion}
              width="calc(50% - 1px)"
              onStatsUpdate={(fps, renderTime) => setCanvas2DStats({ fps, renderTime })}
            />
            <RendererPanel
              type="webgl"
              shape={shape}
              particleCount={particleCount}
              showEdges={showEdges}
              autoRotate={autoRotate}
              brownianMotion={brownianMotion}
              width="calc(50% - 1px)"
              onStatsUpdate={(fps, renderTime) => setWebGLStats({ fps, renderTime })}
            />
          </>
        ) : (
          // Single view or both disabled
          <>
            {showCanvas2D && !showWebGL && (
              <RendererPanel
                type="canvas2d"
                shape={shape}
                particleCount={particleCount}
                showEdges={showEdges}
                autoRotate={autoRotate}
                brownianMotion={brownianMotion}
                onStatsUpdate={(fps, renderTime) => setCanvas2DStats({ fps, renderTime })}
              />
            )}
            
            {showWebGL && !showCanvas2D && (
              <RendererPanel
                type="webgl"
                shape={shape}
                particleCount={particleCount}
                showEdges={showEdges}
                autoRotate={autoRotate}
                brownianMotion={brownianMotion}
                onStatsUpdate={(fps, renderTime) => setWebGLStats({ fps, renderTime })}
              />
            )}
            
            {showCanvas2D && showWebGL && !splitView && (
              // Both enabled but not split view - show side by side flex
              <>
                <RendererPanel
                  type="canvas2d"
                  shape={shape}
                  particleCount={particleCount}
                  showEdges={showEdges}
                  autoRotate={autoRotate}
                  brownianMotion={brownianMotion}
                  onStatsUpdate={(fps, renderTime) => setCanvas2DStats({ fps, renderTime })}
                />
                <RendererPanel
                  type="webgl"
                  shape={shape}
                  particleCount={particleCount}
                  showEdges={showEdges}
                  autoRotate={autoRotate}
                  brownianMotion={brownianMotion}
                  onStatsUpdate={(fps, renderTime) => setWebGLStats({ fps, renderTime })}
                />
              </>
            )}
            
            {!showCanvas2D && !showWebGL && (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#666',
                fontSize: '20px'
              }}>
                Enable at least one renderer to see the visualization
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Show diff monitor only when both renderers are active */}
      {showCanvas2D && showWebGL && canvas2DStats.fps > 0 && webGLStats.fps > 0 && (
        <DiffMonitor canvas2DStats={canvas2DStats} webGLStats={webGLStats} />
      )}
    </div>
  );
}