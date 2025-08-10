import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ThreeJSRenderer } from "../animation/renderers/ThreeJSRenderer";
import type { IRenderer, RenderConfig } from "../animation/renderers/IRenderer";
import {
  generateTensor,
  generateGalaxy,
  generateGraph,
  generateMobiusRibbon,
  generateWormhole,
  generateDoubleHelix,
  generateTorusKnot,
  generateKleinBottle,
  generateSphere,
  generateHypercube,
  SHAPE_EQUATIONS,
} from "../animation/shapes/mathematical";
import {
  createBrownianOffsets,
  updateBrownianMotion,
} from "../animation/utils";
import {
  type ThemeColor,
  getThemeColor,
  darkToLight,
  DEFAULT_THEME_COLORS,
} from "../animation/utils/theme";

// Shape configuration
const SHAPES = {
  tensor: {
    generator: generateTensor,
    name: "Tensor",
    equation: SHAPE_EQUATIONS.tensor,
  },
  galaxy: {
    generator: generateGalaxy,
    name: "Galaxy",
    equation: SHAPE_EQUATIONS.galaxy,
  },
  graph: {
    generator: generateGraph,
    name: "Graph Network",
    equation: SHAPE_EQUATIONS.graph,
  },
  mobius: {
    generator: generateMobiusRibbon,
    name: "Möbius Ribbon",
    equation: SHAPE_EQUATIONS.mobius,
  },
  wormhole: {
    generator: generateWormhole,
    name: "Wormhole",
    equation: SHAPE_EQUATIONS.wormhole,
  },
  helix: {
    generator: generateDoubleHelix,
    name: "Double Helix",
    equation: SHAPE_EQUATIONS.helix,
  },
  torus: {
    generator: generateTorusKnot,
    name: "Torus Knot",
    equation: SHAPE_EQUATIONS.torus,
  },
  klein: {
    generator: generateKleinBottle,
    name: "Klein Bottle",
    equation: SHAPE_EQUATIONS.klein,
  },
  sphere: {
    generator: generateSphere,
    name: "Sphere",
    equation: SHAPE_EQUATIONS.sphere,
  },
  hypercube: {
    generator: generateHypercube,
    name: "Hypercube",
    equation: SHAPE_EQUATIONS.hypercube,
  },
};

// Collapsible Section Component
function CollapsibleSection({
  title,
  isExpanded,
  onToggle,
  children,
}: {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 border-b border-gray-200 dark:border-gray-800 pb-2">
      <button
        onClick={onToggle}
        className={`w-full p-2 bg-transparent text-gray-900 dark:text-gray-100 border-none border-b border-gray-200 dark:border-gray-800 cursor-pointer text-base font-medium text-left flex justify-between items-center hover:text-gray-600 dark:hover:text-gray-400 transition-colors ${
          isExpanded ? "mb-3" : "mb-0"
        }`}
      >
        {title}
        <span className="text-xs">{isExpanded ? "▼" : "▶"}</span>
      </button>
      {isExpanded && <div className="pl-2">{children}</div>}
    </div>
  );
}

// Slider with Base/Adjusted Value Component
interface SliderWithInputProps {
  label: string;
  baseValue: number;
  onBaseValueChange: (value: number) => void;
  onAdjustedValueChange?: (adjustedValue: number) => void;
  adjustmentPercent?: number;
  onAdjustmentChange?: (percent: number) => void;
  minBaseValue?: number;
  maxBaseValue?: number;
  baseStep?: number;
  minAdjustment?: number;
  maxAdjustment?: number;
  adjustmentStep?: number;
  displayFormat?: (value: number) => string;
}

