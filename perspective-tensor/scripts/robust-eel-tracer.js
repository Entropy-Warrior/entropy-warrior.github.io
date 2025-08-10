#!/usr/bin/env node

/**
 * Robust Eel Tracer using flo-mat for medial axis transform
 * Converts SVG outline into accurate centerline using proven algorithms
 * Usage: node scripts/robust-eel-tracer.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { findMats, getPathsFromStr, simplifyMat } from 'flo-mat';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Extract SVG path data from file
 */
function extractSvgPaths(svgContent) {
  console.log('📄 Extracting SVG path data...');
  
  // Extract path elements from SVG
  const pathMatches = svgContent.matchAll(/<path[^>]*d=["']([^"']+)["'][^>]*>/g);
  const paths = [];
  
  for (const match of pathMatches) {
    paths.push(match[1]);
  }
  
  console.log(`✅ Found ${paths.length} path(s)`);
  return paths;
}

/**
 * Convert SVG path to loop format for flo-mat
 */
function pathToLoop(pathStr) {
  console.log('🔄 Converting SVG path to loop format...');
  
  try {
    // Use flo-mat's built-in path parser
    const loops = getPathsFromStr(pathStr);
    console.log(`✅ Converted to ${loops.length} loop(s)`);
    return loops;
  } catch (error) {
    console.warn('⚠️ flo-mat path parsing failed, falling back to manual parser');
    return manualPathToLoop(pathStr);
  }
}

/**
 * Manual SVG path parser as fallback
 */
function manualPathToLoop(pathStr) {
  const points = [];
  const commands = pathStr.match(/[MmLlCcZz][^MmLlCcZz]*/g) || [];
  
  let currentPoint = [0, 0];
  
  for (const command of commands) {
    const type = command[0];
    const coords = command.slice(1).trim().split(/[\s,]+/).map(parseFloat).filter(n => !isNaN(n));
    
    switch (type.toUpperCase()) {
      case 'M': // Move to
        if (coords.length >= 2) {
          currentPoint = type === 'M' ? [coords[0], coords[1]] : [currentPoint[0] + coords[0], currentPoint[1] + coords[1]];
          points.push(currentPoint);
        }
        break;
      case 'L': // Line to
        if (coords.length >= 2) {
          currentPoint = type === 'L' ? [coords[0], coords[1]] : [currentPoint[0] + coords[0], currentPoint[1] + coords[1]];
          points.push(currentPoint);
        }
        break;
      case 'C': // Cubic Bezier - sample the curve
        if (coords.length >= 6) {
          const p1 = type === 'C' ? [coords[0], coords[1]] : [currentPoint[0] + coords[0], currentPoint[1] + coords[1]];
          const p2 = type === 'C' ? [coords[2], coords[3]] : [currentPoint[0] + coords[2], currentPoint[1] + coords[3]];
          const p3 = type === 'C' ? [coords[4], coords[5]] : [currentPoint[0] + coords[4], currentPoint[1] + coords[5]];
          
          // Sample the curve
          for (let t = 0.1; t <= 1; t += 0.1) {
            const nt = 1 - t;
            const x = nt*nt*nt*currentPoint[0] + 3*nt*nt*t*p1[0] + 3*nt*t*t*p2[0] + t*t*t*p3[0];
            const y = nt*nt*nt*currentPoint[1] + 3*nt*nt*t*p1[1] + 3*nt*t*t*p2[1] + t*t*t*p3[1];
            points.push([x, y]);
          }
          currentPoint = p3;
        }
        break;
    }
  }
  
  // Convert to simple polygon for medial axis
  // flo-mat expects loops as arrays of bezier curves, but for simple polygons we can use linear beziers
  const beziers = [];
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    // Linear bezier: [p1, p1, p2, p2]
    beziers.push([p1, p1, p2, p2]);
  }
  
  return [beziers]; // Return as single loop
}

/**
 * Extract centerline from medial axis transform
 */
function extractCenterlineFromMAT(mats) {
  console.log('🎯 Extracting centerline from medial axis transform...');
  
  if (!mats || mats.length === 0) {
    console.warn('⚠️ No MAT found, using fallback method');
    return { centerline: [], radiusProfile: [] };
  }
  
  const centerline = [];
  const radiusProfile = [];
  
  // Get the main medial axis (usually the longest branch)
  let mainBranch = null;
  let maxLength = 0;
  
  for (const mat of mats) {
    try {
      // Traverse the MAT to find branches
      const vertices = [];
      
      // Simple traversal to collect MAT vertices
      const traverse = (cpNode, visited = new Set()) => {
        if (!cpNode || visited.has(cpNode)) return;
        visited.add(cpNode);
        
        // Add the circle center and radius
        if (cpNode.cp && cpNode.cp.circle) {
          const circle = cpNode.cp.circle;
          vertices.push({
            center: [circle.center.x, circle.center.y],
            radius: circle.radius
          });
        }
        
        // Traverse children
        if (cpNode.children) {
          for (const child of cpNode.children) {
            traverse(child, visited);
          }
        }
      };
      
      // Start traversal from MAT root
      if (mat.root) {
        traverse(mat.root);
      }
      
      if (vertices.length > maxLength) {
        maxLength = vertices.length;
        mainBranch = vertices;
      }
    } catch (error) {
      console.warn('⚠️ Error traversing MAT:', error.message);
    }
  }
  
  if (mainBranch && mainBranch.length > 0) {
    console.log(`✅ Found main branch with ${mainBranch.length} points`);
    
    // Sort by some criteria (e.g., x-coordinate for horizontal eel)
    mainBranch.sort((a, b) => a.center[0] - b.center[0]);
    
    for (const vertex of mainBranch) {
      centerline.push(vertex.center);
      radiusProfile.push(vertex.radius);
    }
  }
  
  return { centerline, radiusProfile };
}

