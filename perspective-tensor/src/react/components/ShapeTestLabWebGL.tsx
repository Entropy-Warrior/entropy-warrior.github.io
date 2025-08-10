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
  adjustmentPercent: number;
  onAdjustmentChange: (percent: number) => void;
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
  adjustmentPercent,
  onAdjustmentChange,
  minBaseValue = 0,
  maxBaseValue = 1000,
  baseStep = 0.1,
  minAdjustment = -50,
  maxAdjustment = 50,
  adjustmentStep = 1,
  displayFormat = (v) => v.toFixed(baseStep < 1 ? Math.ceil(-Math.log10(baseStep)) : 0),
}: SliderWithInputProps) {
  const adjustedValue = baseValue * (1 + adjustmentPercent / 100);
  
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

interface ShapeSettings {
  selectedShape: keyof typeof SHAPES;
  pointCount: number;
  showEdges: boolean;
  showGrid: boolean;
  showStats: boolean;
  pointSize: number;
  pointSizeVariation: number;
  pointColor: ThemeColor;
  pointOpacity: number;
  edgeColor: ThemeColor;
  edgeOpacity: number;
  edgeStyle: "solid" | "dashed" | "dotted";
  autoRotate: boolean;
  rotationSpeed: number;
  rotationSensitivity: number;
  theme: "dark" | "light";
  brownianMotion: boolean;
  brownianAmplitude: number;
  brownianSpeed: number;
}

interface AllShapeSettings {
  currentShape: keyof typeof SHAPES;
  globalSettings: Omit<ShapeSettings, 'selectedShape' | 'pointCount'>;
  shapeSpecific: {
    [key in keyof typeof SHAPES]?: {
      pointCount: number;
    };
  };
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
        pointColor: DEFAULT_THEME_COLORS.pointColor,
        pointOpacity: 0.9,
        edgeColor: DEFAULT_THEME_COLORS.edgeColor,
        edgeOpacity: 0.5,
        edgeStyle: "solid" as const,
        autoRotate: true,
        rotationSpeed: 0.5,
        rotationSensitivity: 0.015,
        theme: "dark" as const,
        brownianMotion: false,
        brownianAmplitude: 0.1,
        brownianSpeed: 1.0,
      },
      shapeSpecific: {},
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
  const [pointColorTheme, setPointColorTheme] = useState<ThemeColor>(
    allSettings.globalSettings.pointColor,
  );
  const [pointOpacity, setPointOpacity] = useState(
    allSettings.globalSettings.pointOpacity,
  );
  const [edgeColorTheme, setEdgeColorTheme] = useState<ThemeColor>(
    allSettings.globalSettings.edgeColor,
  );
  const [edgeOpacity, setEdgeOpacity] = useState(
    allSettings.globalSettings.edgeOpacity,
  );
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
  const [theme, setTheme] = useState<"dark" | "light">(
    allSettings.globalSettings.theme,
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
  const [scaleAdjustment, setScaleAdjustment] = useState(0);
  const [brownianMotion, setBrownianMotion] = useState(
    allSettings.globalSettings.brownianMotion,
  );
  const [brownianAmplitude, setBrownianAmplitude] = useState(
    allSettings.globalSettings.brownianAmplitude,
  );
  const [brownianSpeed, setBrownianSpeed] = useState(
    allSettings.globalSettings.brownianSpeed,
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
  const adjustedPointSize = pointSize * (1 + pointSizeAdjustment / 100);
  const adjustedPointSizeVariation = pointSizeVariation * (1 + pointSizeVariationAdjustment / 100);
  const adjustedPointOpacity = Math.min(1, Math.max(0, pointOpacity * (1 + pointOpacityAdjustment / 100)));
  const adjustedEdgeOpacity = Math.min(1, Math.max(0, edgeOpacity * (1 + edgeOpacityAdjustment / 100)));
  const adjustedRotationSpeed = rotationSpeed * (1 + rotationSpeedAdjustment / 100);
  const adjustedRotationSensitivity = rotationSensitivity * (1 + rotationSensitivityAdjustment / 100);
  const adjustedBrownianAmplitude = brownianAmplitude * (1 + brownianAmplitudeAdjustment / 100);
  const adjustedBrownianSpeed = brownianSpeed * (1 + brownianSpeedAdjustment / 100);
  const adjustedScale = scale * (1 + scaleAdjustment / 100);
  
  // Keep refs in sync
  scaleRef.current = scale;
  scaleAdjustmentRef.current = scaleAdjustment;

  // Canvas and renderer refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<IRenderer | null>(null);
  const animationRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0, down: false });
  const viewportRotationRef = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const shapeRotationRef = useRef({ x: 0, y: 0 });

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

  // Theme colors now handled by Tailwind classes

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    shape: true,
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

    // Generate shape
    const shapeData = SHAPES[selectedShape].generator(pointCount);
    const positions = shapeData.positions;
    const edges = shapeData.edges || [];

    // Setup animation state
    const brownianOffsets = createBrownianOffsets(positions.length);
    const particleSizes = new Array(positions.length)
      .fill(0)
      .map(() => adjustedPointSize * (0.5 + Math.random() * adjustedPointSizeVariation));

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
      if (autoRotate && !isManuallyRotatingRef.current) {
        // Only auto-rotate the shape when not manually dragging
        shapeRotationRef.current.y += adjustedRotationSpeed * 0.01;
      }
      
      // Update viewport rotation (manual drag affects only the viewport)
      viewportRotationRef.current.x += viewportRotationRef.current.vx;
      viewportRotationRef.current.y += viewportRotationRef.current.vy;
      viewportRotationRef.current.vx *= 0.95; // Damping
      viewportRotationRef.current.vy *= 0.95; // Damping

      // Update Brownian motion
      if (brownianMotion) {
        updateBrownianMotion(brownianOffsets, {
          amplitude: adjustedBrownianAmplitude,
          speed: adjustedBrownianSpeed * 0.02,
        });
      }

      // Apply separate rotations to renderer
      if ('setShapeRotation' in renderer && 'setViewportRotation' in renderer) {
        (renderer as any).setShapeRotation(shapeRotationRef.current.x, shapeRotationRef.current.y);
        (renderer as any).setViewportRotation(viewportRotationRef.current.x, viewportRotationRef.current.y);
      }

      // Render
      const config: RenderConfig = {
        width: canvas.width,
        height: canvas.height,
        scale: scaleRef.current * (1 + scaleAdjustmentRef.current / 100),
        centerX: canvas.width / 2,
        centerY: canvas.height / 2,
        modelCenterX: 0,
        modelCenterY: 0,
        nodeColor,
        lineColor,
        isDark: theme === "dark",
        particleSizes,
        brownianOffsets,
        pointOpacity: adjustedPointOpacity,
        edgeOpacity: adjustedEdgeOpacity,
        showGrid,
      };

      renderer.render(positions, showEdges ? lines : [], config);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      canvas.width = width;
      canvas.height = height;
      renderer.resize(width, height);
    };

    // Initial sizing
    handleResize();

    // Use ResizeObserver for more reliable resize detection
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(canvas);

    // Also listen to window resize with throttling
    let resizeTimeout: number;
    const throttledWindowResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(handleResize, 16); // ~60fps
    };
    window.addEventListener("resize", throttledWindowResize);

    return () => {
      cancelAnimationFrame(animationRef.current);
      resizeObserver.disconnect();
      window.removeEventListener("resize", throttledWindowResize);
      clearTimeout(resizeTimeout);
      renderer.dispose();
    };
  }, [
    selectedShape,
    pointCount,
    showEdges,
    showGrid,
    pointSize,
    pointSizeVariation,
    pointColorTheme,
    pointOpacity,
    edgeColorTheme,
    edgeOpacity,
    autoRotate,
    rotationSpeed,
    theme,
    brownianMotion,
    brownianAmplitude,
    brownianSpeed,
    regenerateKey
  ]);

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

  // Apply theme to document body
  useEffect(() => {
    if (theme === "dark") {
      document.body.style.backgroundColor = "#0a0a0a";
      document.body.style.color = "#ffffff";
    } else {
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
        pointColor: pointColorTheme,
        pointOpacity,
        edgeColor: edgeColorTheme,
        edgeOpacity,
        edgeStyle,
        autoRotate,
        rotationSpeed,
        rotationSensitivity,
        theme,
        brownianMotion,
        brownianAmplitude,
        brownianSpeed,
      },
      shapeSpecific: shapeSpecificSettings,
    };

    localStorage.setItem(
      "shapeTestLabAllSettings",
      JSON.stringify(completeSettings),
    );
  }, [
    selectedShape,
    shapeSpecificSettings,
    showEdges,
    showGrid,
    showStats,
    pointSize,
    pointSizeVariation,
    pointColorTheme,
    pointOpacity,
    edgeColorTheme,
    edgeOpacity,
    edgeStyle,
    autoRotate,
    rotationSpeed,
    rotationSensitivity,
    theme,
    brownianMotion,
    brownianAmplitude,
    brownianSpeed,
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
        pointColor: pointColorTheme,
        pointOpacity,
        edgeColor: edgeColorTheme,
        edgeOpacity,
        edgeStyle,
        autoRotate,
        rotationSpeed,
        rotationSensitivity,
        theme,
        brownianMotion,
        brownianAmplitude,
        brownianSpeed,
      },
      shapeSpecific: shapeSpecificSettings,
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
          setPointColorTheme(imported.globalSettings.pointColor);
          setPointOpacity(imported.globalSettings.pointOpacity);
          setEdgeColorTheme(imported.globalSettings.edgeColor);
          setEdgeOpacity(imported.globalSettings.edgeOpacity);
          setEdgeStyle(imported.globalSettings.edgeStyle);
          setAutoRotate(imported.globalSettings.autoRotate);
          setRotationSpeed(imported.globalSettings.rotationSpeed);
          setRotationSensitivity(imported.globalSettings.rotationSensitivity || 0.015);
          setTheme(imported.globalSettings.theme);
          setBrownianMotion(imported.globalSettings.brownianMotion);
          setBrownianAmplitude(imported.globalSettings.brownianAmplitude);
          setBrownianSpeed(imported.globalSettings.brownianSpeed || 1.0);
        }

        // Apply shape-specific settings
        if (imported.shapeSpecific) {
          setShapeSpecificSettings(imported.shapeSpecific);
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
      pointColor: pointColorTheme,
      pointOpacity,
      edgeColor: edgeColorTheme,
      edgeOpacity,
      edgeStyle,
      autoRotate,
      rotationSpeed,
      rotationSensitivity,
      theme,
      brownianMotion,
      brownianAmplitude,
      brownianSpeed,
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
    if (settings.pointColor !== undefined) {
      setPointColorTheme(settings.pointColor);
    }
    if (settings.pointOpacity !== undefined) {
      setPointOpacity(settings.pointOpacity);
    }
    if (settings.edgeColor !== undefined) {
      setEdgeColorTheme(settings.edgeColor);
    }
    if (settings.edgeOpacity !== undefined) {
      setEdgeOpacity(settings.edgeOpacity);
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
          {/* Theme Toggle */}
          <div className="mb-4">
            <label className="text-gray-700 dark:text-gray-300 block mb-2 text-sm">
              Theme
            </label>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 rounded cursor-pointer text-sm transition-colors"
            >
              {theme === "dark" ? "☀️ Switch to Light" : "🌙 Switch to Dark"}
            </button>
          </div>

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
              Point Color
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-gray-600 dark:text-gray-400 text-xs">
                  Dark
                </label>
                <input
                  type="color"
                  value={pointColorTheme.dark}
                  onChange={(e) =>
                    setPointColorTheme({
                      ...pointColorTheme,
                      dark: e.target.value,
                    })
                  }
                  className="w-full h-8"
                />
              </div>
              <div className="flex-1">
                <label className="text-gray-600 dark:text-gray-400 text-xs">
                  Light
                </label>
                <input
                  type="color"
                  value={
                    pointColorTheme.light || darkToLight(pointColorTheme.dark)
                  }
                  onChange={(e) =>
                    setPointColorTheme({
                      ...pointColorTheme,
                      light: e.target.value,
                    })
                  }
                  className="w-full h-8"
                />
              </div>
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
                  Edge Color
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-gray-600 dark:text-gray-400 text-xs">
                      Dark
                    </label>
                    <input
                      type="color"
                      value={edgeColorTheme.dark}
                      onChange={(e) =>
                        setEdgeColorTheme({
                          ...edgeColorTheme,
                          dark: e.target.value,
                        })
                      }
                      className="w-full h-8"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-gray-600 dark:text-gray-400 text-xs">
                      Light
                    </label>
                    <input
                      type="color"
                      value={
                        edgeColorTheme.light || darkToLight(edgeColorTheme.dark)
                      }
                      onChange={(e) =>
                        setEdgeColorTheme({
                          ...edgeColorTheme,
                          light: e.target.value,
                        })
                      }
                      className="w-full h-8"
                    />
                  </div>
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
                maxBaseValue={0.1}
                baseStep={0.001}
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