function SliderWithInput({
  label,
  baseValue,
  onBaseValueChange,
  onAdjustedValueChange,
  adjustmentPercent: externalAdjustmentPercent,
  onAdjustmentChange: externalOnAdjustmentChange,
  minBaseValue = 0,
  maxBaseValue = 1000,
  baseStep = 0.1,
  minAdjustment = -50,
  maxAdjustment = 50,
  adjustmentStep = 1,
  displayFormat = (v) => v.toFixed(baseStep < 1 ? Math.ceil(-Math.log10(baseStep)) : 0),
}: SliderWithInputProps) {
  // Use internal state if external props not provided
  const [internalAdjustmentPercent, setInternalAdjustmentPercent] = useState(0);
  
  const adjustmentPercent = externalAdjustmentPercent ?? internalAdjustmentPercent;
  const onAdjustmentChange = externalOnAdjustmentChange ?? setInternalAdjustmentPercent;
  
  const adjustedValue = baseValue * (1 + adjustmentPercent / 100);

  // Debounced callback for adjusted value changes
  const debounceRef = useRef<number>(0);
  
  useEffect(() => {
    if (onAdjustedValueChange) {
      // Clear previous timeout
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      
      // Set new timeout with debounce
      debounceRef.current = window.setTimeout(() => {
        onAdjustedValueChange(adjustedValue);
      }, 150); // 150ms debounce
    }
    
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [adjustedValue, onAdjustedValueChange]);
  
  const handleBaseValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    if (!isNaN(newValue)) {
      onBaseValueChange(Math.min(maxBaseValue, Math.max(minBaseValue, newValue)));
    }
  };

  return (
    <div className="mb-4">
      <label className="text-gray-700 dark:text-gray-300 block mb-1 text-sm">
        {label}
      </label>
      <div className="flex gap-2 items-center mb-2">
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 dark:text-gray-400">Base</span>
          <input
            type="number"
            min={minBaseValue}
            max={maxBaseValue}
            step={baseStep}
            value={baseValue}
            onChange={handleBaseValueChange}
            className="w-20 px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded text-sm"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 dark:text-gray-400">Applied</span>
          <input
            type="text"
            value={displayFormat(adjustedValue)}
            readOnly
            className="w-20 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded text-sm"
          />
        </div>
        <div className="flex-1">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>{minAdjustment}%</span>
            <span>{adjustmentPercent}%</span>
            <span>{maxAdjustment}%</span>
          </div>
          <input
            type="range"
            min={minAdjustment}
            max={maxAdjustment}
            step={adjustmentStep}
            value={adjustmentPercent}
            onChange={(e) => onAdjustmentChange(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}

// Theme-specific visual settings
interface ThemeVisualSettings {
  pointColor: string;
  pointOpacity: number;
  edgeColor: string;
  edgeOpacity: number;
}

interface ShapeSettings {
  selectedShape: keyof typeof SHAPES;
  pointCount: number;
  showEdges: boolean;
  showGrid: boolean;
  showStats: boolean;
  pointSize: number;
  pointSizeVariation: number;
  // Remove individual color/opacity - now handled by themeSettings
  edgeStyle: "solid" | "dashed" | "dotted";
  autoRotate: boolean;
  rotationSpeed: number;
  rotationSensitivity: number;
  theme: "dark" | "light";
  themeSettings: {
    dark: ThemeVisualSettings;
    light: ThemeVisualSettings;
  };
  brownianMotion: boolean;
  brownianAmplitude: number;
  brownianSpeed: number;
  brownianFrequency: number;
}

interface ShapeSpecificParams {
  tensor: {
    pointCount: number;
    spacing: number;
    skew: number;
    twist: number;
    noise: number;
  };
  galaxy: {
    pointCount: number;
  };
  graph: {
    pointCount: number;
  };
  mobius: {
    pointCount: number;
    twists: number;
  };
  wormhole: {
    pointCount: number;
    twist: number;
    noise: number;
  };
  helix: {
    pointCount: number;
  };
  torus: {
    pointCount: number;
  };
  klein: {
    pointCount: number;
    twist: number;
    noise: number;
  };
  sphere: {
    pointCount: number;
  };
  hypercube: {
    pointCount: number;
  };
}

interface AllShapeSettings {
  currentShape: keyof typeof SHAPES;
  globalSettings: Omit<ShapeSettings, 'selectedShape' | 'pointCount'>;
  shapeSpecific: Partial<ShapeSpecificParams>;
  appliedShapeValues: Record<string, number>;
}

// Utility function to safely get string color from potentially old ThemeColor objects
function getColorString(color: string | any, theme: 'dark' | 'light'): string {
  if (typeof color === 'string') {
    return color;
  }
  // Handle old ThemeColor objects
  if (color && typeof color === 'object') {
    return color[theme] || color.dark || '#ffffff';
  }
  return '#ffffff'; // Fallback
}

export function ShapeTestLabWebGL() {
  // Load saved settings on mount
  const [allSettings] = useState<AllShapeSettings>(() => {
    const saved = localStorage.getItem("shapeTestLabAllSettings");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fall back to defaults
      }
    }
    return {
      currentShape: "tensor" as keyof typeof SHAPES,
      globalSettings: {
        showEdges: true,
        showGrid: true,
        showStats: true,
        pointSize: 1.0,
        pointSizeVariation: 0.5,
        edgeStyle: "solid" as const,
        autoRotate: true,
        rotationSpeed: 0.5,
        rotationSensitivity: 0.015,
        theme: "dark" as const,
        themeSettings: {
          dark: {
            pointColor: DEFAULT_THEME_COLORS.pointColor.dark,
            pointOpacity: 0.9,
            edgeColor: DEFAULT_THEME_COLORS.edgeColor.dark,
            edgeOpacity: 0.5,
          },
          light: {
            pointColor: DEFAULT_THEME_COLORS.pointColor.light || darkToLight(DEFAULT_THEME_COLORS.pointColor.dark),
            pointOpacity: 0.9,
            edgeColor: DEFAULT_THEME_COLORS.edgeColor.light || darkToLight(DEFAULT_THEME_COLORS.edgeColor.dark),
            edgeOpacity: 0.5,
          },
        },
        brownianMotion: false,
        brownianAmplitude: 0.1,
        brownianSpeed: 1.0,
        brownianFrequency: 1.0,
      },
      shapeSpecific: {
        tensor: { pointCount: 729, spacing: 2.5, skew: 0.0, twist: 0.005, noise: 0.15 },
        galaxy: { pointCount: 2000 },
        graph: { pointCount: 500 },
        mobius: { pointCount: 1000, twists: 1 },
        wormhole: { pointCount: 1000, twist: 0.25, noise: 0.1 },
        helix: { pointCount: 800 },
        torus: { pointCount: 1200 },
        klein: { pointCount: 1500, twist: 0.25, noise: 0.05 },
        sphere: { pointCount: 1000 },
        hypercube: { pointCount: 1296 },
      },
      appliedShapeValues: {},
    };
  });

  // Current shape state
  const [selectedShape, setSelectedShape] = useState<keyof typeof SHAPES>(
    allSettings.currentShape,
  );
  const [shapeSpecificSettings, setShapeSpecificSettings] = useState(
    allSettings.shapeSpecific,
  );


  const setBasePointCount = (count: number) => {
    setShapeSpecificSettings((prev) => ({
      ...prev,
      [selectedShape]: {
        ...prev[selectedShape],
        pointCount: count,
      },
    }));
  };

  // Shape-specific parameter setters
  const setShapeParam = (param: string, value: number) => {
    setShapeSpecificSettings((prev) => ({
      ...prev,
      [selectedShape]: {
        ...prev[selectedShape],
        [param]: value,
      },
    }));
  };

  // Get shape-specific parameter values
  const getShapeParam = (param: string, defaultValue: number): number => {
    const shapeSettings = shapeSpecificSettings[selectedShape] as any;
    return shapeSettings?.[param] ?? defaultValue;
  };

  // Get shape options for the current shape using applied values
  const getShapeOptions = () => {
    const getAppliedValue = (key: string, defaultValue: number) => {
      return appliedShapeValues[key] ?? getShapeParam(key, defaultValue);
    };

    switch (selectedShape) {
      case "tensor":
        return {
          spacing: getAppliedValue(`${selectedShape}_spacing`, 2.5),
          skew: getAppliedValue(`${selectedShape}_skew`, 0.0),
          twist: getAppliedValue(`${selectedShape}_twist`, 0.005),
          noise: getAppliedValue(`${selectedShape}_noise`, 0.15),
        };
      case "mobius":
        return {
          twists: Math.round(getAppliedValue(`${selectedShape}_twists`, 1)),
        };
      case "wormhole":
        return {
          twist: getAppliedValue(`${selectedShape}_twist`, 0.25),
          noise: getAppliedValue(`${selectedShape}_noise`, 0.1),
        };
      case "klein":
        return {
          twist: getAppliedValue(`${selectedShape}_twist`, 0.25),
          noise: getAppliedValue(`${selectedShape}_noise`, 0.05),
        };
      default:
        return {};
    }
  };


  // Global settings
  const [showEdges, setShowEdges] = useState(
    allSettings.globalSettings.showEdges,
  );
  const [showGrid, setShowGrid] = useState(allSettings.globalSettings.showGrid);
  const [showStats, setShowStats] = useState(
    allSettings.globalSettings.showStats,
  );
  const [pointSize, setPointSize] = useState(
    allSettings.globalSettings.pointSize,
  );
  const [pointSizeVariation, setPointSizeVariation] = useState(
    allSettings.globalSettings.pointSizeVariation,
  );
  const [theme, setTheme] = useState<"dark" | "light">(
    allSettings.globalSettings.theme,
  );
  
  // Theme-specific visual settings with fallback
  const [themeSettings, setThemeSettings] = useState<{
    dark: ThemeVisualSettings;
    light: ThemeVisualSettings;
  }>(allSettings.globalSettings.themeSettings || {
    dark: {
      pointColor: DEFAULT_THEME_COLORS.pointColor.dark,
      pointOpacity: 0.9,
      edgeColor: DEFAULT_THEME_COLORS.edgeColor.dark,
      edgeOpacity: 0.5,
    },
    light: {
      pointColor: DEFAULT_THEME_COLORS.pointColor.light || darkToLight(DEFAULT_THEME_COLORS.pointColor.dark),
      pointOpacity: 0.9,
      edgeColor: DEFAULT_THEME_COLORS.edgeColor.light || darkToLight(DEFAULT_THEME_COLORS.edgeColor.dark),
      edgeOpacity: 0.5,
    },
  });
  
  // Current theme values (derived from themeSettings and current theme)
  const currentThemeVisuals = themeSettings[theme];
  const pointColorTheme = currentThemeVisuals.pointColor;
  const pointOpacity = currentThemeVisuals.pointOpacity;
  const edgeColorTheme = currentThemeVisuals.edgeColor;
  const edgeOpacity = currentThemeVisuals.edgeOpacity;
  
  // Functions to update theme-specific settings
  const setPointColorTheme = (color: string) => {
    setThemeSettings(prev => ({
      ...prev,
      [theme]: { ...prev[theme], pointColor: color }
    }));
  };
  
  const setPointOpacity = (opacity: number) => {
    setThemeSettings(prev => ({
      ...prev,
      [theme]: { ...prev[theme], pointOpacity: opacity }
    }));
  };
  
  const setEdgeColorTheme = (color: string) => {
    setThemeSettings(prev => ({
      ...prev,
      [theme]: { ...prev[theme], edgeColor: color }
    }));
  };
  
  const setEdgeOpacity = (opacity: number) => {
    setThemeSettings(prev => ({
      ...prev,
      [theme]: { ...prev[theme], edgeOpacity: opacity }
    }));
  };
  const [edgeStyle, setEdgeStyle] = useState<"solid" | "dashed" | "dotted">(
    allSettings.globalSettings.edgeStyle,
  );
  const [autoRotate, setAutoRotate] = useState(
    allSettings.globalSettings.autoRotate,
  );
  const [rotationSpeed, setRotationSpeed] = useState(
    allSettings.globalSettings.rotationSpeed,
  );
  const [rotationSensitivity, setRotationSensitivity] = useState(
    allSettings.globalSettings.rotationSensitivity || 0.015,
  );
  
  // Adjustment percentages for the new slider system
  const [pointCountAdjustment, setPointCountAdjustment] = useState(0);
  const [pointSizeAdjustment, setPointSizeAdjustment] = useState(0);
  const [pointSizeVariationAdjustment, setPointSizeVariationAdjustment] = useState(0);
  const [pointOpacityAdjustment, setPointOpacityAdjustment] = useState(0);
  const [edgeOpacityAdjustment, setEdgeOpacityAdjustment] = useState(0);
  const [rotationSpeedAdjustment, setRotationSpeedAdjustment] = useState(0);
  const [rotationSensitivityAdjustment, setRotationSensitivityAdjustment] = useState(0);
  const [brownianAmplitudeAdjustment, setBrownianAmplitudeAdjustment] = useState(0);
  const [brownianSpeedAdjustment, setBrownianSpeedAdjustment] = useState(0);
  const [brownianFrequencyAdjustment, setBrownianFrequencyAdjustment] = useState(0);
  const [scaleAdjustment, setScaleAdjustment] = useState(0);
  
  // Applied values state - tracks the final adjusted values from SliderWithInput components
  const [appliedShapeValues, setAppliedShapeValues] = useState<Record<string, number>>({});
  
  // Helper to update applied values for a specific parameter
  const setAppliedValue = (paramKey: string, value: number) => {
    setAppliedShapeValues(prev => ({ ...prev, [paramKey]: value }));
  };
  
  const [brownianMotion, setBrownianMotion] = useState(
    allSettings.globalSettings.brownianMotion,
  );
  const [brownianAmplitude, setBrownianAmplitude] = useState(
    allSettings.globalSettings.brownianAmplitude,
  );
  const [brownianSpeed, setBrownianSpeed] = useState(
    allSettings.globalSettings.brownianSpeed,
  );
  const [brownianFrequency, setBrownianFrequency] = useState(
    allSettings.globalSettings.brownianFrequency || 1.0,
  );
  const [regenerateKey, setRegenerateKey] = useState(0);
  const [savedPresets, setSavedPresets] = useState<Record<string, ShapeSettings>>({});
  const [scale, setScale] = useState(20);
  const scaleRef = useRef(20);
  const scaleAdjustmentRef = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const isManuallyRotatingRef = useRef(false);
  
  // FPS tracking
  const fpsRef = useRef(0);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  // Get point count for current shape
  const basePointCount = shapeSpecificSettings[selectedShape]?.pointCount || 1000;
  const pointCount = Math.round(basePointCount * (1 + pointCountAdjustment / 100));
  
  // Computed adjusted values (these are what get used in the application)
  const adjustedRotationSensitivity = rotationSensitivity * (1 + rotationSensitivityAdjustment / 100);
  const adjustedScale = scale * (1 + scaleAdjustment / 100);
  
  // Shape regeneration dependency hash - only triggers when shape structure needs to be rebuilt
  const renderingHash = useMemo(() => {
    const currentShapeSettings = shapeSpecificSettings[selectedShape];
    return JSON.stringify({
      // Shape structure only
      selectedShape,
      pointCount,
      shapeParams: currentShapeSettings,
      appliedShapeValues,
      regenerateKey,
      theme, // Include theme for color updates
    });
  }, [
    selectedShape,
    pointCount,
    shapeSpecificSettings,
    appliedShapeValues,
    regenerateKey,
    theme,
  ]);
  
  // Canvas and renderer refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<IRenderer | null>(null);
  const animationRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0, down: false });
  const viewportRotationRef = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const shapeRotationRef = useRef({ x: 0, y: 0 });

  // Visual property refs so animation loop sees current values
  const pointSizeRef = useRef(pointSize);
  const pointSizeAdjustmentRef = useRef(pointSizeAdjustment);
  const pointSizeVariationRef = useRef(pointSizeVariation);
  const pointSizeVariationAdjustmentRef = useRef(pointSizeVariationAdjustment);
  const pointOpacityRef = useRef(pointOpacity);
  const pointOpacityAdjustmentRef = useRef(pointOpacityAdjustment);
  const edgeOpacityRef = useRef(edgeOpacity);
  const edgeOpacityAdjustmentRef = useRef(edgeOpacityAdjustment);
  const showEdgesRef = useRef(showEdges);
  const showGridRef = useRef(showGrid);
  const nodeColorRef = useRef('');
  const lineColorRef = useRef('');
  const themeRef = useRef(theme);
  const autoRotateRef = useRef(autoRotate);
  const rotationSpeedRef = useRef(rotationSpeed);
  const rotationSpeedAdjustmentRef = useRef(rotationSpeedAdjustment);
  const brownianMotionRef = useRef(brownianMotion);
  const brownianAmplitudeRef = useRef(brownianAmplitude);
  const brownianAmplitudeAdjustmentRef = useRef(brownianAmplitudeAdjustment);
  const brownianSpeedRef = useRef(brownianSpeed);
  const brownianSpeedAdjustmentRef = useRef(brownianSpeedAdjustment);
  const brownianFrequencyRef = useRef(brownianFrequency);
  const brownianFrequencyAdjustmentRef = useRef(brownianFrequencyAdjustment);
  const themeSettingsRef = useRef(themeSettings);

  // Keep refs in sync with state
  scaleRef.current = scale;
  scaleAdjustmentRef.current = scaleAdjustment;
  pointSizeRef.current = pointSize;
  pointSizeAdjustmentRef.current = pointSizeAdjustment;
  pointSizeVariationRef.current = pointSizeVariation;
  pointSizeVariationAdjustmentRef.current = pointSizeVariationAdjustment;
  pointOpacityRef.current = pointOpacity;
  pointOpacityAdjustmentRef.current = pointOpacityAdjustment;
  edgeOpacityRef.current = edgeOpacity;
  edgeOpacityAdjustmentRef.current = edgeOpacityAdjustment;
  showEdgesRef.current = showEdges;
  showGridRef.current = showGrid;
  themeRef.current = theme;
  autoRotateRef.current = autoRotate;
  rotationSpeedRef.current = rotationSpeed;
  rotationSpeedAdjustmentRef.current = rotationSpeedAdjustment;
  brownianMotionRef.current = brownianMotion;
  brownianAmplitudeRef.current = brownianAmplitude;
  brownianAmplitudeAdjustmentRef.current = brownianAmplitudeAdjustment;
  brownianSpeedRef.current = brownianSpeed;
  brownianSpeedAdjustmentRef.current = brownianSpeedAdjustment;
  brownianFrequencyRef.current = brownianFrequency;
  brownianFrequencyAdjustmentRef.current = brownianFrequencyAdjustment;
  themeSettingsRef.current = themeSettings;

  // Get actual colors based on current theme - memoized to prevent unnecessary re-renders
  // Previously these were computed on every render and included in useEffect deps,
  // causing excessive re-renders when color values changed
  const nodeColor = useMemo(() => 
    getThemeColor(pointColorTheme, theme), 
    [pointColorTheme, theme]
  );
  const lineColor = useMemo(() => 
    getThemeColor(edgeColorTheme, theme), 
    [edgeColorTheme, theme]
  );

  // Update color refs
  nodeColorRef.current = nodeColor;
  lineColorRef.current = lineColor;

  // Theme colors now handled by Tailwind classes

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    shape: true,
    shapeParams: false,
    appearance: true,
    animation: false,
    camera: false,
    settings: false,
  });

  // Panel resize state
  const [panelWidth, setPanelWidth] = useState(380);
  const isPanelDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  // Mouse event handlers for manual rotation
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.currentTarget === canvasRef.current) {
      mouseRef.current.down = true;
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      setIsDragging(true);
      isManuallyRotatingRef.current = true;
      e.preventDefault();
    }
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (mouseRef.current.down) {
        const dx = e.clientX - mouseRef.current.x;
        const dy = e.clientY - mouseRef.current.y;

        // Apply viewport rotation velocity based on mouse movement with adjustable sensitivity
        viewportRotationRef.current.vx = dy * adjustedRotationSensitivity;
        viewportRotationRef.current.vy = dx * adjustedRotationSensitivity;

        mouseRef.current.x = e.clientX;
        mouseRef.current.y = e.clientY;
      }
    },
    [adjustedRotationSensitivity],
  );

  const handleMouseUp = useCallback(() => {
    mouseRef.current.down = false;
    setIsDragging(false);
    isManuallyRotatingRef.current = false;
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      const newScale = scale * (e.deltaY > 0 ? 0.9 : 1.1);
      const clampedScale = Math.max(5, Math.min(100, newScale));
      setScale(clampedScale);
    },
    [scale],
  );

  // Panel resize handlers
  const handlePanelMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isPanelDragging.current = true;
      dragStartX.current = e.clientX;
      dragStartWidth.current = panelWidth;
      e.preventDefault();
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [panelWidth],
  );

  useEffect(() => {
    const handlePanelMouseMove = (e: MouseEvent) => {
      if (!isPanelDragging.current) return;

      const deltaX = e.clientX - dragStartX.current;
      const newWidth = Math.max(
        280,
        Math.min(600, dragStartWidth.current + deltaX),
      );
      setPanelWidth(newWidth);
    };

    const handlePanelMouseUp = () => {
      if (isPanelDragging.current) {
        isPanelDragging.current = false;
        document.body.style.cursor = "auto";
        document.body.style.userSelect = "auto";
      }
    };

    document.addEventListener("mousemove", handlePanelMouseMove);
    document.addEventListener("mouseup", handlePanelMouseUp);

    return () => {
      document.removeEventListener("mousemove", handlePanelMouseMove);
      document.removeEventListener("mouseup", handlePanelMouseUp);
    };
  }, []);

  // Main rendering effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize renderer
    const renderer = new ThreeJSRenderer();
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    canvas.width = width;
    canvas.height = height;

    renderer.initialize(canvas, width, height);
    rendererRef.current = renderer;

    // Generate shape with shape-specific parameters
    const shapeOptions = getShapeOptions();
    const generator = SHAPES[selectedShape].generator as any;
    const shapeData = Object.keys(shapeOptions).length > 0 
      ? generator(pointCount, shapeOptions)
      : generator(pointCount);
    const positions = shapeData.positions;
    const edges = shapeData.edges || [];

    // Setup animation state
    const brownianOffsets = createBrownianOffsets(positions.length);
    const particleSizeVariations = new Array(positions.length)
      .fill(0)
      .map(() => 0.5 + Math.random() * 1.0); // Random variation factor (0.5 to 1.5)

    // Convert edges to line format
    const lines = edges.map(([a, b]: [number, number]) => ({
      a,
      b,
      strength: 1.0,
    }));

    // Animation loop
    const animate = () => {
      // Calculate FPS
      frameCountRef.current++;
      const now = performance.now();
      if (now - lastTimeRef.current >= 1000) {
        fpsRef.current = Math.round(frameCountRef.current * 1000 / (now - lastTimeRef.current));
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }
      
      // Update shape rotation (auto-rotation affects only the shape)
      if (autoRotateRef.current && !isManuallyRotatingRef.current) {
        // Only auto-rotate the shape when not manually dragging
        const adjustedRotationSpeed = rotationSpeedRef.current * (1 + rotationSpeedAdjustmentRef.current / 100);
        shapeRotationRef.current.y += adjustedRotationSpeed * 0.01;
      }
      
      // Update viewport rotation (manual drag affects only the viewport)
      viewportRotationRef.current.x += viewportRotationRef.current.vx;
      viewportRotationRef.current.y += viewportRotationRef.current.vy;
      viewportRotationRef.current.vx *= 0.95; // Damping
      viewportRotationRef.current.vy *= 0.95; // Damping

      // Update Brownian motion
      if (brownianMotionRef.current) {
        const adjustedBrownianAmplitude = brownianAmplitudeRef.current * (1 + brownianAmplitudeAdjustmentRef.current / 100);
        const adjustedBrownianSpeed = brownianSpeedRef.current * (1 + brownianSpeedAdjustmentRef.current / 100);
        const adjustedBrownianFrequency = brownianFrequencyRef.current * (1 + brownianFrequencyAdjustmentRef.current / 100);
        updateBrownianMotion(brownianOffsets, {
          amplitude: adjustedBrownianAmplitude,
          speed: adjustedBrownianSpeed * 0.02,
          frequency: adjustedBrownianFrequency,
        });
      }

      // Apply separate rotations to renderer
      if ('setShapeRotation' in renderer && 'setViewportRotation' in renderer) {
        (renderer as any).setShapeRotation(shapeRotationRef.current.x, shapeRotationRef.current.y);
        (renderer as any).setViewportRotation(viewportRotationRef.current.x, viewportRotationRef.current.y);
      }

      // Render
      const currentTheme = themeRef.current;
      const currentVisuals = themeSettingsRef.current[currentTheme];
      const adjustedPointOpacity = currentVisuals.pointOpacity * (1 + pointOpacityAdjustmentRef.current / 100);
      const adjustedEdgeOpacity = currentVisuals.edgeOpacity * (1 + edgeOpacityAdjustmentRef.current / 100);
      
      // Calculate particle sizes dynamically based on current settings
      const currentAdjustedPointSize = pointSizeRef.current * (1 + pointSizeAdjustmentRef.current / 100);
      const currentAdjustedPointSizeVariation = pointSizeVariationRef.current * (1 + pointSizeVariationAdjustmentRef.current / 100);
      const particleSizes = particleSizeVariations.map(variation => 
        currentAdjustedPointSize * (variation * currentAdjustedPointSizeVariation)
      );
      
      const config: RenderConfig = {
        width: canvas.clientWidth,
        height: canvas.clientHeight,
        scale: scaleRef.current * (1 + scaleAdjustmentRef.current / 100),
        centerX: canvas.clientWidth / 2,
        centerY: canvas.clientHeight / 2,
        modelCenterX: 0,
        modelCenterY: 0,
        nodeColor: getColorString(currentVisuals.pointColor, currentTheme),
        lineColor: getColorString(currentVisuals.edgeColor, currentTheme),
        isDark: currentTheme === "dark",
        particleSizes,
        brownianOffsets,
        pointOpacity: adjustedPointOpacity,
        edgeOpacity: adjustedEdgeOpacity,
        showGrid: showGridRef.current,
      };

      renderer.render(positions, showEdgesRef.current ? lines : [], config);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Handle resize with throttling to prevent excessive calls
    let resizeTimeout: number;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        // Force layout recalculation
        canvas.offsetHeight; // Trigger a reflow
        
        const rect = canvas.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const dpr = Math.min(window.devicePixelRatio, 2); // Limit for performance
        
        // Also check parent dimensions for comparison
        const parentRect = canvas.parentElement?.getBoundingClientRect();
        
        // Use the parent dimensions instead of the old canvas dimensions
        const actualWidth = parentRect ? parentRect.width : width;
        const actualHeight = parentRect ? parentRect.height : height;
        
        // Only resize if dimensions actually changed
        const currentWidth = canvas.width / dpr;
        const currentHeight = canvas.height / dpr;
        if (Math.abs(currentWidth - actualWidth) < 1 && Math.abs(currentHeight - actualHeight) < 1) {
          return; // Skip if dimensions haven't meaningfully changed
        }
        
        // Set the internal canvas resolution
        canvas.width = actualWidth * dpr;
        canvas.height = actualHeight * dpr;
        
        // Scale the canvas back down using CSS to fill parent
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        
        renderer.resize(actualWidth, actualHeight);
      }, 16); // ~60fps throttling
    };

    // Initial sizing
    handleResize();

    // Use ResizeObserver for more reliable resize detection
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    
    // Observe the parent container instead of the canvas itself
    const parentContainer = canvas.parentElement;
    if (parentContainer) {
      resizeObserver.observe(parentContainer);
    } else {
      resizeObserver.observe(canvas);
    }

    // Also listen to window resize with throttling
    const throttledWindowResize = () => {
      handleResize();
    };
    window.addEventListener("resize", throttledWindowResize);

    return () => {
      cancelAnimationFrame(animationRef.current);
      resizeObserver.disconnect();
      window.removeEventListener("resize", throttledWindowResize);
      clearTimeout(resizeTimeout);
      renderer.dispose();
    };
  }, [renderingHash]);

  // Load saved presets from localStorage
  useEffect(() => {
    const savedPresetsData = localStorage.getItem("shapeTestLabPresets");
    if (savedPresetsData) {
      try {
        setSavedPresets(JSON.parse(savedPresetsData));
      } catch (error) {
        console.error("Failed to load presets:", error);
      }
    }
  }, []);

  // Apply theme to document body and HTML element
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.body.style.backgroundColor = "#0a0a0a";
      document.body.style.color = "#ffffff";
    } else {
      document.documentElement.classList.remove("dark");
      document.body.style.backgroundColor = "#ffffff";
      document.body.style.color = "#000000";
    }
  }, [theme]);

  // Auto-save ALL settings to localStorage whenever ANY setting changes
  useEffect(() => {
    const completeSettings: AllShapeSettings = {
      currentShape: selectedShape,
      globalSettings: {
        showEdges,
        showGrid,
        showStats,
        pointSize,
        pointSizeVariation,
        edgeStyle,
        autoRotate,
        rotationSpeed,
        rotationSensitivity,
        theme,
        themeSettings,
        brownianMotion,
        brownianAmplitude,
        brownianSpeed,
        brownianFrequency,
      },
      shapeSpecific: shapeSpecificSettings,
      appliedShapeValues: appliedShapeValues,
    };

    localStorage.setItem(
      "shapeTestLabAllSettings",
      JSON.stringify(completeSettings),
    );
  }, [
    selectedShape,
    shapeSpecificSettings,
    appliedShapeValues,
    showEdges,
    showGrid,
    showStats,
    pointSize,
    pointSizeVariation,
    edgeStyle,
    autoRotate,
    rotationSpeed,
    rotationSensitivity,
    theme,
    themeSettings,
    brownianMotion,
    brownianAmplitude,
    brownianSpeed,
    brownianFrequency,
  ]);

  // Settings management functions
  const exportSettings = () => {
    const completeSettings: AllShapeSettings = {
      currentShape: selectedShape,
      globalSettings: {
        showEdges,
        showGrid,
        showStats,
        pointSize,
        pointSizeVariation,
        edgeStyle,
        autoRotate,
        rotationSpeed,
        rotationSensitivity,
        theme,
        themeSettings,
        brownianMotion,
        brownianAmplitude,
        brownianSpeed,
        brownianFrequency,
      },
      shapeSpecific: shapeSpecificSettings,
      appliedShapeValues: appliedShapeValues,
    };
    const json = JSON.stringify(completeSettings, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shape-settings-${selectedShape}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(
          e.target?.result as string,
        ) as AllShapeSettings;

        // Apply global settings
        if (imported.globalSettings) {
          setShowEdges(imported.globalSettings.showEdges);
          setShowGrid(imported.globalSettings.showGrid);
          setShowStats(imported.globalSettings.showStats);
          setPointSize(imported.globalSettings.pointSize);
          setPointSizeVariation(imported.globalSettings.pointSizeVariation);
          setThemeSettings(imported.globalSettings.themeSettings);
          setEdgeStyle(imported.globalSettings.edgeStyle);
          setAutoRotate(imported.globalSettings.autoRotate);
          setRotationSpeed(imported.globalSettings.rotationSpeed);
          setRotationSensitivity(imported.globalSettings.rotationSensitivity || 0.015);
          setTheme(imported.globalSettings.theme);
          setBrownianMotion(imported.globalSettings.brownianMotion);
          setBrownianAmplitude(imported.globalSettings.brownianAmplitude);
          setBrownianSpeed(imported.globalSettings.brownianSpeed || 1.0);
          setBrownianFrequency(imported.globalSettings.brownianFrequency || 1.0);
        }

        // Apply shape-specific settings
        if (imported.shapeSpecific) {
          setShapeSpecificSettings(imported.shapeSpecific);
        }

        // Apply applied shape values
        if (imported.appliedShapeValues) {
          setAppliedShapeValues(imported.appliedShapeValues);
        }

        // Set current shape
        if (imported.currentShape) {
          setSelectedShape(imported.currentShape);
        }
      } catch (error) {
        console.error("Failed to import settings:", error);
        alert("Failed to import settings. Please check the file format.");
      }
    };
    reader.readAsText(file);
  };

  const savePreset = (name: string) => {
    const settings: ShapeSettings = {
      selectedShape,
      pointCount,
      showEdges,
      showGrid,
      showStats,
      pointSize,
      pointSizeVariation,
      themeSettings,
      edgeStyle,
      autoRotate,
      rotationSpeed,
      rotationSensitivity,
      theme,
      brownianMotion,
      brownianAmplitude,
      brownianSpeed,
      brownianFrequency,
    };
    const newPresets = { ...savedPresets, [name]: settings };
    setSavedPresets(newPresets);
    localStorage.setItem("shapeTestLabPresets", JSON.stringify(newPresets));
  };

  // Apply settings helper function
  const applySettings = (settings: Partial<ShapeSettings>) => {
    if (settings.selectedShape !== undefined) {
      setSelectedShape(settings.selectedShape);
    }
    if (settings.pointCount !== undefined) {
      setBasePointCount(settings.pointCount);
    }
    if (settings.showEdges !== undefined) {
      setShowEdges(settings.showEdges);
    }
    if (settings.showGrid !== undefined) {
      setShowGrid(settings.showGrid);
    }
    if (settings.showStats !== undefined) {
      setShowStats(settings.showStats);
    }
    if (settings.pointSize !== undefined) {
      setPointSize(settings.pointSize);
    }
    if (settings.pointSizeVariation !== undefined) {
      setPointSizeVariation(settings.pointSizeVariation);
    }
    if (settings.themeSettings !== undefined) {
      setThemeSettings(settings.themeSettings);
    }
    if (settings.edgeStyle !== undefined) {
      setEdgeStyle(settings.edgeStyle);
    }
    if (settings.autoRotate !== undefined) {
      setAutoRotate(settings.autoRotate);
    }
    if (settings.rotationSpeed !== undefined) {
      setRotationSpeed(settings.rotationSpeed);
    }
    if (settings.rotationSensitivity !== undefined) {
      setRotationSensitivity(settings.rotationSensitivity);
    }
    if (settings.theme !== undefined) {
      setTheme(settings.theme);
    }
    if (settings.brownianMotion !== undefined) {
      setBrownianMotion(settings.brownianMotion);
    }
    if (settings.brownianAmplitude !== undefined) {
      setBrownianAmplitude(settings.brownianAmplitude);
    }
    if (settings.brownianSpeed !== undefined) {
      setBrownianSpeed(settings.brownianSpeed);
    }
    if (settings.brownianFrequency !== undefined) {
      setBrownianFrequency(settings.brownianFrequency);
    }
  };

  const loadPreset = (name: string) => {
    const preset = savedPresets[name];
    if (preset) {
      applySettings(preset);
    }
  };

  const deletePreset = (name: string) => {
    const newPresets = { ...savedPresets };
    delete newPresets[name];
    setSavedPresets(newPresets);
    localStorage.setItem("shapeTestLabPresets", JSON.stringify(newPresets));
  };

  return (
    <div className="w-full h-screen flex relative bg-white dark:bg-gray-900 overflow-hidden">
      {/* Control Panel */}
      <div
        className="h-screen bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm p-5 overflow-y-auto border-r border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 relative flex-shrink-0"
        style={{
          width: `${panelWidth}px`,
          minWidth: `${panelWidth}px`,
          maxWidth: `${panelWidth}px`,
        }}
      >
        {/* Resize Handle */}
        <div
          onMouseDown={handlePanelMouseDown}
          className="absolute -right-1 top-0 w-2 h-full cursor-col-resize bg-gray-300/50 dark:bg-gray-700/50 hover:bg-gray-400/70 dark:hover:bg-gray-600/70 transition-colors z-50"
        />

        <h2 className="text-2xl font-light mb-5 text-gray-900 dark:text-gray-100">
          Shape Testing Lab (WebGL)
        </h2>

        {/* Shape Selection Section */}
        <CollapsibleSection
          title="Shape Selection"
          isExpanded={expandedSections.shape}
          onToggle={() =>
            setExpandedSections((prev) => ({ ...prev, shape: !prev.shape }))
          }
        >
          <div className="mb-5">
            <label className="text-gray-700 dark:text-gray-300 block mb-2 text-sm">
              Shape Type
            </label>
            <select
              value={selectedShape}
              onChange={(e) =>
                setSelectedShape(e.target.value as keyof typeof SHAPES)
              }
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            >
              {Object.entries(SHAPES).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.name}
                </option>
              ))}
            </select>
          </div>

          {/* Equation Display */}
          <div className="mb-5 p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
            <div className="text-gray-500 dark:text-gray-400 text-xs mb-1">
              Mathematical Form:
            </div>
            <div className="text-gray-900 dark:text-gray-100 text-lg font-mono text-center">
              {SHAPES[selectedShape].equation}
            </div>
          </div>

          {/* Point Count */}
          <SliderWithInput
            label="Point Count"
            baseValue={basePointCount}
            onBaseValueChange={setBasePointCount}
            adjustmentPercent={pointCountAdjustment}
            onAdjustmentChange={setPointCountAdjustment}
            minBaseValue={100}
            maxBaseValue={5000}
            baseStep={100}
            displayFormat={(v) => Math.round(v).toString()}
          />

          {/* Regenerate Button */}
          <button
            onClick={() => setRegenerateKey((prev) => prev + 1)}
            className="w-full py-2 px-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded text-sm transition-colors"
          >
            Regenerate Shape
          </button>
        </CollapsibleSection>

        {/* Shape Parameters Section */}
        <CollapsibleSection
          title="Shape Parameters"
          isExpanded={expandedSections.shapeParams}
          onToggle={() =>
            setExpandedSections((prev) => ({
              ...prev,
              shapeParams: !prev.shapeParams,
            }))
          }
        >
          {selectedShape === "tensor" && (
            <>
              <SliderWithInput
                label="Spacing"
                baseValue={getShapeParam("spacing", 2.5)}
                onBaseValueChange={(v) => setShapeParam("spacing", v)}
                onAdjustedValueChange={(v) => setAppliedValue("tensor_spacing", v)}
                minBaseValue={1.0}
                maxBaseValue={5.0}
                baseStep={0.1}
                displayFormat={(v) => v.toFixed(1)}
              />
              
              <SliderWithInput
                label="Skew"
                baseValue={getShapeParam("skew", 0.0)}
                onBaseValueChange={(v) => setShapeParam("skew", v)}
                onAdjustedValueChange={(v) => setAppliedValue("tensor_skew", v)}
                minBaseValue={-0.3}
                maxBaseValue={0.3}
                baseStep={0.01}
                displayFormat={(v) => v.toFixed(2)}
              />
              
              <SliderWithInput
                label="Twist"
                baseValue={getShapeParam("twist", 0.005)}
                onBaseValueChange={(v) => setShapeParam("twist", v)}
                onAdjustedValueChange={(v) => setAppliedValue("tensor_twist", v)}
                minBaseValue={0.0}
                maxBaseValue={0.05}
                baseStep={0.001}
                displayFormat={(v) => v.toFixed(3)}
              />
              
              <SliderWithInput
                label="Noise"
                baseValue={getShapeParam("noise", 0.15)}
                onBaseValueChange={(v) => setShapeParam("noise", v)}
                onAdjustedValueChange={(v) => setAppliedValue("tensor_noise", v)}
                minBaseValue={0.0}
                maxBaseValue={0.5}
                baseStep={0.01}
                displayFormat={(v) => v.toFixed(2)}
              />
            </>
          )}
          
          {selectedShape === "mobius" && (
            <SliderWithInput
              label="Twists"
              baseValue={getShapeParam("twists", 1)}
              onBaseValueChange={(v) => setShapeParam("twists", v)}
              onAdjustedValueChange={(v) => setAppliedValue("mobius_twists", v)}
              minBaseValue={1}
              maxBaseValue={5}
              baseStep={1}
              displayFormat={(v) => Math.round(v).toString()}
            />
          )}
          
          {selectedShape === "wormhole" && (
            <>
              <SliderWithInput
                label="Twist"
                baseValue={getShapeParam("twist", 0.25)}
                onBaseValueChange={(v) => setShapeParam("twist", v)}
                onAdjustedValueChange={(v) => setAppliedValue("wormhole_twist", v)}
                minBaseValue={0.0}
                maxBaseValue={1.0}
                baseStep={0.01}
                displayFormat={(v) => v.toFixed(2)}
              />
              
              <SliderWithInput
                label="Noise"
                baseValue={getShapeParam("noise", 0.1)}
                onBaseValueChange={(v) => setShapeParam("noise", v)}
                onAdjustedValueChange={(v) => setAppliedValue("wormhole_noise", v)}
                minBaseValue={0.0}
                maxBaseValue={0.3}
                baseStep={0.01}
                displayFormat={(v) => v.toFixed(2)}
              />
            </>
          )}

          {selectedShape === "klein" && (
            <>
              <SliderWithInput
                label="Twist"
                baseValue={getShapeParam("twist", 0.25)}
                onBaseValueChange={(v) => setShapeParam("twist", v)}
                onAdjustedValueChange={(v) => setAppliedValue("klein_twist", v)}
                minBaseValue={0.0}
                maxBaseValue={1.0}
                baseStep={0.01}
                displayFormat={(v) => v.toFixed(2)}
              />
              
              <SliderWithInput
                label="Noise"
                baseValue={getShapeParam("noise", 0.05)}
                onBaseValueChange={(v) => setShapeParam("noise", v)}
                onAdjustedValueChange={(v) => setAppliedValue("klein_noise", v)}
                minBaseValue={0.0}
                maxBaseValue={0.3}
                baseStep={0.01}
                displayFormat={(v) => v.toFixed(2)}
              />
            </>
          )}
          
          {!["tensor", "mobius", "wormhole", "klein"].includes(selectedShape) && (
            <p className="text-gray-600 dark:text-gray-400 text-sm italic">
              No specific parameters for {SHAPES[selectedShape].name}
            </p>
          )}
        </CollapsibleSection>

        {/* Appearance Section */}
        <CollapsibleSection
          title="Appearance"
          isExpanded={expandedSections.appearance}
          onToggle={() =>
            setExpandedSections((prev) => ({
              ...prev,
              appearance: !prev.appearance,
            }))
          }
        >

          {/* Point Size */}
          <SliderWithInput
            label="Point Size"
            baseValue={pointSize}
            onBaseValueChange={setPointSize}
            adjustmentPercent={pointSizeAdjustment}
            onAdjustmentChange={setPointSizeAdjustment}
            minBaseValue={0.1}
            maxBaseValue={3}
            baseStep={0.1}
          />

          {/* Point Color */}
          <div className="mb-4">
            <label className="text-gray-700 dark:text-gray-300 block mb-1 text-sm">
              Point Color ({theme === "dark" ? "Dark Theme" : "Light Theme"})
            </label>
            <div>
              <input
                type="color"
                value={currentThemeVisuals.pointColor}
                onChange={(e) => setPointColorTheme(e.target.value)}
                className="w-full h-8"
              />
            </div>
          </div>

          {/* Point Size Variation */}
          <SliderWithInput
            label="Point Size Variation"
            baseValue={pointSizeVariation}
            onBaseValueChange={setPointSizeVariation}
            adjustmentPercent={pointSizeVariationAdjustment}
            onAdjustmentChange={setPointSizeVariationAdjustment}
            minBaseValue={0}
            maxBaseValue={2}
            baseStep={0.1}
          />

          {/* Point Opacity */}
          <SliderWithInput
            label="Point Opacity"
            baseValue={pointOpacity}
            onBaseValueChange={setPointOpacity}
            adjustmentPercent={pointOpacityAdjustment}
            onAdjustmentChange={setPointOpacityAdjustment}
            minBaseValue={0.1}
            maxBaseValue={1}
            baseStep={0.05}
          />

          {/* Show Grid */}
          <div className="mb-4">
            <label className="text-gray-700 dark:text-gray-300 flex items-center text-sm">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
                className="mr-2"
              />
              Show Grid
            </label>
          </div>

          {/* Show Edges */}
          <div className="mb-4">
            <label className="text-gray-700 dark:text-gray-300 flex items-center text-sm">
              <input
                type="checkbox"
                checked={showEdges}
                onChange={(e) => setShowEdges(e.target.checked)}
                className="mr-2"
              />
              Show Edges
            </label>
          </div>

          {/* Edge Color */}
          {showEdges && (
            <>
              <div className="mb-4">
                <label className="text-gray-700 dark:text-gray-300 block mb-1 text-sm">
                  Edge Color ({theme === "dark" ? "Dark Theme" : "Light Theme"})
                </label>
                <div>
                  <input
                    type="color"
                    value={currentThemeVisuals.edgeColor}
                    onChange={(e) => setEdgeColorTheme(e.target.value)}
                    className="w-full h-8"
                  />
                </div>
              </div>
              
              {/* Edge Opacity */}
              <SliderWithInput
                label="Edge Opacity"
                baseValue={edgeOpacity}
                onBaseValueChange={setEdgeOpacity}
                adjustmentPercent={edgeOpacityAdjustment}
                onAdjustmentChange={setEdgeOpacityAdjustment}
                minBaseValue={0.1}
                maxBaseValue={1}
                baseStep={0.05}
              />
            </>
          )}
        </CollapsibleSection>

        {/* Animation Section */}
        <CollapsibleSection
          title="Animation"
          isExpanded={expandedSections.animation}
          onToggle={() =>
            setExpandedSections((prev) => ({
              ...prev,
              animation: !prev.animation,
            }))
          }
        >
          {/* Auto Rotate */}
          <div className="mb-4">
            <label className="text-gray-700 dark:text-gray-300 flex items-center text-sm">
              <input
                type="checkbox"
                checked={autoRotate}
                onChange={(e) => setAutoRotate(e.target.checked)}
                className="mr-2"
              />
              Auto Rotate
            </label>
          </div>

          {autoRotate && (
            <SliderWithInput
              label="Rotation Speed"
              baseValue={rotationSpeed}
              onBaseValueChange={setRotationSpeed}
              adjustmentPercent={rotationSpeedAdjustment}
              onAdjustmentChange={setRotationSpeedAdjustment}
              minBaseValue={0.001}
              maxBaseValue={0.05}
              baseStep={0.001}
              displayFormat={(v) => v.toFixed(3)}
            />
          )}

          {/* Brownian Motion */}
          <div className="mb-4">
            <label className="text-gray-700 dark:text-gray-300 flex items-center text-sm">
              <input
                type="checkbox"
                checked={brownianMotion}
                onChange={(e) => setBrownianMotion(e.target.checked)}
                className="mr-2"
              />
              Brownian Motion
            </label>
          </div>

          {brownianMotion && (
            <>
              <SliderWithInput
                label="Motion Amplitude"
                baseValue={brownianAmplitude}
                onBaseValueChange={setBrownianAmplitude}
                adjustmentPercent={brownianAmplitudeAdjustment}
                onAdjustmentChange={setBrownianAmplitudeAdjustment}
                minBaseValue={0}
                maxBaseValue={1.0}
                baseStep={0.01}
                displayFormat={(v) => v.toFixed(3)}
              />
              
              <SliderWithInput
                label="Motion Speed"
                baseValue={brownianSpeed}
                onBaseValueChange={setBrownianSpeed}
                adjustmentPercent={brownianSpeedAdjustment}
                onAdjustmentChange={setBrownianSpeedAdjustment}
                minBaseValue={0.1}
                maxBaseValue={5.0}
                baseStep={0.1}
                displayFormat={(v) => v.toFixed(1)}
              />
              
              <SliderWithInput
                label="Motion Frequency"
                baseValue={brownianFrequency}
                onBaseValueChange={setBrownianFrequency}
                adjustmentPercent={brownianFrequencyAdjustment}
                onAdjustmentChange={setBrownianFrequencyAdjustment}
                minBaseValue={0.1}
                maxBaseValue={10.0}
                baseStep={0.1}
                displayFormat={(v) => v.toFixed(1)}
              />
            </>
          )}
        </CollapsibleSection>

        {/* Camera Section */}
        <CollapsibleSection
          title="Camera"
          isExpanded={expandedSections.camera}
          onToggle={() =>
            setExpandedSections((prev) => ({ ...prev, camera: !prev.camera }))
          }
        >
          <SliderWithInput
            label="Zoom"
            baseValue={scale}
            onBaseValueChange={setScale}
            adjustmentPercent={scaleAdjustment}
            onAdjustmentChange={setScaleAdjustment}
            minBaseValue={5}
            maxBaseValue={100}
            baseStep={1}
            displayFormat={(v) => v.toFixed(1)}
          />

          <SliderWithInput
            label="Rotation Sensitivity"
            baseValue={rotationSensitivity}
            onBaseValueChange={setRotationSensitivity}
            adjustmentPercent={rotationSensitivityAdjustment}
            onAdjustmentChange={setRotationSensitivityAdjustment}
            minBaseValue={0.001}
            maxBaseValue={0.05}
            baseStep={0.001}
            displayFormat={(v) => v.toFixed(3)}
          />

          <div className="text-gray-600 dark:text-gray-400 text-xs">
            <p>
              <strong>Mouse Controls:</strong>
            </p>
            <ul className="ml-5">
              <li>Drag: Rotate viewport (changes viewpoint)</li>
              <li>Scroll: Zoom in/out</li>
              <li>Auto-rotate: Shape rotates in space, grid stays fixed</li>
            </ul>
          </div>
        </CollapsibleSection>

        {/* Settings Management Section */}
        <CollapsibleSection
          title="Settings Management"
          isExpanded={expandedSections.settings}
          onToggle={() =>
            setExpandedSections((prev) => ({
              ...prev,
              settings: !prev.settings,
            }))
          }
        >
          {/* Export/Import/Clear Row */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={exportSettings}
              className="flex-1 px-2 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 rounded cursor-pointer text-sm transition-colors"
            >
              Export
            </button>
            <label
              className="flex-1 px-2 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 rounded cursor-pointer text-sm text-center transition-colors"
            >
              Import
              <input
                type="file"
                accept=".json"
                onChange={importSettings}
                className="hidden"
              />
            </label>
            <button
              onClick={() => {
                localStorage.removeItem("shapeTestLabAllSettings");
                window.location.reload();
              }}
              className="flex-1 px-2 py-2 bg-red-500 hover:bg-red-600 text-white rounded cursor-pointer text-sm transition-colors"
              title="Reset all settings to defaults"
            >
              Reset
            </button>
          </div>

          {/* Save Preset */}
          <div className="mb-4">
            <label className="text-gray-700 dark:text-gray-300 block mb-2 text-sm">
              Save as Preset
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Preset name..."
                id="preset-name-input"
                className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded text-sm"
              />
              <button
                onClick={() => {
                  const input = document.getElementById(
                    "preset-name-input",
                  ) as HTMLInputElement;
                  if (input?.value) {
                    savePreset(input.value);
                    input.value = "";
                  }
                }}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded cursor-pointer text-sm transition-colors"
              >
                Save
              </button>
            </div>
          </div>

          {/* Load Preset */}
          {Object.keys(savedPresets).length > 0 && (
            <div>
              <label className="text-gray-700 dark:text-gray-300 block mb-2 text-sm">
                Load Preset
              </label>
              <div className="max-h-[150px] overflow-y-auto">
                {Object.keys(savedPresets).map((name) => (
                  <div
                    key={name}
                    className="flex items-center justify-between p-2 mb-1 bg-gray-100/50 dark:bg-gray-800/50 rounded"
                  >
                    <span className="text-gray-700 dark:text-gray-300 text-sm flex-1">
                      {name}
                    </span>
                    <button
                      onClick={() => loadPreset(name)}
                      className="px-3 py-1 ml-2 bg-blue-500 hover:bg-blue-600 text-white rounded cursor-pointer text-xs transition-colors"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => deletePreset(name)}
                      className="px-3 py-1 ml-1 bg-red-500 hover:bg-red-600 text-white rounded cursor-pointer text-xs transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CollapsibleSection>
      </div>

      {/* 3D Viewport */}
      <div className="flex-1 relative bg-white dark:bg-gray-900 min-w-0 min-h-0">
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full block ${
            isDragging ? "cursor-grabbing" : autoRotate ? "cursor-default" : "cursor-grab"
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        />

        {/* Floating Theme Toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="absolute top-4 left-4 z-50 w-12 h-12 rounded-full bg-black/80 dark:bg-white/20 hover:bg-black/90 dark:hover:bg-white/30 text-white dark:text-white backdrop-blur-sm border border-white/20 dark:border-white/10 transition-all duration-200 flex items-center justify-center text-lg shadow-lg hover:scale-105"
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>

        {/* Performance Info */}
        <div className="fixed top-4 right-4 z-40 p-3 bg-black/80 dark:bg-black/90 text-white font-mono text-xs rounded-lg backdrop-blur-sm border border-white/10 min-w-[120px]">
          <div className="text-green-400 mb-1">WebGL</div>
          <div>FPS: {fpsRef.current}</div>
          <div>Points: {pointCount.toLocaleString()}</div>
          <div>Scale: {adjustedScale.toFixed(1)}x</div>
        </div>
      </div>
    </div>
  );
}
