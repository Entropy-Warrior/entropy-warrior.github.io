import React, { useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

/**
 * Elegant 3D line animation morphing from a tensor (3D lattice)
 * to a network (graph). Adapted for the Perspective Tensor landing page.
 */

// Types
interface PointsCloudProps {
  nodes: THREE.Vector3[];
  tRef: React.MutableRefObject<number>;
  phase: 'grid' | 'network';
}

interface LinesMorphProps {
  gridRes?: [number, number, number];
  nodeCount?: number;
  knn?: number;
}

type Segment = [THREE.Vector3, THREE.Vector3];

// ---------- EASING (fixed + safe) ----------
export const EASE = (t = 0): number => {
  // Guard bad inputs (undefined/NaN)
  if (typeof t !== "number" || !Number.isFinite(t)) t = 0;
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2; // cubic in/out
};

// Deterministic helper for testability
const seeded = (seed: number) => (): number => (seed = (seed * 48271) % 2147483647) / 2147483647;
const v3 = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);

// ---------- Geometry builders ----------
function buildTensorGrid(nx: number, ny: number, nz: number, size = 2.8): Segment[] {
  const min = -size / 2, max = size / 2;
  const sx = (max - min) / (nx - 1);
  const sy = (max - min) / (ny - 1);
  const sz = (max - min) / (nz - 1);

  const points: THREE.Vector3[] = [];
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++)
        points.push(v3(min + i * sx, min + j * sy, min + k * sz));

  const idx = (i: number, j: number, k: number): number => k * nx * ny + j * nx + i;
  const segs: Segment[] = [];
  for (let k = 0; k < nz; k++) {
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        if (i < nx - 1) segs.push([points[idx(i, j, k)], points[idx(i + 1, j, k)]]);
        if (j < ny - 1) segs.push([points[idx(i, j, k)], points[idx(i, j + 1, k)]]);
        if (k < nz - 1) segs.push([points[idx(i, j, k)], points[idx(i, j, k + 1)]]);
      }
    }
  }
  return segs;
}

function buildGraphEdges(nodeCount: number, k: number, radius = 1.3, jitter = 0.4, seed = 13): { nodes: THREE.Vector3[], segments: Segment[] } {
  const rnd = seeded(seed);
  const nodes = Array.from({ length: nodeCount }, () => {
    const u = rnd(), v = rnd();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = radius * Math.cbrt(rnd());
    const x = r * Math.sin(phi) * Math.cos(theta) + (rnd() - 0.5) * jitter;
    const y = r * Math.sin(phi) * Math.sin(theta) + (rnd() - 0.5) * jitter;
    const z = r * Math.cos(phi) + (rnd() - 0.5) * jitter;
    return v3(x, y, z);
  });

  const edgesSet = new Set<string>();
  for (let i = 0; i < nodeCount; i++) {
    const di = nodes[i];
    const dists: [number, number][] = [];
    for (let j = 0; j < nodeCount; j++) if (i !== j) dists.push([j, di.distanceToSquared(nodes[j])]);
    dists.sort((a, b) => a[1] - b[1]);
    for (let n = 0; n < k; n++) {
      const j = dists[n][0];
      const a = Math.min(i, j), b = Math.max(i, j);
      edgesSet.add(`${a}-${b}`);
    }
  }

  const segs: Segment[] = [];
  edgesSet.forEach((key: string) => {
    const [a, b] = key.split("-").map(Number);
    segs.push([nodes[a], nodes[b]]);
  });
  return { nodes, segments: segs };
}

function toFloat32Segments(segments: Segment[], targetCount: number): Float32Array {
  const out = new Float32Array(targetCount * 6);
  for (let i = 0; i < targetCount; i++) {
    const seg = segments[i % segments.length];
    out.set([seg[0].x, seg[0].y, seg[0].z, seg[1].x, seg[1].y, seg[1].z], i * 6);
  }
  return out;
}

