#!/usr/bin/env node

/**
 * SVG to 3D Eel Tracer
 * Properly converts 2D SVG traced eel outline into a realistic 3D shape
 * 
 * Pipeline:
 * 1. Parse actual SVG polyline/path data
 * 2. Extract centerline points in 2D
 * 3. Add proper 3D depth and thickness
 * 4. Generate tube geometry with varying radius
 * 5. Add realistic eel head structure
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parse SVG polyline points from the actual SVG file
 */
function parseSVGCenterline() {
  console.log('📖 Reading SVG file...');
  
  const svgPath = path.join(__dirname, '../public/images/eel-outline.svg');
  const svgContent = fs.readFileSync(svgPath, 'utf8');
  
  // Extract polyline points attribute
  const polylineMatch = svgContent.match(/points="([^"]+)"/);
  if (!polylineMatch) {
    throw new Error('No polyline points found in SVG');
  }
  
  const pointsString = polylineMatch[1];
  const points = [];
  
  // Parse "x,y x,y x,y" format
  const coords = pointsString.trim().split(/\s+/);
  for (const coord of coords) {
    const [x, y] = coord.split(',').map(Number);
    if (!isNaN(x) && !isNaN(y)) {
      points.push([x, y]);
    }
  }
  
  console.log(`✅ Parsed ${points.length} centerline points from SVG`);
  return points;
}

/**
 * Normalize and smooth the 2D centerline
 */
function normalizeCenterline(points) {
  console.log('🔧 Normalizing 2D centerline...');
  
  // Find bounds
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  
  for (const [x, y] of points) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  
  const width = maxX - minX;
  const height = maxY - minY;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  
  // Normalize to [-1, 1] range, preserving aspect ratio
  const scale = 20 / Math.max(width, height); // Scale to reasonable 3D size
  
  const normalized = points.map(([x, y]) => [
    (x - centerX) * scale,
    (y - centerY) * scale
  ]);
  
  console.log(`✅ Normalized ${normalized.length} points (bounds: ${width.toFixed(1)}x${height.toFixed(1)})`);
  return normalized;
}

/**
 * Convert 2D centerline to 3D with proper depth variation
 * This is the key improvement - adding realistic 3D structure
 */
function centerlineTo3D(points2D) {
  console.log('🌊 Converting 2D to 3D with depth variation...');
  
  const points3D = [];
  const totalPoints = points2D.length;
  
  for (let i = 0; i < totalPoints; i++) {
    const [x, y] = points2D[i];
    const t = i / (totalPoints - 1); // Parameter along spine (0 to 1)
    
    // Add sophisticated Z-depth based on eel swimming motion
    let z = 0;
    
    // Primary swimming undulation - eels move in S-curves
    z += 3.0 * Math.sin(t * Math.PI * 2.5 + Math.PI/4) * Math.exp(-t * 0.3);
    
    // Secondary motion - smaller frequency undulation
    z += 1.5 * Math.sin(t * Math.PI * 6.0 + Math.PI/2) * Math.exp(-t * 0.6);
    
    // Tail motion - more dramatic at the end
    if (t > 0.6) {
      z += 2.0 * Math.sin(t * Math.PI * 8.0) * (t - 0.6) * Math.exp(-t * 0.8);
    }
    
    // Add slight twist along the body
    const twist = 0.5 * Math.sin(t * Math.PI * 3.0) * Math.exp(-t * 0.4);
    const yTwisted = y * Math.cos(twist) - z * Math.sin(twist) * 0.3;
    const zTwisted = z * Math.cos(twist) + y * Math.sin(twist) * 0.2;
    
    points3D.push([x, yTwisted, zTwisted]);
  }
  
  console.log(`✅ Generated 3D centerline with ${points3D.length} points`);
  return points3D;
}

/**
 * Generate radius profile for realistic eel proportions
 */
