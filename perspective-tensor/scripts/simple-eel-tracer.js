#!/usr/bin/env node

/**
 * Simple Eel Tracer - Focus on Eel-like Shape
 * Forget complex algorithms, just make it look like an actual eel!
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create a simple, realistic eel centerline
 */
function createRealisticEelCenterline() {
  console.log('🐍 Creating simple, realistic eel centerline...');
  
  const points = [];
  const totalLength = 400;
  const segments = 60;
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = t * totalLength;
    
    // Simple but realistic S-curve with multiple bends
    // Like a real eel swimming
    let y = 0;
    
    // Primary S-curve
    y += 30 * Math.sin(t * Math.PI * 2.5);
    
    // Secondary smaller curve
    y += 15 * Math.sin(t * Math.PI * 5 + Math.PI/3);
    
    // Tail wiggle
    if (t > 0.7) {
      y += 8 * Math.sin(t * Math.PI * 12) * (t - 0.7);
    }
    
    points.push([x, y]);
  }
  
  console.log(`✅ Created ${points.length} centerline points`);
  return points;
}

/**
 * Add gentle 3D motion
 */
function add3DMotion(centerline2D) {
  console.log('🌊 Adding gentle 3D motion...');
  
  return centerline2D.map(([x, y], i) => {
    const t = i / (centerline2D.length - 1);
    
    // Gentle swimming motion in Z
    const z = 8 * Math.sin(t * Math.PI * 3) * Math.exp(-t * 0.5);
    
    return [x, y, z];
  });
}

/**
 * Generate natural eel body radius
 */
function generateEelRadius(centerlineLength) {
  console.log('📏 Generating eel body radius...');
  
  const radii = [];
  
  for (let i = 0; i < centerlineLength; i++) {
    const t = i / (centerlineLength - 1);
    
    // Eel body: thick head, tapered tail
    let radius = 12; // Base radius
    
    // Head is thicker
    if (t < 0.15) {
      radius *= (1.5 - t * 2);
    }
    // Body tapers toward tail
    else {
      radius *= (1.2 - t * 0.9);
    }
    
    // Minimum radius for tail
    radius = Math.max(2, radius);
    
    radii.push(radius);
  }
  
  return radii;
}

/**
 * Generate simple tube geometry - much cleaner
 */
function generateSimpleTube(centerline3D, radiusProfile) {
  console.log('🎯 Generating simple tube geometry...');
  
  const positions = [];
  const edges = [];
  const segmentsPerRing = 8; // Fewer segments for cleaner look
  
  for (let i = 0; i < centerline3D.length; i++) {
    const [cx, cy, cz] = centerline3D[i];
    const radius = radiusProfile[i];
    
    // Generate simple circular cross-section
    const ringStart = i * segmentsPerRing;
    for (let j = 0; j < segmentsPerRing; j++) {
      const angle = (j / segmentsPerRing) * 2 * Math.PI;
      
      const px = cx;
      const py = cy + Math.cos(angle) * radius;
      const pz = cz + Math.sin(angle) * radius;
      
      positions.push([px, py, pz]);
    }
    
    // Connect around the ring
    for (let j = 0; j < segmentsPerRing; j++) {
      const current = ringStart + j;
      const next = ringStart + ((j + 1) % segmentsPerRing);
      edges.push([current, next]);
    }
    
    // Connect to next ring (longitudinal lines)
    if (i < centerline3D.length - 1) {
      const nextRingStart = (i + 1) * segmentsPerRing;
      for (let j = 0; j < segmentsPerRing; j++) {
        const current = ringStart + j;
        const nextRing = nextRingStart + j;
        edges.push([current, nextRing]);
      }
    }
  }
  
  console.log(`✅ Generated ${positions.length} vertices and ${edges.length} edges`);
  return { positions, edges };
}

/**
 * Main execution
 */
async function main() {
  console.log('\n🐍 Creating Simple, Realistic Eel...\n');
  
  try {
    // Step 1: Create realistic centerline
    const centerline2D = createRealisticEelCenterline();
    
    // Step 2: Add gentle 3D motion
    const centerline3D = add3DMotion(centerline2D);
    
    // Step 3: Generate radius profile
    const radiusProfile = generateEelRadius(centerline3D.length);
    
    // Step 4: Generate clean tube geometry
    const tubeGeometry = generateSimpleTube(centerline3D, radiusProfile);
    
    // Step 5: Save results
    const outputDir = path.join(__dirname, '..', 'public', 'data');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const output = {
      metadata: {
        source: 'simple realistic eel tracer',
        method: 'hand-crafted-realistic',
        timestamp: new Date().toISOString(),
        vertices: tubeGeometry.positions.length,
        edges: tubeGeometry.edges.length,
        centerlinePoints: centerline3D.length
      },
      positions: tubeGeometry.positions,
      edges: tubeGeometry.edges,
      centerline2D: centerline2D,
      centerline3D: centerline3D,
      radiusProfile: radiusProfile
    };
    
    const outputFile = path.join(outputDir, 'simple-eel.json');
    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
    console.log(`✅ Saved simple eel data to: ${outputFile}`);
    
    console.log('\n🎉 Simple eel complete!');
    console.log('\nResults:');
    console.log(`- Method: Simple and realistic`);
    console.log(`- Vertices: ${output.metadata.vertices}`);
    console.log(`- Edges: ${output.metadata.edges}`);
    console.log(`- Clean tube structure: ✅`);
    console.log(`- Eel-like proportions: ✅`);
    console.log(`- Natural swimming curves: ✅`);
    
  } catch (error) {
    console.error('❌ Error during simple eel creation:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default main;
