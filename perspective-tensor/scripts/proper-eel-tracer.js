#!/usr/bin/env node

/**
 * Proper Eel Tracer - With Realistic Eel Head
 * Creates an eel with a proper head structure, not just a thick tube
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create eel centerline with proper head positioning
 */
function createEelWithProperHead() {
  console.log('🐍 Creating eel centerline with proper head structure...');
  
  const points = [];
  const totalLength = 500;
  const segments = 120;
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = t * totalLength;
    
    // Complex serpentine body motion (same as before)
    let y = 0;
    y += 40 * Math.sin(t * Math.PI * 3.2) * Math.exp(-t * 0.2);
    y += 25 * Math.sin(t * Math.PI * 6.5 + Math.PI/4) * Math.exp(-t * 0.5);
    y += 12 * Math.sin(t * Math.PI * 12 + Math.PI/3) * Math.exp(-t * 0.8);
    
    if (t > 0.6) {
      y += 8 * Math.sin(t * Math.PI * 20 + Math.PI/6) * (t - 0.6) * Math.exp(-t * 1.2);
    }
    
    const amplitudeModulation = Math.sin(t * Math.PI) * 0.8 + 0.2;
    y *= amplitudeModulation;
    
    points.push([x, y]);
  }
  
  console.log(`✅ Created ${points.length} centerline points with head structure`);
  return points;
}

/**
 * Add 3D motion (same as before)
 */
function addComplex3DMotion(centerline2D) {
  console.log('🌊 Adding complex 3D motion...');
  
  return centerline2D.map(([x, y], i) => {
    const t = i / (centerline2D.length - 1);
    
    let z = 15 * Math.sin(t * Math.PI * 4.2) * Math.exp(-t * 0.3);
    z += 8 * Math.sin(t * Math.PI * 8.5 + Math.PI/2) * Math.exp(-t * 0.7);
    z += 4 * Math.sin(t * Math.PI * 16 + Math.PI/4) * Math.exp(-t * 1.0);
    
    const twistPhase = t * Math.PI * 5.5;
    const rollPhase = t * Math.PI * 3.8;
    
    const twist = 0.6 * Math.sin(twistPhase) * Math.exp(-t * 0.4);
    const roll = 0.4 * Math.sin(rollPhase + Math.PI/3) * Math.exp(-t * 0.8);
    
    const cos_twist = Math.cos(twist);
    const sin_twist = Math.sin(twist);
    const cos_roll = Math.cos(roll);
    const sin_roll = Math.sin(roll);
    
    const y_twisted = y * cos_twist - z * sin_twist * 0.7;
    const z_twisted = z * cos_twist + y * sin_twist * 0.5;
    
    const y_final = y_twisted * cos_roll - z_twisted * sin_roll * 0.3;
    const z_final = z_twisted * cos_roll + y_twisted * sin_roll * 0.2;
    
    return [x, y_final, z_final];
  });
}

/**
 * Generate proper eel head cross-sections
 */
function generateEelHeadCrossSections(t, baseRadius) {
  // Different head shapes based on position along eel
  if (t < 0.02) {
    // Very tip of snout - pointed/triangular
    return {
      radiusY: baseRadius * 0.3,
      radiusZ: baseRadius * 0.2,
      offsetY: 0,
      offsetZ: baseRadius * 0.1, // Slightly below centerline
      shape: 'pointed'
    };
  } else if (t < 0.08) {
    // Snout area - elongated oval
    const snoutProgress = (t - 0.02) / 0.06;
    return {
      radiusY: baseRadius * (0.3 + 0.4 * snoutProgress),
      radiusZ: baseRadius * (0.2 + 0.3 * snoutProgress),
      offsetY: 0,
      offsetZ: baseRadius * (0.1 + 0.1 * snoutProgress),
      shape: 'oval'
    };
  } else if (t < 0.15) {
    // Head proper - wider, flattened
    const headProgress = (t - 0.08) / 0.07;
    return {
      radiusY: baseRadius * (0.7 + 0.6 * headProgress),
      radiusZ: baseRadius * (0.5 + 0.3 * headProgress),
      offsetY: 0,
      offsetZ: baseRadius * (0.2 + 0.1 * headProgress),
      shape: 'flattened'
    };
  } else if (t < 0.25) {
    // Neck transition to body
    const neckProgress = (t - 0.15) / 0.10;
    return {
      radiusY: baseRadius * (1.3 - 0.3 * neckProgress),
      radiusZ: baseRadius * (0.8 + 0.2 * neckProgress),
      offsetY: 0,
      offsetZ: baseRadius * (0.3 - 0.3 * neckProgress),
      shape: 'transitional'
    };
  } else {
    // Regular body - circular
    return {
      radiusY: baseRadius,
      radiusZ: baseRadius,
      offsetY: 0,
      offsetZ: 0,
      shape: 'circular'
    };
  }
}