function makeColors(count: number, isDark = false): Float32Array {
  const a = isDark ? "#6b7280" : "#374151"; // Gray variants
  const b = isDark ? "#9ca3af" : "#4b5563"; // Gray variants
  const ca = new THREE.Color(a), cb = new THREE.Color(b);
  const colors = new Float32Array(count * 2 * 3);
  for (let i = 0; i < count; i++) {
    const t = i / Math.max(1, count - 1);
    const c = ca.clone().lerp(cb, t);
    colors.set([c.r, c.g, c.b, c.r, c.g, c.b], i * 6);
  }
  return colors;
}

// ---------- Core component ----------
function LinesMorph({ gridRes = [5, 5, 5], nodeCount = 180, knn = 8 }: LinesMorphProps) {
  const geomRef = useRef<THREE.BufferGeometry>(null);
  const matRef = useRef<THREE.LineBasicMaterial>(null);
  const [dir, setDir] = useState(1);
  const tRef = useRef(0);

  const { start, end, count, colors, gridNodes, networkNodes } = useMemo(() => {
    const [nx, ny, nz] = gridRes;
    const gridSegs = buildTensorGrid(nx, ny, nz, 2.4);
    const { nodes, segments: graphSegs } = buildGraphEdges(nodeCount, knn, 1.2, 0.3, 13);
    const c = Math.max(gridSegs.length, graphSegs.length);
    
    // Extract grid nodes for tensor phase
    const gridNodeSet = new Set<string>();
    gridSegs.forEach(seg => {
      gridNodeSet.add(`${seg[0].x},${seg[0].y},${seg[0].z}`);
      gridNodeSet.add(`${seg[1].x},${seg[1].y},${seg[1].z}`);
    });
    const gridNodes = Array.from(gridNodeSet).map((coords: string) => {
      const [x, y, z] = coords.split(',').map(Number);
      return v3(x, y, z);
    });
    
    // Check dark mode
    const isDark = typeof document !== 'undefined' && 
                   document.documentElement.classList.contains('dark');
    
    return {
      start: toFloat32Segments(gridSegs, c),
      end: toFloat32Segments(graphSegs, c),
      count: c,
      colors: makeColors(c, isDark),
      gridNodes,
      networkNodes: nodes,
    };
  }, [gridRes, nodeCount, knn]);

  const positions = useMemo(() => new Float32Array(count * 6), [count]);

  // Attach geometry attributes once they exist
  useEffect(() => {
    const geom = geomRef.current;
    if (!geom) return;
    if (positions?.length) geom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    if (colors?.length) geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  }, [positions, colors]);

  useFrame((state, delta) => {
    // Update t (safe) - slower morph for elegance
    tRef.current += delta * 0.12 * dir;
    if (tRef.current > 1) { tRef.current = 1; setDir(-1); }
    if (tRef.current < 0) { tRef.current = 0; setDir(1); }
    
    const raw = typeof tRef.current === "number" && Number.isFinite(tRef.current) ? tRef.current : 0;
    const t = EASE(THREE.MathUtils.clamp(raw, 0, 1));

    // Animate line width based on morph progress
    const baseWidth = 1.0;
    const networkBoost = 1.5;
    const pulseSpeed = state.clock.elapsedTime * 2;
    const pulse = 1 + Math.sin(pulseSpeed) * 0.1;
    const lineWidth = (baseWidth + t * networkBoost) * pulse;
    
    if (matRef.current) {
      // Note: linewidth doesn't work in most browsers for WebGL, but we'll keep it for completeness
      (matRef.current as any).linewidth = lineWidth;
      // Animate opacity with slight pulse in network mode
      const baseOpacity = 0.7;
      const networkOpacity = 0.8 + Math.sin(pulseSpeed * 0.5) * 0.1;
      matRef.current.opacity = THREE.MathUtils.lerp(baseOpacity, networkOpacity, t);
    }

    // Safety: geometry may not be ready in first frame(s)
    const geom = geomRef.current;
    const attr = geom?.attributes?.position;
    if (!geom || !attr) return;

    for (let i = 0; i < count; i++) {
      const base6 = i * 6;
      // Add subtle animation to network connections
      const jitter = t > 0.3 ? Math.sin(state.clock.elapsedTime * 3 + i * 0.1) * 0.02 * t : 0;
      
      // Two vertices per segment
      positions[base6 + 0] = THREE.MathUtils.lerp(start[base6 + 0], end[base6 + 0], t) + jitter;
      positions[base6 + 1] = THREE.MathUtils.lerp(start[base6 + 1], end[base6 + 1], t) + jitter;
      positions[base6 + 2] = THREE.MathUtils.lerp(start[base6 + 2], end[base6 + 2], t) + jitter;

      positions[base6 + 3] = THREE.MathUtils.lerp(start[base6 + 3], end[base6 + 3], t) + jitter;
      positions[base6 + 4] = THREE.MathUtils.lerp(start[base6 + 4], end[base6 + 4], t) + jitter;
      positions[base6 + 5] = THREE.MathUtils.lerp(start[base6 + 5], end[base6 + 5], t) + jitter;
    }
    attr.needsUpdate = true;
  });

  return (
    <group>
      <lineSegments>
        <bufferGeometry ref={geomRef} />
        <lineBasicMaterial
          ref={matRef}
          vertexColors
          transparent
          opacity={0.7}
          depthWrite={false}
          linewidth={1}
        />
      </lineSegments>

      {/* Grid nodes visible in tensor phase */}
      <PointsCloud nodes={gridNodes} tRef={tRef} phase="grid" />
      
      {/* Network nodes visible in network phase */}
      <PointsCloud nodes={networkNodes} tRef={tRef} phase="network" />
    </group>
  );
}