function generateEelRadiusProfile(centerline3D) {
  console.log('📏 Generating realistic eel radius profile...');
  
  const radii = [];
  const totalPoints = centerline3D.length;
  
  for (let i = 0; i < totalPoints; i++) {
    const t = i / (totalPoints - 1);
    
    // Base radius with realistic eel proportions
    let radius = 2.5; // Base body radius
    
    // Head structure
    if (t < 0.05) {
      // Pointed snout
      radius = 0.3 + t * 4.0; // 0.3 to 0.5
    } else if (t < 0.15) {
      // Head expansion
      const headT = (t - 0.05) / 0.10;
      radius = 0.5 + headT * 2.5; // 0.5 to 3.0
    } else if (t < 0.25) {
      // Neck to body transition
      const neckT = (t - 0.15) / 0.10;
      radius = 3.0 + neckT * 1.0; // 3.0 to 4.0
    } else if (t < 0.8) {
      // Main body - gradually tapering
      const bodyT = (t - 0.25) / 0.55;
      radius = 4.0 * (1.0 - bodyT * 0.3); // 4.0 to 2.8
    } else {
      // Tail taper
      const tailT = (t - 0.8) / 0.2;
      radius = 2.8 * (1.0 - tailT * 0.85); // 2.8 to 0.42
    }
    
    // Add slight variation for organic feel
    radius += 0.1 * Math.sin(t * Math.PI * 12) * Math.exp(-t * 0.5);
    
    radii.push(Math.max(0.2, radius));
  }
  
  console.log(`✅ Generated radius profile: ${radii[0].toFixed(2)} to ${radii[radii.length-1].toFixed(2)}`);
  return radii;
}

/**
 * Generate 3D tube geometry from centerline and radius profile
 */
function generateTubeGeometry(centerline3D, radiusProfile, targetVertices = 1200) {
  console.log(`🔮 Generating 3D tube geometry (target: ${targetVertices} vertices)...`);
  
  const positions = [];
  const edges = [];
  
  // Calculate optimal segments per ring
  const centerlineLength = centerline3D.length;
  const segmentsPerRing = Math.max(8, Math.floor(Math.sqrt(targetVertices / centerlineLength)));
  const adjustedCenterlineLength = Math.floor(targetVertices / segmentsPerRing);
  
  console.log(`Using ${segmentsPerRing} segments per ring, ${adjustedCenterlineLength} rings`);
  
  // Subsample centerline if needed
  const sampledCenterline = [];
  const sampledRadii = [];
  for (let i = 0; i < adjustedCenterlineLength; i++) {
    const originalIndex = Math.floor((i / (adjustedCenterlineLength - 1)) * (centerlineLength - 1));
    sampledCenterline.push(centerline3D[originalIndex]);
    sampledRadii.push(radiusProfile[originalIndex]);
  }
  
  // Generate tube geometry
  for (let i = 0; i < sampledCenterline.length; i++) {
    const [cx, cy, cz] = sampledCenterline[i];
    const radius = sampledRadii[i];
    const t = i / (sampledCenterline.length - 1);
    
    // Calculate tangent vector for proper orientation
    let tangent = [1, 0, 0]; // Default forward
    if (i < sampledCenterline.length - 1) {
      const next = sampledCenterline[i + 1];
      tangent = [next[0] - cx, next[1] - cy, next[2] - cz];
    } else if (i > 0) {
      const prev = sampledCenterline[i - 1];
      tangent = [cx - prev[0], cy - prev[1], cz - prev[2]];
    }
    
    // Normalize tangent
    const tLen = Math.sqrt(tangent[0]**2 + tangent[1]**2 + tangent[2]**2);
    if (tLen > 0) {
      tangent = [tangent[0]/tLen, tangent[1]/tLen, tangent[2]/tLen];
    }
    
    // Create local coordinate system
    const up = [0, 0, 1]; // World up
    let normal = [
      tangent[1] * up[2] - tangent[2] * up[1],
      tangent[2] * up[0] - tangent[0] * up[2],
      tangent[0] * up[1] - tangent[1] * up[0]
    ];
    
    // Handle parallel case
    const nLen = Math.sqrt(normal[0]**2 + normal[1]**2 + normal[2]**2);
    if (nLen < 1e-6) {
      normal = [1, 0, 0]; // Fallback
    } else {
      normal = [normal[0]/nLen, normal[1]/nLen, normal[2]/nLen];
    }
    
    let binormal = [
      normal[1] * tangent[2] - normal[2] * tangent[1],
      normal[2] * tangent[0] - normal[0] * tangent[2],
      normal[0] * tangent[1] - normal[1] * tangent[0]
    ];
    const bLen = Math.sqrt(binormal[0]**2 + binormal[1]**2 + binormal[2]**2);
    if (bLen > 0) {
      binormal = [binormal[0]/bLen, binormal[1]/bLen, binormal[2]/bLen];
    }
    
    // Generate ring of vertices
    for (let j = 0; j < segmentsPerRing; j++) {
      const angle = (j / segmentsPerRing) * 2 * Math.PI;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      
      // Apply head shape modifications for realism
      let localRadius = radius;
      if (t < 0.05) {
        // Pointed snout - compress vertically
        if (Math.abs(sinA) > 0.7) localRadius *= 0.6;
      } else if (t < 0.15) {
        // Head - slightly flattened but still round
        if (Math.abs(sinA) > 0.8) localRadius *= 0.8;
      }
      
      const localX = cosA * localRadius;
      const localY = sinA * localRadius;
      
      const worldX = cx + localX * normal[0] + localY * binormal[0];
      const worldY = cy + localX * normal[1] + localY * binormal[1];
      const worldZ = cz + localX * normal[2] + localY * binormal[2];
      
      positions.push([worldX, worldY, worldZ]);
    }
  }
  
  // Generate edges (ring connections and longitudinal connections)
  for (let i = 0; i < adjustedCenterlineLength; i++) {
    for (let j = 0; j < segmentsPerRing; j++) {
      const idx = i * segmentsPerRing + j;
      
      // Ring connections
      const nextJ = (j + 1) % segmentsPerRing;
      const nextRingIdx = i * segmentsPerRing + nextJ;
      edges.push([idx, nextRingIdx]);
      
      // Longitudinal connections
      if (i < adjustedCenterlineLength - 1) {
        const nextI = (i + 1) * segmentsPerRing + j;
        edges.push([idx, nextI]);
      }
    }
  }
  
  console.log(`✅ Generated ${positions.length} vertices, ${edges.length} edges`);
  return { positions, edges };
}