/**
 * Generate eel with proper head geometry
 * targetVertices: target number of vertices (default 729 to match main layouts)
 */
function generateEelWithProperHead(centerline3D, radiusProfile, targetVertices = 729) {
  console.log(`🎯 Generating eel with proper head geometry (target: ${targetVertices} vertices)...`);
  
  const positions = [];
  const edges = [];
  
  // Calculate segments per ring to hit target vertex count
  const centerlineLength = centerline3D.length;
  const segmentsPerRing = Math.max(4, Math.floor(Math.sqrt(targetVertices / centerlineLength)));
  const adjustedCenterlineLength = Math.floor(targetVertices / segmentsPerRing);
  
  console.log(`Using ${segmentsPerRing} segments per ring, ${adjustedCenterlineLength} rings`);
  
  // Subsample centerline if needed to hit target
  const sampledCenterline = [];
  const sampledRadii = [];
  for (let i = 0; i < adjustedCenterlineLength; i++) {
    const originalIndex = Math.floor((i / (adjustedCenterlineLength - 1)) * (centerlineLength - 1));
    sampledCenterline.push(centerline3D[originalIndex]);
    sampledRadii.push(radiusProfile[originalIndex]);
  }
  
  for (let i = 0; i < sampledCenterline.length; i++) {
    const [cx, cy, cz] = sampledCenterline[i];
    const t = i / (sampledCenterline.length - 1);
    const baseRadius = sampledRadii[i];
    
    // Get head-specific cross-section
    const crossSection = generateEelHeadCrossSections(t, baseRadius);
    
    // Calculate local coordinate frame
    let tangent = [1, 0, 0];
    if (i < sampledCenterline.length - 1) {
      const next = sampledCenterline[i + 1];
      tangent = [next[0] - cx, next[1] - cy, next[2] - cz];
    } else if (i > 0) {
      const prev = sampledCenterline[i - 1];
      tangent = [cx - prev[0], cy - prev[1], cz - prev[2]];
    }
    
    const tangentLength = Math.sqrt(tangent[0]**2 + tangent[1]**2 + tangent[2]**2);
    if (tangentLength > 0) {
      tangent = [tangent[0]/tangentLength, tangent[1]/tangentLength, tangent[2]/tangentLength];
    }
    
    let normal = [0, 1, 0];
    let binormal = [0, 0, 1];
    
    const dot = normal[0]*tangent[0] + normal[1]*tangent[1] + normal[2]*tangent[2];
    normal = [normal[0] - dot*tangent[0], normal[1] - dot*tangent[1], normal[2] - dot*tangent[2]];
    
    const normalLength = Math.sqrt(normal[0]**2 + normal[1]**2 + normal[2]**2);
    if (normalLength > 0) {
      normal = [normal[0]/normalLength, normal[1]/normalLength, normal[2]/normalLength];
    }
    
    binormal = [
      tangent[1]*normal[2] - tangent[2]*normal[1],
      tangent[2]*normal[0] - tangent[0]*normal[2],
      tangent[0]*normal[1] - tangent[1]*normal[0]
    ];
    
    // Generate head-specific cross-section vertices
    const ringStart = i * segmentsPerRing;
    
    for (let j = 0; j < segmentsPerRing; j++) {
      const angle = (j / segmentsPerRing) * 2 * Math.PI;
      let cosA = Math.cos(angle);
      let sinA = Math.sin(angle);
      
      // Modify shape based on head cross-section
      if (crossSection.shape === 'pointed' && t < 0.02) {
        // Create pointed snout
        const pointedness = 1 - (t / 0.02);
        if (Math.abs(sinA) > 0.5) {
          sinA *= (1 - pointedness * 0.8);
        }
        if (cosA < 0) { // Back part of snout
          cosA *= (1 - pointedness * 0.6);
        }
      } else if (crossSection.shape === 'flattened') {
        // Flatten the head vertically (eel heads are flattened)
        sinA *= 0.7; // Compress vertically
      }
      
      // Apply elliptical cross-section
      const localY = cosA * crossSection.radiusY;
      const localZ = sinA * crossSection.radiusZ;
      
      // Position with offset (for head positioning)
      const px = cx;
      const py = cy + (localY + crossSection.offsetY) * normal[1] + localZ * binormal[1];
      const pz = cz + (localY + crossSection.offsetY) * normal[2] + localZ * binormal[2];
      
      positions.push([px, py, pz]);
    }
    
    // Generate edges (same as before)
    for (let j = 0; j < segmentsPerRing; j++) {
      const current = ringStart + j;
      const next = ringStart + ((j + 1) % segmentsPerRing);
      edges.push([current, next]);
    }
    
    if (i < sampledCenterline.length - 1) {
      const nextRingStart = (i + 1) * segmentsPerRing;
      for (let j = 0; j < segmentsPerRing; j++) {
        const current = ringStart + j;
        const nextRing = nextRingStart + j;
        edges.push([current, nextRing]);
      }
    }
  }
  
  console.log(`✅ Generated eel with proper head: ${positions.length} vertices and ${edges.length} edges`);
  return { positions, edges };
}

