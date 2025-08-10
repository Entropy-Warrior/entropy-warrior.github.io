// Mathematical equations for each layout (in LaTeX format for KaTeX)
// Abstract notation without specific numbers
export const LAYOUT_EQUATIONS: Record<string, string> = {
  'Tensor': 'f(i) = a \\cdot (i \\div d) \\bmod n + \\varepsilon',
  'DiskGalaxy': 'f(t) = \\sqrt{t} \\cdot r \\cdot e^{i\\omega t}',
  'Graph': 'f(i,c) = r_c \\cdot s(i/n) \\cdot e^{i\\phi} + c',
  'MobiusRibbon': 'f(u,v) = c(u) + v \\cdot r(u/\\alpha) \\cdot \\vec{n}(u)',
  'Wormhole': 'f(u,v) = r(v) A(v,u) [\\cos(u + \\sigma v), \\sin(u + \\sigma v), hv]',
  'DoubleHelix': 'f(t,s) = r[\\cos(\\omega t + s\\pi), \\sin(\\omega t + s\\pi), ht]',
  'TorusKnot': 'f(t) = [(R + r\\cos qt)\\cos pt, (R + r\\cos qt)\\sin pt, r\\sin qt]',
  'KleinBottle': 'f(u,v) = [x(u,v), y(u,v), z(u,v)]',
  'Spherical': 'f(\\theta,\\phi) = r(\\theta,\\phi)[\\sin\\theta\\cos\\phi, \\sin\\theta\\sin\\phi, \\cos\\theta]',
  'Hypercube': 'f: \\mathbb{R}^4 \\to \\mathbb{R}^3'
};

// Detailed descriptions for each layout (optional, for tooltips or expanded view)
export const LAYOUT_DESCRIPTIONS: Record<string, string> = {
  'Tensor': '9³ cubic lattice in 3D space',
  'DiskGalaxy': 'Flat spiral galaxy with random parameters',
  'Graph': 'Golden ratio clusters with 3D distribution',
  'MobiusRibbon': 'Möbius strip with continuous twist',
  'Wormhole': 'Twisted asymmetric hyperboloid',
  'DoubleHelix': 'Classic DNA double helix structure',
  'TorusKnot': '(p,q)-knot wrapping around a torus',
  'KleinBottle': 'Non-orientable surface - inside becomes outside',
  'Spherical': 'Spherical harmonics on sphere surface',
  'Hypercube': '4D tesseract projected to 3D space'
};