function PointsCloud({ nodes, tRef, phase }: PointsCloudProps) {
  const geoRef = useRef<THREE.BufferGeometry>(null);
  const matRef = useRef<THREE.PointsMaterial>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(nodes.length * 3);
    nodes.forEach((p: THREE.Vector3, i: number) => {
      arr[i * 3 + 0] = p.x; arr[i * 3 + 1] = p.y; arr[i * 3 + 2] = p.z;
    });
    return arr;
  }, [nodes]);

  useEffect(() => {
    if (geoRef.current) {
      geoRef.current.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    }
  }, [positions]);

  useFrame((state) => {
    const t = typeof tRef.current === "number" && Number.isFinite(tRef.current) ? tRef.current : 0;
    
    let opacity: number, size: number;
    if (phase === "grid") {
      // Grid nodes fade out as we approach network
      opacity = THREE.MathUtils.smoothstep(1 - t, 0.2, 1.0) * 0.6;
      size = 0.012 + Math.sin(state.clock.elapsedTime * 2) * 0.002;
    } else {
      // Network nodes fade in as we approach network
      opacity = THREE.MathUtils.smoothstep(t, 0.3, 1.0) * 0.7;
      // Network nodes pulse more dynamically
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.3;
      size = (0.015 + t * 0.005) * pulse;
    }
    
    if (matRef.current) {
      matRef.current.opacity = opacity;
      matRef.current.size = size;
    }
  });

  // Check dark mode for point color
  const isDark = typeof document !== 'undefined' && 
                 document.documentElement.classList.contains('dark');
  
  // Different colors for different phases
  const gridColor = isDark ? "#9ca3af" : "#4b5563"; // Gray for structured grid
  const networkColor = isDark ? "#6b7280" : "#374151"; // Gray for dynamic network
  const pointColor = phase === "grid" ? gridColor : networkColor;

  return (
    <points>
      <bufferGeometry ref={geoRef} />
      <pointsMaterial
        ref={matRef}
        color={pointColor}
        size={0.015}
        transparent
        opacity={0}
        depthWrite={false}
      />
    </points>
  );
}

// ---------- Exported App ----------
export default function TensorMorph() {
  return (
    <div className="h-[420px] w-full">
      <Canvas 
        camera={{ position: [0, 0, 5], fov: 50 }} 
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 3, 3]} intensity={0.8} />
        <LinesMorph gridRes={[6, 6, 6]} nodeCount={220} knn={10} />
        <OrbitControls 
          enableDamping 
          dampingFactor={0.05} 
          minDistance={3} 
          maxDistance={9}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.3}
        />
      </Canvas>
    </div>
  );
}