/**
 * Main function to trace SVG to 3D eel
 */
function traceSVGTo3DEel() {
  console.log('🐍 Starting SVG to 3D Eel conversion...\n');
  
  try {
    // Step 1: Parse actual SVG centerline
    const centerline2D = parseSVGCenterline();
    
    // Step 2: Normalize and prepare 2D data  
    const normalizedCenterline = normalizeCenterline(centerline2D);
    
    // Step 3: Convert to 3D with realistic depth
    const centerline3D = centerlineTo3D(normalizedCenterline);
    
    // Step 4: Generate radius profile
    const radiusProfile = generateEelRadiusProfile(centerline3D);
    
    // Step 5: Generate 3D tube geometry
    const { positions, edges } = generateTubeGeometry(centerline3D, radiusProfile, 1200);
    
    // Step 6: Save output
    const outputData = {
      positions,
      edges,
      metadata: {
        vertices: positions.length,
        edges: edges.length,
        type: 'svg-traced-3d-eel',
        source: 'eel-outline.svg',
        description: 'Properly traced 3D eel from SVG with realistic depth and proportions'
      }
    };
    
    const outputPath = path.join(__dirname, '../public/data/svg-traced-3d-eel.json');
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    
    console.log(`\n🎉 SUCCESS! SVG traced to 3D eel:`);
    console.log(`   📍 Vertices: ${positions.length}`);
    console.log(`   🔗 Edges: ${edges.length}`);
    console.log(`   💾 Saved: ${outputPath}`);
    console.log(`   🎯 Type: Realistic 3D eel from SVG trace`);
    
  } catch (error) {
    console.error('❌ Error during SVG to 3D conversion:', error.message);
    process.exit(1);
  }
}

// Run the tracer
traceSVGTo3DEel();
