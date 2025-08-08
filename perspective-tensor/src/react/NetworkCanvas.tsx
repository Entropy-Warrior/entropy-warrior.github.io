import { useEffect, useRef } from 'react';

type Vec2 = { x: number; y: number };

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function polarToCartesian(r: number, a: number): Vec2 {
  return { x: r * Math.cos(a), y: r * Math.sin(a) };
}

function shapeCircle(count: number, radius: number): Vec2[] {
  const pts: Vec2[] = [];
  for (let i = 0; i < count; i++) {
    const t = (i / count) * Math.PI * 2;
    const { x, y } = polarToCartesian(radius, t);
    pts.push({ x, y });
  }
  return pts;
}

// Bernoulli lemniscate (∞)
function shapeLemniscate(count: number, radius: number): Vec2[] {
  const pts: Vec2[] = [];
  for (let i = 0; i < count; i++) {
    const t = (i / count) * Math.PI * 2;
    const denom = 1 + Math.sin(t) * Math.sin(t);
    const x = (radius * Math.cos(t)) / denom;
    const y = (radius * Math.sin(t) * Math.cos(t)) / denom;
    pts.push({ x, y });
  }
  return pts;
}

// Spiral-ish curve for perspective shift
function shapeSpiral(count: number, radius: number): Vec2[] {
  const pts: Vec2[] = [];
  for (let i = 0; i < count; i++) {
    const t = (i / count) * Math.PI * 4;
    const r = radius * (0.3 + 0.7 * (i / count));
    const { x, y } = polarToCartesian(r, t);
    pts.push({ x, y });
  }
  return pts;
}

function isDark(): boolean {
  return document.documentElement.classList.contains('dark');
}

export default function NetworkCanvas({ nodeCount = 120 }: { nodeCount?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let destroyed = false;
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      width = parent.clientWidth;
      height = Math.max(220, Math.min(420, Math.round(parent.clientWidth * 0.28)));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Generate initial positions on a circle
    let current: Vec2[] = shapeCircle(nodeCount, Math.min(width, height) * 0.28);
    let targetIndex = 0;
    const shapes = [
      () => shapeCircle(nodeCount, Math.min(width, height) * 0.28),
      () => shapeLemniscate(nodeCount, Math.min(width, height) * 0.32),
      () => shapeSpiral(nodeCount, Math.min(width, height) * 0.28),
    ];
    let target: Vec2[] = shapes[1]();
    let morphStart = performance.now();
    let morphDuration = 8000; // ms

    const pickNext = () => {
      targetIndex = (targetIndex + 1) % shapes.length;
      current = current.map((p) => ({ ...p })); // freeze as start
      target = shapes[targetIndex]();
      morphStart = performance.now();
      morphDuration = 7000 + Math.random() * 4000;
    };

    let connectionsThreshold = 120; // px

    const draw = (now: number) => {
      if (destroyed) return;
      ctx.clearRect(0, 0, width, height);

      // Colors
      const dark = isDark();
      const line = dark ? 'rgba(229, 231, 235, 0.18)' : 'rgba(15, 23, 42, 0.16)';
      const node = dark ? 'rgba(229, 231, 235, 0.7)' : 'rgba(15, 23, 42, 0.55)';

      // Morph factor
      let t = (now - morphStart) / morphDuration;
      if (t >= 1) {
        pickNext();
        t = 0;
      }
      const e = easeInOutQuad(t);

      // Compute interpolated positions and small drift
      const centerX = width / 2;
      const centerY = height / 2;

      const pts: Vec2[] = [];
      for (let i = 0; i < nodeCount; i++) {
        const a = current[i % current.length];
        const b = target[i % target.length];
        const x = lerp(a.x, b.x, e) + Math.sin(now * 0.001 + i) * 3;
        const y = lerp(a.y, b.y, e) + Math.cos(now * 0.0013 + i * 1.7) * 3;
        pts.push({ x: centerX + x, y: centerY + y });
      }

      // Draw connections
      ctx.lineWidth = 1;
      ctx.strokeStyle = line;
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d = Math.hypot(dx, dy);
          if (d < connectionsThreshold) {
            // fade by distance
            const alpha = 1 - d / connectionsThreshold;
            ctx.globalAlpha = alpha * 0.9;
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
          }
        }
      }
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Draw nodes
      ctx.fillStyle = node;
      for (const p of pts) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      requestAnimationFrame(draw);
    };

    const raf = requestAnimationFrame(draw);

    return () => {
      destroyed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [nodeCount]);

  return (
    <div className="h-[260px] w-full rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white/30 dark:bg-white/0">
      <canvas ref={canvasRef} className="block w-full h-full" aria-hidden="true" />
    </div>
  );
}


