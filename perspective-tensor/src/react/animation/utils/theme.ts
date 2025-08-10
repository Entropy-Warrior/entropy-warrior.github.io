// ═══════════════════════════════════════════════════════════════
// THEME UTILITIES - AUTOMATIC COLOR CONVERSION
// ═══════════════════════════════════════════════════════════════

export type ThemeColor = {
  dark: string;
  light?: string; // Optional - will be auto-generated if not provided
}

export type ThemeColors = {
  pointColor: ThemeColor;
  edgeColor: ThemeColor;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
}

/**
 * Convert RGB to hex color
 */
function rgbToHex(r: number, g: number, b: number): string {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/**
 * Convert RGB to HSL
 */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  
  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Convert HSL to RGB
 */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360;
  s /= 100;
  l /= 100;
  
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

/**
 * Automatically convert dark theme color to light theme color
 * Uses intelligent color transformation based on HSL values
 */
export function darkToLight(darkColor: string): string {
  const rgb = hexToRgb(darkColor);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  
  // Intelligent conversion rules:
  let newL = hsl.l;
  let newS = hsl.s;
  
  if (hsl.l > 70) {
    // Very bright colors in dark theme -> make darker for light theme
    newL = Math.max(20, hsl.l - 50);
    newS = Math.min(100, hsl.s * 1.2); // Increase saturation
  } else if (hsl.l > 50) {
    // Medium bright colors -> invert and adjust
    newL = Math.max(15, 85 - hsl.l);
    newS = Math.min(100, hsl.s * 1.1);
  } else if (hsl.l > 30) {
    // Medium colors -> keep similar but darker
    newL = Math.max(10, hsl.l - 20);
    newS = Math.min(100, hsl.s * 1.15);
  } else {
    // Dark colors in dark theme -> make much brighter for light theme
    newL = Math.min(70, 70 - hsl.l);
    newS = Math.max(20, hsl.s * 0.8); // Reduce saturation for pastel effect
  }
  
  // Special handling for grays (low saturation)
  if (hsl.s < 10) {
    newL = hsl.l > 50 ? 30 : 70; // Simple inversion for grays
    newS = hsl.s;
  }
  
  // Special handling for pure white/black
  if (darkColor === '#ffffff' || darkColor === '#fff') {
    return '#000000';
  }
  if (darkColor === '#000000' || darkColor === '#000') {
    return '#ffffff';
  }
  
  const newRgb = hslToRgb(hsl.h, newS, newL);
  return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
}

/**
 * Get the appropriate color for the current theme
 */
export function getThemeColor(themeColor: ThemeColor | string, currentTheme: 'dark' | 'light'): string {
  // Handle simple string color (backwards compatibility)
  if (typeof themeColor === 'string') {
    if (currentTheme === 'dark') {
      return themeColor;
    } else {
      return darkToLight(themeColor);
    }
  }
  
  // Handle ThemeColor object
  if (currentTheme === 'dark') {
    return themeColor.dark;
  } else {
    // Use light color if specified, otherwise auto-convert
    return themeColor.light || darkToLight(themeColor.dark);
  }
}

/**
 * Create a ThemeColor object from a dark color with optional light override
 */
export function createThemeColor(dark: string, light?: string): ThemeColor {
  return { dark, light };
}

/**
 * Default theme colors for the application
 */
export const DEFAULT_THEME_COLORS: ThemeColors = {
  pointColor: createThemeColor('#ffffff'),     // White in dark -> Black in light
  edgeColor: createThemeColor('#00ffff'),      // Cyan in dark -> Dark cyan in light
};