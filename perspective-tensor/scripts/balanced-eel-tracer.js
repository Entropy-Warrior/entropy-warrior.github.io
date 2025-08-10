#!/usr/bin/env node

/**
 * Balanced Eel Tracer - Clean Structure + Complex Motion
 * Combines eel-like appearance with realistic twists and turns
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create complex eel centerline with multiple twists and turns
 */
function createComplexEelCenterline() {
  console.log('🐍 Creating complex eel centerline with realistic twists...');
  
  const points = [];
  const totalLength = 500;
  const segments = 120; // More segments for smoother curves
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = t * totalLength;
    
    // Complex serpentine motion with multiple frequency components
    let y = 0;
    
    // Primary swimming wave (main body undulation)
    y += 40 * Math.sin(t * Math.PI * 3.2) * Math.exp(-t * 0.2);
    
    // Secondary wave (creates the characteristic eel S-curves)
    y += 25 * Math.sin(t * Math.PI * 6.5 + Math.PI/4) * Math.exp(-t * 0.5);
    
    // Tertiary wave (fine body ripples)
    y += 12 * Math.sin(t * Math.PI * 12 + Math.PI/3) * Math.exp(-t * 0.8);
    
    // Quaternary wave (tail flutter)
    if (t > 0.6) {
      y += 8 * Math.sin(t * Math.PI * 20 + Math.PI/6) * (t - 0.6) * Math.exp(-t * 1.2);
    }
    
    // Head-to-tail amplitude modulation (stronger in middle, weaker at ends)
    const amplitudeModulation = Math.sin(t * Math.PI) * 0.8 + 0.2;
    y *= amplitudeModulation;
    
    points.push([x, y]);
  }
  
  console.log(`✅ Created ${points.length} complex centerline points`);
  return points;
}

/**
 * Add sophisticated 3D motion with twisting
 */
function addComplex3DMotion(centerline2D) {
  console.log('🌊 Adding complex 3D motion with body twisting...');
  
  return centerline2D.map(([x, y], i) => {
    const t = i / (centerline2D.length - 1);
    
    // Primary Z-axis undulation (vertical swimming motion)
    let z = 15 * Math.sin(t * Math.PI * 4.2) * Math.exp(-t * 0.3);
    
    // Secondary Z undulation (creates depth variation)
    z += 8 * Math.sin(t * Math.PI * 8.5 + Math.PI/2) * Math.exp(-t * 0.7);
    
    // Tertiary Z motion (fine detail)
    z += 4 * Math.sin(t * Math.PI * 16 + Math.PI/4) * Math.exp(-t * 1.0);
    
    // Body twist and roll (eels rotate their body while swimming)
    const twistPhase = t * Math.PI * 5.5;
    const rollPhase = t * Math.PI * 3.8;
    
    const twist = 0.6 * Math.sin(twistPhase) * Math.exp(-t * 0.4);
    const roll = 0.4 * Math.sin(rollPhase + Math.PI/3) * Math.exp(-t * 0.8);
    
    // Apply rotation transformations
    const cos_twist = Math.cos(twist);
    const sin_twist = Math.sin(twist);
    const cos_roll = Math.cos(roll);
    const sin_roll = Math.sin(roll);
    
    // Twist rotation (around the spine)
    const y_twisted = y * cos_twist - z * sin_twist * 0.7;
    const z_twisted = z * cos_twist + y * sin_twist * 0.5;
    
    // Roll rotation (banking motion)
    const y_final = y_twisted * cos_roll - z_twisted * sin_roll * 0.3;
    const z_final = z_twisted * cos_roll + y_twisted * sin_roll * 0.2;
    
    return [x, y_final, z_final];
  });
}

/**
 * Generate sophisticated eel body radius with natural variation
 */
function generateComplexEelRadius(centerlineLength) {
  console.log('📏 Generating complex eel body radius with natural variation...');
  
  const radii = [];
  
  for (let i = 0; i < centerlineLength; i++) {
    const t = i / (centerlineLength - 1);
    
    // Base eel body profile
    let radius = 14; // Base radius
    
    // Head bulge (eels have distinctive thick heads)
    if (t < 0.2) {
      const headFactor = Math.exp(-Math.pow(t * 8, 2)); // Gaussian head bulge
      radius *= (1 + 0.8 * headFactor);
    }
    
    // Body taper (gradual reduction toward tail)
    radius *= (1.1 - t * 0.85);
    
    // Mid-body thickness variation (natural muscle distribution)
    if (t > 0.2 && t < 0.7) {
      const muscleVariation = 1 + 0.15 * Math.sin((t - 0.2) * Math.PI * 2);
      radius *= muscleVariation;
    }
    
    // Tail taper (sharp reduction at the very end)
    if (t > 0.8) {
      const tailTaper = Math.exp(-Math.pow((t - 0.8) * 10, 2));
      radius *= (0.3 + 0.7 * tailTaper);
    }
    
    // Natural radius variation (breathing, muscle movement)
    const naturalVariation = 1 + 0.08 * Math.sin(t * Math.PI * 15 + Math.PI/7);
    radius *= naturalVariation;
    
    // Minimum radius for structural integrity
    radius = Math.max(1.5, radius);
    
    radii.push(radius);
  }
  
  console.log(`✅ Generated ${radii.length} complex radius values`);
  return radii;
}

