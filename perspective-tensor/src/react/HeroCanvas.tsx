import { Canvas, useFrame } from '@react-three/fiber';
import { Float, OrbitControls } from '@react-three/drei';
import { useRef } from 'react';
import * as THREE from 'three';

function Tensor() {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.rotation.x = Math.sin(t * 0.3) * 0.2 + 0.3;
    groupRef.current.rotation.y = t * 0.4;
  });
  return (
    <group ref={groupRef}>
      {/* Axes */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.2, 0.02, 0.02]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.02, 2.2, 0.02]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.02, 0.02, 2.2]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>
      {/* Perspective tensor as a set of connected lines (cube->shear) */}
      <mesh>
        <torusKnotGeometry args={[0.6, 0.16, 120, 16]} />
        <meshStandardMaterial color="#a78bfa" metalness={0.3} roughness={0.3} />
      </mesh>
    </group>
  );
}

export default function HeroCanvas() {
  return (
    <div className="h-[360px] w-full rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <Canvas 
        camera={{ position: [2.4, 1.6, 2.4], fov: 45 }} 
        dpr={[1, 2]}
        gl={{ alpha: true }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 3, 3]} intensity={0.8} />
        <Float speed={1.5} rotationIntensity={0.6} floatIntensity={0.6}>
          <Tensor />
        </Float>
        <OrbitControls enablePan={false} enableZoom={false} autoRotate autoRotateSpeed={0.6} />
      </Canvas>
    </div>
  );
}