/**
 * Smooth and enhance the centerline
 */
function smoothCenterline(centerline, samplesPerSegment = 3) {
  if (centerline.length < 3) return centerline;
  
  console.log('🌊 Smoothing centerline with Catmull-Rom splines...');
  
  const smoothed = [];
  
  // Catmull-Rom spline interpolation
  for (let i = 0; i < centerline.length - 1; i++) {
    const p0 = centerline[Math.max(0, i - 1)];
    const p1 = centerline[i];
    const p2 = centerline[i + 1];
    const p3 = centerline[Math.min(centerline.length - 1, i + 2)];
    
    for (let j = 0; j < samplesPerSegment; j++) {
      const t = j / samplesPerSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      
      const x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + 
                      (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + 
                      (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
      
      const y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + 
                      (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + 
                      (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
      
      smoothed.push([x, y]);
    }
  }
  
  // Add the last point
  smoothed.push(centerline[centerline.length - 1]);
  
  console.log(`✅ Smoothed to ${smoothed.length} points`);
  return smoothed;
}

/**
 * Add realistic 3D undulation with proper serpentine motion
 */
function add3DUndulation(centerline2D) {
  console.log('🐍 Adding serpentine 3D undulation...');
  
  return centerline2D.map(([x, y], i) => {
    const t = i / (centerline2D.length - 1);
    
    // Multiple frequency components for realistic eel motion
    const primaryWave = 12 * Math.sin(t * Math.PI * 4) * Math.exp(-t * 0.6);
    const secondaryWave = 6 * Math.sin(t * Math.PI * 8 + Math.PI/3) * Math.exp(-t * 1.0);
    const tertiaryWave = 3 * Math.sin(t * Math.PI * 16 + Math.PI/6) * Math.exp(-t * 1.4);
    
    // Body twist - eels rotate as they undulate
    const twistPhase = t * Math.PI * 3;
    const twistAmount = 0.4 * Math.sin(twistPhase) * Math.exp(-t * 0.8);
    
    // Combine waves
    let z = primaryWave + secondaryWave + tertiaryWave;
    
    // Apply twist to create more realistic motion
    const cos_twist = Math.cos(twistAmount);
    const sin_twist = Math.sin(twistAmount);
    
    const y_twisted = y * cos_twist - z * sin_twist * 0.5;
    const z_twisted = z * cos_twist + y * sin_twist * 0.3;
    
    return [x, y_twisted, z_twisted];
  });
}

/**
 * Generate radius profile
 */
function generateRadiusProfile(centerlineLength, matRadii = null) {
  console.log('📏 Generating radius profile...');
  
  const radii = [];
  
  for (let i = 0; i < centerlineLength; i++) {
    const t = i / (centerlineLength - 1);
    
    // Use MAT radii if available, otherwise generate natural taper
    let radius;
    if (matRadii && matRadii[i]) {
      radius = matRadii[i] * 0.8; // Scale down a bit
    } else {
      // Natural eel taper: thick head, thinner toward tail
      const headTaper = Math.exp(-t * 3); // Head bulge
      const bodyTaper = 1 - t * 0.7; // Gradual body taper
      const tailTaper = Math.exp(-(1-t) * 8); // Sharp tail taper
      
      radius = 15 * (0.4 + 0.3 * headTaper + 0.5 * bodyTaper * tailTaper);
    }
    
    radii.push(Math.max(1, radius)); // Minimum radius
  }
  
  console.log(`✅ Generated ${radii.length} radius values`);
  return radii;
}

/**
 * Generate 3D tube geometry
 */
function generateTubeGeometry(centerline3D, radiusProfile) {
  console.log('🎯 Generating 3D tube geometry...');
  
  const segmentsPerRing = 8;
  const positions = [];
  const edges = [];
  
  for (let i = 0; i < centerline3D.length; i++) {
    const [cx, cy, cz] = centerline3D[i];
    const radius = radiusProfile[i];
    
    // Calculate local frame
    let tangent = [1, 0, 0];
    if (i < centerline3D.length - 1) {
      const next = centerline3D[i + 1];
      tangent = [next[0] - cx, next[1] - cy, next[2] - cz];
      const len = Math.sqrt(tangent[0]**2 + tangent[1]**2 + tangent[2]**2);
      if (len > 0) {
        tangent = [tangent[0]/len, tangent[1]/len, tangent[2]/len];
      }
    }
    
    // Generate ring of vertices
    const ringStart = i * segmentsPerRing;
    for (let j = 0; j < segmentsPerRing; j++) {
      const angle = (j / segmentsPerRing) * 2 * Math.PI;
      
      // Simple perpendicular vectors
      const perpY = Math.cos(angle) * radius;
      const perpZ = Math.sin(angle) * radius;
      
      positions.push([cx, cy + perpY, cz + perpZ]);
    }
    
    // Generate edges
    for (let j = 0; j < segmentsPerRing; j++) {
      const current = ringStart + j;
      const next = ringStart + ((j + 1) % segmentsPerRing);
      edges.push([current, next]);
    }
    
    // Connect to next ring
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
  console.log('\n🐍 Starting Robust Eel Tracer with flo-mat...\n');
  
  try {
    // Step 1: Read SVG file
    const svgPath = path.join(__dirname, '..', 'public', 'images', 'eel-outline.svg');
    const svgContent = fs.readFileSync(svgPath, 'utf-8');
    console.log(`✅ Loaded SVG from: ${svgPath}`);
    
    // Step 2: Extract SVG paths
    const pathStrings = extractSvgPaths(svgContent);
    if (pathStrings.length === 0) {
      throw new Error('No SVG paths found');
    }
    
    // Step 3: Convert to loops for MAT computation
    const loops = [];
    for (const pathStr of pathStrings) {
      const pathLoops = pathToLoop(pathStr);
      loops.push(...pathLoops);
    }
    console.log(`✅ Converted to ${loops.length} loop(s) for MAT computation`);
    
    // Step 4: Compute Medial Axis Transform
    console.log('🔬 Computing Medial Axis Transform...');
    let mats;
    try {
      mats = findMats(loops);
      console.log(`✅ Computed MAT with ${mats ? mats.length : 0} branches`);
    } catch (error) {
      console.warn('⚠️ MAT computation failed:', error.message);
      console.log('📝 Falling back to simple centerline generation...');
      mats = null;
    }
    
    // Step 5: Extract centerline
    let centerlineData;
    if (mats && mats.length > 0) {
      centerlineData = extractCenterlineFromMAT(mats);
    } else {
      // Fallback: use our existing manual tracing
      console.log('📝 Using fallback centerline generation...');
      centerlineData = {
        centerline: [
          [0, 0], [25, -1], [50, 5], [75, 15], [100, 25], [125, 30],
          [150, 25], [175, 15], [200, 0], [225, -20], [250, -35],
          [275, -30], [300, -15], [325, 5], [350, 15], [375, 10],
          [400, 0], [425, -5], [450, -3], [475, 2], [500, 0]
        ],
        radiusProfile: []
      };
    }
    
    // Step 6: Smooth the centerline
    const smoothedCenterline = smoothCenterline(centerlineData.centerline, 2);
    
    // Step 7: Generate radius profile
    const radiusProfile = generateRadiusProfile(smoothedCenterline.length, centerlineData.radiusProfile);
    
    // Step 8: Add 3D undulation
    const centerline3D = add3DUndulation(smoothedCenterline);
    
    // Step 9: Generate tube geometry
    const tubeGeometry = generateTubeGeometry(centerline3D, radiusProfile);
    
    // Step 10: Save results
    const outputDir = path.join(__dirname, '..', 'public', 'data');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const output = {
      metadata: {
        source: 'robust MAT-based extraction using flo-mat',
        timestamp: new Date().toISOString(),
        vertices: tubeGeometry.positions.length,
        edges: tubeGeometry.edges.length,
        usedMAT: !!(mats && mats.length > 0)
      },
      positions: tubeGeometry.positions,
      edges: tubeGeometry.edges,
      centerline2D: smoothedCenterline,
      centerline3D: centerline3D,
      radiusProfile: radiusProfile
    };
    
    const outputFile = path.join(outputDir, 'robust-traced-eel.json');
    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
    console.log(`✅ Saved robust eel data to: ${outputFile}`);
    
    // Also save simple polyline
    const polylineFile = path.join(outputDir, 'robust-eel-centerline.txt');
    const polylineData = smoothedCenterline.map(([x, y]) => `${x},${y}`).join(' ');
    fs.writeFileSync(polylineFile, polylineData);
    console.log(`✅ Saved centerline to: ${polylineFile}`);
    
    console.log('\n🎉 Robust eel tracing complete!');
    console.log('\nResults:');
    console.log(`- Used MAT: ${output.metadata.usedMAT ? 'Yes' : 'No (fallback)'}`);
    console.log(`- Vertices: ${output.metadata.vertices}`);
    console.log(`- Edges: ${output.metadata.edges}`);
    console.log(`- Centerline points: ${smoothedCenterline.length}`);
    
  } catch (error) {
    console.error('❌ Error during robust tracing:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default main;
