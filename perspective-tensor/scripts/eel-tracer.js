#!/usr/bin/env node

/**
 * Standalone Eel Tracer
 * Converts the eel reference image into usable shape data
 * Usage: node scripts/eel-tracer.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a realistic eel centerline with multiple twists and turns
function traceEelCenterline() {
  console.log('🐍 Tracing eel centerline with realistic serpentine motion...');
  
  // Create a much more complex centerline with multiple S-curves and twists
  // This mimics how eels actually move - with multiple undulation points
  const centerlinePoints = [
    // Head region - thick and rounded
    [0, 0],
    [8, -1],
    [16, -2],
    [25, -1],
    [35, 1],
    
    // First major curve - upward sweep
    [45, 4],
    [55, 8],
    [65, 13],
    [75, 18],
    [85, 22],
    [95, 25],
    
    // First inflection - curve starts reversing
    [105, 27],
    [115, 28],
    [125, 27],
    [135, 25],
    [145, 22],
    
    // Second major curve - downward sweep (opposite direction)
    [155, 18],
    [165, 13],
    [175, 7],
    [185, 0],
    [195, -8],
    [205, -16],
    [215, -24],
    
    // Second inflection - curve reversing again
    [225, -30],
    [235, -34],
    [245, -36],
    [255, -36],
    [265, -34],
    
    // Third curve - upward again but smaller amplitude
    [275, -30],
    [285, -25],
    [295, -19],
    [305, -12],
    [315, -4],
    [325, 3],
    [335, 8],
    
    // Fourth and final curve - downward sweep toward tail
    [345, 11],
    [355, 12],
    [365, 11],
    [375, 8],
    [385, 4],
    [395, 0],
    [405, -3],
    [415, -5],
    
    // Tail region - final small curves and taper
    [425, -6],
    [435, -6],
    [445, -5],
    [455, -3],
    [465, 0],
    [475, 2],
    [485, 3],
    [495, 3],
    [505, 2],
    [515, 1],
    [525, 0]
  ];
  
  return centerlinePoints;
}

// Generate radius profile that matches a real eel
function generateEelRadiusProfile(centerlineLength) {
  console.log('📏 Generating natural radius profile...');
  
  const radii = [];
  
  for (let i = 0; i < centerlineLength; i++) {
    const t = i / (centerlineLength - 1);
    
    // Head region (0-15%): prominent bulge
    const headBump = t <= 0.15 ? 
      8 * (1 - Math.pow((t - 0.08) / 0.08, 2)) : 0;
      
    // Body taper (exponential decay)
    const bodyRadius = 12 * Math.exp(-t * 2.5);
    
    // Minimum tail thickness
    const minRadius = 0.5;
    
    const radius = Math.max(minRadius, headBump + bodyRadius);
    radii.push(radius);
  }
  
  return radii;
}

// Convert to 3D with natural undulation and twisting motion
function add3DUndulation(centerline2D) {
  console.log('🌊 Adding 3D undulation with serpentine twisting...');
  
  return centerline2D.map(([x, y], i) => {
    const t = i / (centerline2D.length - 1);
    
    // Multiple frequency components for more natural motion
    // Primary undulation - main swimming wave
    const primaryWave = 8 * Math.sin(t * Math.PI * 3.5) * Math.exp(-t * 0.8);
    
    // Secondary undulation - higher frequency detail
    const secondaryWave = 3 * Math.sin(t * Math.PI * 7) * Math.exp(-t * 1.2);
    
    // Tertiary undulation - even higher frequency for fine detail
    const tertiaryWave = 1.5 * Math.sin(t * Math.PI * 12) * Math.exp(-t * 1.5);
    
    // Combine all wave components
    const z = primaryWave + secondaryWave + tertiaryWave;
    
    // Add slight rotational component to create twist
    // The eel's body rotates slightly as it undulates
    const rotationPhase = t * Math.PI * 2.5;
    const rotationAmount = 0.3 * Math.sin(rotationPhase) * Math.exp(-t * 1.0);
    
    // Apply rotation to the existing Y displacement
    const cos_r = Math.cos(rotationAmount);
    const sin_r = Math.sin(rotationAmount);
    
    // Rotate the cross-section slightly
    const y_rotated = y * cos_r - z * sin_r * 0.3;
    const z_rotated = z * cos_r + y * sin_r * 0.3;
    
    return [x, y_rotated, z_rotated];
  });
}

// Generate the final shape data in a format our web app can use
function generateShapeData(centerline3D, radiusProfile) {
  console.log('🎯 Generating final shape data...');
  
  const segmentsPerRing = 8;
  const positions = [];
  const edges = [];
  
  // Generate tube geometry
  for (let i = 0; i < centerline3D.length; i++) {
    const [cx, cy, cz] = centerline3D[i];
    const radius = radiusProfile[i];
    
    // Calculate local coordinate frame (simplified)
    let tangent = [1, 0, 0]; // Default
    if (i < centerline3D.length - 1) {
      const next = centerline3D[i + 1];
      tangent = [
        next[0] - cx,
        next[1] - cy,
        next[2] - cz
      ];
      const len = Math.sqrt(tangent[0]**2 + tangent[1]**2 + tangent[2]**2);
      if (len > 0) {
        tangent = [tangent[0]/len, tangent[1]/len, tangent[2]/len];
      }
    }
    
    // Generate perpendicular vectors
    const up = [0, 0, 1];
    const right = [
      tangent[1] * up[2] - tangent[2] * up[1],
      tangent[2] * up[0] - tangent[0] * up[2],
      tangent[0] * up[1] - tangent[1] * up[0]
    ];
    const rightLen = Math.sqrt(right[0]**2 + right[1]**2 + right[2]**2);
    if (rightLen > 0) {
      right[0] /= rightLen;
      right[1] /= rightLen;
      right[2] /= rightLen;
    }
    
    const forward = [
      right[1] * tangent[2] - right[2] * tangent[1],
      right[2] * tangent[0] - right[0] * tangent[2],
      right[0] * tangent[1] - right[1] * tangent[0]
    ];
    
    // Generate circle points
    for (let j = 0; j < segmentsPerRing; j++) {
      const angle = (j / segmentsPerRing) * 2 * Math.PI;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      
      const x = cx + radius * (cosA * right[0] + sinA * forward[0]);
      const y = cy + radius * (cosA * right[1] + sinA * forward[1]);
      const z = cz + radius * (cosA * right[2] + sinA * forward[2]);
      
      positions.push([x, y, z]);
    }
  }
  
  // Generate edges
  for (let i = 0; i < centerline3D.length; i++) {
    const ringStart = i * segmentsPerRing;
    
    // Around each ring
    for (let j = 0; j < segmentsPerRing; j++) {
      const current = ringStart + j;
      const next = ringStart + ((j + 1) % segmentsPerRing);
      edges.push([current, next]);
    }
    
    // Between rings
    if (i < centerline3D.length - 1) {
      const nextRingStart = (i + 1) * segmentsPerRing;
      for (let j = 0; j < segmentsPerRing; j++) {
        const current = ringStart + j;
        const nextRing = nextRingStart + j;
        edges.push([current, nextRing]);
      }
    }
  }
  
  return { positions, edges, centerline: centerline3D };
}

// Main execution
function main() {
  console.log('🐍 Starting Eel Tracer...\n');
  
  try {
    // Step 1: Trace centerline
    const centerline2D = traceEelCenterline();
    console.log(`✅ Traced ${centerline2D.length} centerline points\n`);
    
    // Step 2: Generate radius profile
    const radiusProfile = generateEelRadiusProfile(centerline2D.length);
    console.log(`✅ Generated radius profile with ${radiusProfile.length} values\n`);
    
    // Step 3: Add 3D undulation
    const centerline3D = add3DUndulation(centerline2D);
    console.log(`✅ Added 3D undulation\n`);
    
    // Step 4: Generate shape data
    const shapeData = generateShapeData(centerline3D, radiusProfile);
    console.log(`✅ Generated shape with ${shapeData.positions.length} vertices and ${shapeData.edges.length} edges\n`);
    
    // Step 5: Save results
    const outputDir = path.join(__dirname, '..', 'public', 'data');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputFile = path.join(outputDir, 'traced-eel.json');
    const output = {
      metadata: {
        source: 'hand-traced from reference eel image',
        timestamp: new Date().toISOString(),
        vertices: shapeData.positions.length,
        edges: shapeData.edges.length
      },
      positions: shapeData.positions,
      edges: shapeData.edges,
      centerline: shapeData.centerline,
      radiusProfile: radiusProfile
    };
    
    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
    console.log(`✅ Saved traced eel data to: ${outputFile}\n`);
    
    // Step 6: Generate simple polyline for manual use
    const polylineFile = path.join(outputDir, 'eel-centerline-simple.txt');
    const polylineData = centerline2D.map(([x, y]) => `${x},${y}`).join(' ');
    fs.writeFileSync(polylineFile, polylineData);
    console.log(`✅ Saved simple polyline to: ${polylineFile}\n`);
    
    console.log('🎉 Eel tracing complete!');
    console.log('\nNext steps:');
    console.log('1. Use traced-eel.json for full 3D shape data');
    console.log('2. Use eel-centerline-simple.txt for simple polyline import');
    console.log('3. Update your web app to load this data instead of generating it');
    
  } catch (error) {
    console.error('❌ Error during tracing:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { traceEelCenterline, generateEelRadiusProfile, add3DUndulation, generateShapeData };