/**
 * Generate clean but detailed tube geometry
 */
function generateDetailedTube(centerline3D, radiusProfile) {
  console.log('🎯 Generating detailed tube geometry...');
  
  const positions = [];
  const edges = [];
  const segmentsPerRing = 10; // Slightly more detail than simple version
  
  for (let i = 0; i < centerline3D.length; i++) {
    const [cx, cy, cz] = centerline3D[i];
    const radius = radiusProfile[i];
    
    // Calculate local coordinate frame for better geometry
    let tangent = [1, 0, 0];
    if (i < centerline3D.length - 1) {
      const next = centerline3D[i + 1];
      tangent = [next[0] - cx, next[1] - cy, next[2] - cz];
    } else if (i > 0) {
      const prev = centerline3D[i - 1];
      tangent = [cx - prev[0], cy - prev[1], cz - prev[2]];
    }
    
    // Normalize tangent
    const tangentLength = Math.sqrt(tangent[0]**2 + tangent[1]**2 + tangent[2]**2);
    if (tangentLength > 0) {
      tangent = [tangent[0]/tangentLength, tangent[1]/tangentLength, tangent[2]/tangentLength];
    }
    
    // Create perpendicular vectors for cross-section
    let normal = [0, 1, 0];
    let binormal = [0, 0, 1];
    
    // Make normal perpendicular to tangent
    const dot = normal[0]*tangent[0] + normal[1]*tangent[1] + normal[2]*tangent[2];
    normal = [normal[0] - dot*tangent[0], normal[1] - dot*tangent[1], normal[2] - dot*tangent[2]];
    
    // Normalize normal
    const normalLength = Math.sqrt(normal[0]**2 + normal[1]**2 + normal[2]**2);
    if (normalLength > 0) {
      normal = [normal[0]/normalLength, normal[1]/normalLength, normal[2]/normalLength];
    }
    
    // Calculate binormal as cross product
    binormal = [
      tangent[1]*normal[2] - tangent[2]*normal[1],
      tangent[2]*normal[0] - tangent[0]*normal[2],
      tangent[0]*normal[1] - tangent[1]*normal[0]
    ];
    
    // Generate cross-section vertices
    const ringStart = i * segmentsPerRing;
    for (let j = 0; j < segmentsPerRing; j++) {
      const angle = (j / segmentsPerRing) * 2 * Math.PI;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      
      // Position on the circle
      const px = cx + radius * (cosA * normal[0] + sinA * binormal[0]);
      const py = cy + radius * (cosA * normal[1] + sinA * binormal[1]);
      const pz = cz + radius * (cosA * normal[2] + sinA * binormal[2]);
      
      positions.push([px, py, pz]);
    }
    
    // Connect around the ring (circumferential edges)
    for (let j = 0; j < segmentsPerRing; j++) {
      const current = ringStart + j;
      const next = ringStart + ((j + 1) % segmentsPerRing);
      edges.push([current, next]);
    }
    
    // Connect to next ring (longitudinal edges)
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
  console.log('\n🐍 Creating Balanced Eel with Complex Motion...\n');
  
  try {
    // Step 1: Create complex centerline with multiple twists
    const centerline2D = createComplexEelCenterline();
    
    // Step 2: Add sophisticated 3D motion with body twisting
    const centerline3D = addComplex3DMotion(centerline2D);
    
    // Step 3: Generate complex radius profile
    const radiusProfile = generateComplexEelRadius(centerline3D.length);
    
    // Step 4: Generate detailed but clean tube geometry
    const tubeGeometry = generateDetailedTube(centerline3D, radiusProfile);
    
    // Step 5: Save results
    const outputDir = path.join(__dirname, '..', 'public', 'data');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const output = {
      metadata: {
        source: 'balanced eel tracer - clean structure + complex motion',
        method: 'balanced-complex',
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
    
    const outputFile = path.join(outputDir, 'balanced-eel.json');
    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
    console.log(`✅ Saved balanced eel data to: ${outputFile}`);
    
    console.log('\n🎉 Balanced eel complete!');
    console.log('\nResults:');
    console.log(`- Method: Balanced complexity`);
    console.log(`- Vertices: ${output.metadata.vertices}`);
    console.log(`- Edges: ${output.metadata.edges}`);
    console.log(`- Centerline points: ${output.metadata.centerlinePoints}`);
    console.log(`- Clean eel structure: ✅`);
    console.log(`- Complex serpentine motion: ✅`);
    console.log(`- Multiple twist frequencies: ✅`);
    console.log(`- Natural body variation: ✅`);
    console.log(`- 3D twisting and rolling: ✅`);
    
  } catch (error) {
    console.error('❌ Error during balanced eel creation:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default main;
