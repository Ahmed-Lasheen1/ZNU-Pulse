import { useEffect, useRef, useCallback, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Point {
  x: number;
  y: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  born: number;
}

const CELL_SIZE = 55;
const INFLUENCE_RADIUS = 260;
const MAX_WARP = 24;
const DOT_SPACING = 28;
const LERP_SPEED = 0.08;

const LINE_BASE = { r: 255, g: 255, b: 255, a: 0.13 };
const NODE_BASE_RADIUS = 1.8;
const NODE_ACTIVE_RADIUS = 3.2;

function lerpN(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpColor(
  base: { r: number; g: number; b: number; a: number },
  active: { r: number; g: number; b: number; a: number },
  t: number,
): string {
  const r = Math.round(lerpN(base.r, active.r, t));
  const g = Math.round(lerpN(base.g, active.g, t));
  const b = Math.round(lerpN(base.b, active.b, t));
  const a = lerpN(base.a, active.a, t);
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}

function usePrefersReducedMotion() {
  const ref = useRef(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    ref.current = mq.matches;
    const handler = (e: MediaQueryListEvent) => { ref.current = e.matches; };
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);
  return ref;
}

// Adapted from the standalone kinetic-grid demo for ZNU Pulse. `overlay`
// mode skips the solid background + dot texture and renders only the
// warping grid lines/nodes at reduced opacity, to sit on top of
// PulseBackground.tsx instead of replacing it.
//
// Input is handled entirely through the Pointer Events API
// (pointermove/pointerdown/pointerup/pointercancel) rather than
// separate mouse/touch listeners — this unifies mouse, touch, and pen
// into one code path and is the standard approach for canvas effects
// that need to work on touch devices. All listeners are passive
// (nothing here ever calls preventDefault), so page scrolling and
// pinch-zoom are never affected — same as before. A touch has no
// resting "hover" position the way a mouse cursor does, so on
// pointerup/pointercancel for a touch pointer we relax the tracked
// position back off-canvas; otherwise the grid would stay warped
// toward wherever a finger last touched, forever, once lifted.
export default function KineticGrid({
  children,
  className,
  globalColor = "default",
  overlay = false,
  opacity = 1,
}: {
  children?: ReactNode;
  className?: string;
  globalColor?: "default" | "monochrome";
  overlay?: boolean;
  opacity?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const mouseRef = useRef<Point>({ x: -9999, y: -9999 });
  const targetMouseRef = useRef<Point>({ x: -9999, y: -9999 });
  const ripplesRef = useRef<Ripple[]>([]);
  const rafRef = useRef<number>(0);
  const sizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const reducedMotionRef = usePrefersReducedMotion();

  // Reused across frames — only reallocated when the grid's col/row
  // count actually changes (e.g. on resize), not on every tick.
  const gridRef = useRef<{ cols: number; rows: number; pts: Point[][]; prox: number[][] }>({
    cols: 0, rows: 0, pts: [], prox: [],
  });

  // Mutates `outPt` in place and returns proximity, instead of
  // allocating a new {x,y} object on every cell every frame.
  const getWarpedPoint = useCallback(
    (
      gx: number,
      gy: number,
      col: number,
      row: number,
      mouse: Point,
      ripples: Ripple[],
      cols: number,
      rows: number,
      outPt: Point,
    ): number => {
      const edgeMargin = 1.5;
      const colPin = Math.min(col / edgeMargin, (cols - 1 - col) / edgeMargin, 1);
      const rowPin = Math.min(row / edgeMargin, (rows - 1 - row) / edgeMargin, 1);
      const pinFactor = colPin * colPin * rowPin * rowPin;

      const dx = gx - mouse.x;
      const dy = gy - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const proximity = Math.max(0, 1 - dist / INFLUENCE_RADIUS) * pinFactor;

      let rx = 0, ry = 0;
      for (const r of ripples) {
        const rdx = gx - r.x;
        const rdy = gy - r.y;
        const rdist = Math.sqrt(rdx * rdx + rdy * rdy);
        const waveWidth = 55;
        const diff = rdist - r.radius;
        if (Math.abs(diff) < waveWidth) {
          const strength = (1 - Math.abs(diff) / waveWidth) * r.opacity * 18 * pinFactor;
          const angle = Math.atan2(rdy, rdx);
          const sign = diff < 0 ? -1 : 1;
          rx += Math.cos(angle) * strength * sign * -1;
          ry += Math.sin(angle) * strength * sign * -1;
        }
      }

      if (dist < INFLUENCE_RADIUS && dist > 0 && pinFactor > 0) {
        const t = dist / INFLUENCE_RADIUS;
        const eased = t < 0.01 ? 0 : (1 - t) * (1 - t) * Math.min(1, dist / 60);
        const warpAmt = eased * MAX_WARP * pinFactor;
        const angle = Math.atan2(dy, dx);
        outPt.x = gx - Math.cos(angle) * warpAmt + rx;
        outPt.y = gy - Math.sin(angle) * warpAmt + ry;
        return proximity;
      }

      outPt.x = gx + rx;
      outPt.y = gy + ry;
      return proximity;
    },
    [],
  );

  const draw = useCallback(
    (now: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const { w: W, h: H } = sizeRef.current;
      const mouse = mouseRef.current;
      const ripples = ripplesRef.current;

      const overlayScale = overlay ? 0.55 : 1;

      const theme = {
        default: {
          bg: "#161618",
          lineActive: { r: 74, g: 158, b: 255, a: 0.9 * overlayScale },
          nodeActive: { r: 74, g: 158, b: 255, a: 1.0 * overlayScale },
          glow: "74,158,255",
          ripple: "100,180,255",
        },
        monochrome: {
          bg: "#000000",
          lineActive: { r: 255, g: 255, b: 255, a: 0.9 * overlayScale },
          nodeActive: { r: 255, g: 255, b: 255, a: 1.0 * overlayScale },
          glow: "255,255,255",
          ripple: "255,255,255",
        },
      }[globalColor ?? "default"];

      ctx.clearRect(0, 0, W, H);

      if (!overlay) {
        ctx.fillStyle = theme.bg;
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = "rgba(255,255,255,0.05)";
        for (let x = DOT_SPACING / 2; x < W; x += DOT_SPACING) {
          for (let y = DOT_SPACING / 2; y < H; y += DOT_SPACING) {
            ctx.beginPath();
            ctx.arc(x, y, 0.7, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        const age = (now - r.born) / 1000;
        r.radius = Math.max(0, age * 400);
        r.opacity = Math.max(0, 1 - age * 1.2);
        if (r.opacity <= 0) ripples.splice(i, 1);
      }

      const cols = Math.max(2, Math.ceil(W / CELL_SIZE)) + 1;
      const rows = Math.max(2, Math.ceil(H / CELL_SIZE)) + 1;
      const cellW = W / (cols - 1);
      const cellH = H / (rows - 1);

      const grid = gridRef.current;
      if (grid.cols !== cols || grid.rows !== rows) {
        grid.pts = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ x: 0, y: 0 })));
        grid.prox = Array.from({ length: rows }, () => new Array(cols).fill(0));
        grid.cols = cols;
        grid.rows = rows;
      }
      const pts = grid.pts;
      const prox = grid.prox;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          prox[row][col] = getWarpedPoint(col * cellW, row * cellH, col, row, mouse, ripples, cols, rows, pts[row][col]);
        }
      }

      const lineBase = overlay ? { ...LINE_BASE, a: LINE_BASE.a * overlayScale } : LINE_BASE;

      const drawSeg = (p1: Point, p2: Point, pr1: number, pr2: number) => {
        const avg = (pr1 + pr2) / 2;
        const t = avg * avg * (3 - 2 * avg);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = lerpColor(lineBase, theme.lineActive, t);
        ctx.lineWidth = lerpN(0.8, 1.5, t);
        ctx.stroke();
      };

      ctx.lineCap = "butt";

      for (let row = 0; row < rows; row++)
        for (let col = 0; col < cols - 1; col++)
          drawSeg(pts[row][col], pts[row][col + 1], prox[row][col], prox[row][col + 1]);

      for (let col = 0; col < cols; col++)
        for (let row = 0; row < rows - 1; row++)
          drawSeg(pts[row][col], pts[row + 1][col], prox[row][col], prox[row + 1][col]);

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const p = pts[row][col];
          const pr = prox[row][col];
          const t = pr * pr * (3 - 2 * pr);
          const r = lerpN(NODE_BASE_RADIUS, NODE_ACTIVE_RADIUS, t);

          if (t > 0.3) {
            const glowR = r + lerpN(0, 6, (t - 0.3) / 0.7);
            const grd = ctx.createRadialGradient(p.x, p.y, r * 0.5, p.x, p.y, glowR);
            grd.addColorStop(0, `rgba(${theme.glow},${(t * 0.3 * overlayScale).toFixed(3)})`);
            grd.addColorStop(1, `rgba(${theme.glow},0)`);
            ctx.beginPath();
            ctx.arc(p.x, p.y, glowR, 0, Math.PI * 2);
            ctx.fillStyle = grd;
            ctx.fill();
          }

          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fillStyle = lerpColor(
            { r: 255, g: 255, b: 255, a: (overlay ? 0.12 : 0.2) * (overlay ? overlayScale : 1) },
            theme.nodeActive,
            t,
          );
          ctx.fill();
        }
      }

      for (const r of ripples) {
        const safeRadius = Math.max(0, r.radius);
        ctx.beginPath();
        ctx.arc(r.x, r.y, safeRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${theme.ripple},${(r.opacity * 0.28 * overlayScale).toFixed(3)})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    },
    [getWarpedPoint, globalColor, overlay],
  );

  const animate = useCallback(
    (now: number) => {
      const m = mouseRef.current;
      const t = targetMouseRef.current;
      m.x = lerpN(m.x, t.x, LERP_SPEED);
      m.y = lerpN(m.y, t.y, LERP_SPEED);
      draw(now);
      rafRef.current = requestAnimationFrame(animate);
    },
    [draw],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const setSize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      sizeRef.current = { w, h };
    };

    let resizeTimeout: ReturnType<typeof setTimeout> | undefined;
    const debouncedSetSize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(setSize, 150);
    };

    setSize();
    window.addEventListener("resize", debouncedSetSize);

    if (reducedMotionRef.current) {
      draw(performance.now());
      return () => {
        clearTimeout(resizeTimeout);
        window.removeEventListener("resize", debouncedSetSize);
      };
    }

    // Pointer Events unify mouse, touch, and pen into one stream — the
    // grid follows whatever pointer is active, whether that's a mouse
    // moving or a finger dragging across the screen.
    const onPointerMove = (e: PointerEvent) => {
      targetMouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const onPointerDown = (e: PointerEvent) => {
      ripplesRef.current.push({ x: e.clientX, y: e.clientY, radius: 0, opacity: 1, born: performance.now() });
    };
    // A touch has no resting "hover" position the way a mouse cursor
    // does — once the finger lifts, relax the tracked point back
    // off-canvas so the warp eases away instead of freezing at the
    // last touch location. Mouse pointers are left alone here since a
    // mouse's position stays meaningful even without further movement.
    const onPointerEnd = (e: PointerEvent) => {
      if (e.pointerType === "touch") {
        targetMouseRef.current = { x: -9999, y: -9999 };
      }
    };

    // Stops the rAF loop while the tab is backgrounded — no reason to
    // keep redrawing a canvas nobody can see.
    const onVisibilityChange = () => {
      if (document.hidden) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      } else {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    // Passive: none of these ever call preventDefault, so normal page
    // scrolling and pinch-zoom are untouched — same as before.
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerEnd, { passive: true });
    window.addEventListener("pointercancel", onPointerEnd, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    if (!document.hidden) rafRef.current = requestAnimationFrame(animate);

    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener("resize", debouncedSetSize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate, draw]);

  if (overlay || !children) {
    return (
      <canvas
        ref={canvasRef}
        aria-hidden
        style={{ opacity }}
        className={cn("fixed inset-0 w-full h-full pointer-events-none z-0", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "relative w-full min-h-screen overflow-hidden",
        globalColor === "monochrome" ? "bg-[#000000]" : "bg-[#161618]",
        className,
      )}
    >
      <canvas ref={canvasRef} className="fixed inset-0 w-full h-full z-0 pointer-events-none" />
      <div className="relative z-10 w-full h-full">{children}</div>
    </div>
  );
}