/**
 * Generate enhanced radius profile for proper head
 */
function generateProperEelRadius(centerlineLength) {
  console.log('📏 Generating proper eel radius profile...');
  
  const radii = [];
  
  for (let i = 0; i < centerlineLength; i++) {
    const t = i / (centerlineLength - 1);
    
    let radius = 14; // Base radius
    
    // Proper eel head proportions
    if (t < 0.02) {
      // Snout tip - very small
      radius = 2;
    } else if (t < 0.08) {
      // Snout - gradually expanding
      const snoutProgress = (t - 0.02) / 0.06;
      radius = 2 + 8 * snoutProgress;
    } else if (t < 0.15) {
      // Head - largest part
      const headProgress = (t - 0.08) / 0.07;
      radius = 10 + 8 * headProgress;
    } else if (t < 0.25) {
      // Neck transition
      const neckProgress = (t - 0.15) / 0.10;
      radius = 18 - 4 * neckProgress;
    } else {
      // Body - normal eel body proportions
      radius = 14 * (1.1 - t * 0.85);
    }
    
    // Tail taper
    if (t > 0.8) {
      const tailTaper = Math.exp(-Math.pow((t - 0.8) * 10, 2));
      radius *= (0.3 + 0.7 * tailTaper);
    }
    
    // Natural variation
    const naturalVariation = 1 + 0.05 * Math.sin(t * Math.PI * 12);
    radius *= naturalVariation;
    
    radius = Math.max(1.5, radius);
    radii.push(radius);
  }
  
  return radii;
}

/**
 * Main execution
 */
async function main() {
  console.log('\n🐍 Creating Eel with Proper Head...\n');
  
  try {
    const centerline2D = createEelWithProperHead();
    const centerline3D = addComplex3DMotion(centerline2D);
    const radiusProfile = generateProperEelRadius(centerline3D.length);
    const tubeGeometry = generateEelWithProperHead(centerline3D, radiusProfile);
    
    const outputDir = path.join(__dirname, '..', 'public', 'data');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const output = {
      metadata: {
        source: 'proper eel tracer with realistic head structure',
        method: 'proper-head-eel',
        timestamp: new Date().toISOString(),
        vertices: tubeGeometry.positions.length,
        edges: tubeGeometry.edges.length,
        centerlinePoints: centerline3D.length,
        features: ['pointed-snout', 'flattened-head', 'neck-transition', 'complex-motion']
      },
      positions: tubeGeometry.positions,
      edges: tubeGeometry.edges,
      centerline2D: centerline2D,
      centerline3D: centerline3D,
      radiusProfile: radiusProfile
    };
    
    const outputFile = path.join(outputDir, 'proper-eel.json');
    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
    console.log(`✅ Saved proper eel data to: ${outputFile}`);
    
    console.log('\n🎉 Proper eel complete!');
    console.log('\nResults:');
    console.log(`- Method: Proper head structure`);
    console.log(`- Vertices: ${output.metadata.vertices}`);
    console.log(`- Edges: ${output.metadata.edges}`);
    console.log(`- Pointed snout: ✅`);
    console.log(`- Flattened head: ✅`);
    console.log(`- Neck transition: ✅`);
    console.log(`- Complex body motion: ✅`);
    console.log(`- Natural proportions: ✅`);
    
  } catch (error) {
    console.error('❌ Error during proper eel creation:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default main;
