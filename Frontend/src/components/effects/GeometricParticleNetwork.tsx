import { useEffect, useRef } from "react";

type Props = {
  colors?: string[];
  density?: number;
  className?: string;
  opacity?: number;
  interactive?: boolean;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  z: number;
  radius: number;
  phase: number;
};

type RGB = { r: number; g: number; b: number };

// Karlin_ux design tokens: --accent, --accent-2, --accent-3
const DEFAULT_COLORS = ["#53F5B0", "#5C9DFF", "#9B85FF"];
const FALLBACK_COLOR: RGB = { r: 100, g: 190, b: 220 };

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

function parseColor(input: string): RGB {
  const hex = input.trim().replace(/^#/, "");
  const full =
    hex.length === 3
      ? hex.split("").map((v) => v + v).join("")
      : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return FALLBACK_COLOR;
  const value = Number.parseInt(full, 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

const toRgba = (color: RGB, alpha: number) =>
  `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${alpha})`;

/**
 * GeometricParticleNetwork
 *
 * Dense constellation: drifting dots connected by lines to nearby dots, with
 * cursor interaction. Respects prefers-reduced-motion and pauses when hidden.
 */
export default function GeometricParticleNetwork({
  colors = DEFAULT_COLORS,
  density = 1,
  className = "",
  opacity = 0.9,
  interactive = true,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paletteKey = colors.join(",");

  const paletteCurrentRef = useRef<RGB[]>([]);
  const paletteTargetRef = useRef<RGB[]>(
    (colors.length ? colors : DEFAULT_COLORS).map(parseColor)
  );
  const redrawRef = useRef<() => void>(() => {});

  useEffect(() => {
    const next = (paletteKey ? paletteKey.split(",") : DEFAULT_COLORS).map(parseColor);
    paletteTargetRef.current = next;
    if (!paletteCurrentRef.current.length) {
      paletteCurrentRef.current = next.map((c) => ({ ...c }));
    }
    redrawRef.current();
  }, [paletteKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    const ctx = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !parent || !ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarsePointer = window.matchMedia("(pointer: coarse)");

    let width = 1;
    let height = 1;
    let dpr = 1;
    let rafId = 0;
    let lastTime = 0;
    let visible = true;
    let running = false;

    const particles: Particle[] = [];
    const screenX: number[] = [];
    const screenY: number[] = [];
    const proximity: number[] = [];
    let cellBuckets: number[][] = [];

    const pointer = { x: -10000, y: -10000, targetX: -10000, targetY: -10000, active: false };

    let connectionDistance = 130;
    let cellSize = 130;
    let gridCols = 1;
    let gridRows = 1;

    const mobile = () => window.innerWidth < 768 || coarsePointer.matches;
    const random = (min: number, max: number) => Math.random() * (max - min) + min;

    const createParticle = (): Particle => ({
      x: random(0, width),
      y: random(0, height),
      vx: random(-0.2, 0.2),
      vy: random(-0.2, 0.2),
      z: random(0.35, 1),
      radius: random(1.0, 2.0),
      phase: random(0, Math.PI * 2),
    });

    const particleCount = () => {
      const area = Math.max(1, width * height);
      const base = mobile() ? 1.4 : 1.9;
      const scaled = (area / 9000) * base * clamp(density, 0.6, 1.8);
      return clamp(Math.floor(scaled), mobile() ? 50 : 90, mobile() ? 110 : 220);
    };

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = particleCount();
      while (particles.length < count) particles.push(createParticle());
      particles.length = count;
      screenX.length = count;
      screenY.length = count;
      proximity.length = count;

      const spacing = Math.sqrt((width * height) / Math.max(1, count));
      connectionDistance = clamp(spacing * 2.1, mobile() ? 85 : 100, mobile() ? 120 : 155);
      cellSize = connectionDistance;
      gridCols = Math.max(1, Math.ceil(width / cellSize));
      gridRows = Math.max(1, Math.ceil(height / cellSize));
      cellBuckets = Array.from({ length: gridCols * gridRows }, () => [] as number[]);

      if (reducedMotion.matches) renderStatic();
    };

    const updatePointer = (event: PointerEvent) => {
      if (!interactive || reducedMotion.matches || mobile()) return;
      if (event.pointerType === "touch") return;
      const rect = parent.getBoundingClientRect();
      const firstEntry = !pointer.active;
      pointer.targetX = event.clientX - rect.left;
      pointer.targetY = event.clientY - rect.top;
      pointer.active = pointer.targetX >= 0 && pointer.targetX <= width && pointer.targetY >= 0 && pointer.targetY <= height;
      if (firstEntry && pointer.active) {
        pointer.x = pointer.targetX;
        pointer.y = pointer.targetY;
      }
    };
    const leavePointer = () => { pointer.active = false; };

    const buildGrid = () => {
      for (let i = 0; i < cellBuckets.length; i++) cellBuckets[i].length = 0;
      for (let i = 0; i < particles.length; i++) {
        const cx = clamp(Math.floor(screenX[i] / cellSize), 0, gridCols - 1);
        const cy = clamp(Math.floor(screenY[i] / cellSize), 0, gridRows - 1);
        cellBuckets[cy * gridCols + cx].push(i);
      }
    };

    const renderConnections = (palette: RGB[]) => {
      const maxDistSq = connectionDistance * connectionDistance;
      for (let i = 0; i < particles.length; i++) {
        const cx = clamp(Math.floor(screenX[i] / cellSize), 0, gridCols - 1);
        const cy = clamp(Math.floor(screenY[i] / cellSize), 0, gridRows - 1);
        for (let oy = -1; oy <= 1; oy++) {
          const ny = cy + oy;
          if (ny < 0 || ny >= gridRows) continue;
          for (let ox = -1; ox <= 1; ox++) {
            const nx = cx + ox;
            if (nx < 0 || nx >= gridCols) continue;
            const bucket = cellBuckets[ny * gridCols + nx];
            for (let k = 0; k < bucket.length; k++) {
              const j = bucket[k];
              if (j <= i) continue;
              const dx = screenX[j] - screenX[i];
              const dy = screenY[j] - screenY[i];
              const d2 = dx * dx + dy * dy;
              if (d2 >= maxDistSq) continue;
              const dist = Math.sqrt(d2);
              const strength = 1 - dist / connectionDistance;
              const depth = (particles[i].z + particles[j].z) / 2;
              const boost = Math.max(proximity[i], proximity[j]);
              const alpha = clamp(opacity * (0.05 + strength * depth * 0.4) * (0.85 + boost * 1.1), 0, 0.85);
              if (alpha <= 0.01) continue;
              const col = palette.length === 2 ? palette[1] : (palette[(i + j) % palette.length] ?? palette[0]);
              ctx.strokeStyle = toRgba(col, alpha);
              ctx.lineWidth = 0.6 + strength * 0.5;
              ctx.beginPath();
              ctx.moveTo(screenX[i], screenY[i]);
              ctx.lineTo(screenX[j], screenY[j]);
              ctx.stroke();
            }
          }
        }
      }
    };

    const renderCursorNearest = (palette: RGB[]) => {
      if (!interactive || !pointer.active || reducedMotion.matches || mobile()) return;
      const nearest: Array<{ i: number; d: number }> = [];
      for (let i = 0; i < particles.length; i++) {
        const dx = screenX[i] - pointer.x;
        const dy = screenY[i] - pointer.y;
        nearest.push({ i, d: dx * dx + dy * dy });
      }
      nearest.sort((a, b) => a.d - b.d);
      const picks = nearest.slice(0, Math.min(7, nearest.length));
      if (picks.length === 0) return;
      // Accent color for cursor connections (lines follow line color in 2-color mode)
      const accent = palette.length === 2 ? palette[1] : (palette[0] ?? parseColor("#53F5B0"));
      const dotAccent = palette.length === 2 ? palette[0] : accent;

      for (let n = 0; n < picks.length; n++) {
        const idx = picks[n].i;
        const fade = 1 - n / Math.max(1, picks.length);
        ctx.strokeStyle = toRgba(accent, opacity * (0.35 + fade * 0.45));
        ctx.lineWidth = 0.9 + fade * 0.6;
        ctx.beginPath();
        ctx.moveTo(screenX[idx], screenY[idx]);
        ctx.lineTo(pointer.x, pointer.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(screenX[idx], screenY[idx], 2.2 + fade * 1.0, 0, Math.PI * 2);
        ctx.fillStyle = toRgba(dotAccent, clamp(opacity * (0.5 + fade * 0.4), 0, 1));
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(pointer.x, pointer.y, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = toRgba(accent, opacity * 0.75);
      ctx.fill();
    };

    const renderParticles = (palette: RGB[], time: number) => {
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const twinkle = 0.75 + 0.25 * (0.5 + 0.5 * Math.sin(time * 0.0014 + p.phase * 3.1));
        const boost = 1 + proximity[i] * 0.7;
        const r = p.radius * (0.7 + p.z * 0.85);
        const alpha = clamp(opacity * (0.4 + p.z * 0.45) * twinkle * boost, 0, 1);
        const col = palette.length === 2 ? palette[0] : (palette[i % palette.length] ?? palette[0]);
        if (p.z > 0.45) {
          ctx.beginPath();
          ctx.arc(screenX[i], screenY[i], r * 2.4, 0, Math.PI * 2);
          ctx.fillStyle = toRgba(col, alpha * 0.12);
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(screenX[i], screenY[i], r, 0, Math.PI * 2);
        ctx.fillStyle = toRgba(col, alpha);
        ctx.fill();
      }
    };

    const render = (time: number, animate: boolean) => {
      const target = paletteTargetRef.current;
      let palette = paletteCurrentRef.current;
      if (!target.length) return;
      if (palette.length !== target.length) {
        palette = target.map((c) => ({ ...c }));
      } else {
        const blend = animate ? Math.min(1, 0.12 * clamp((time - lastTime) / 16.67 || 1, 0.25, 2)) : 1;
        for (let i = 0; i < palette.length; i++) {
          palette[i].r += (target[i].r - palette[i].r) * blend;
          palette[i].g += (target[i].g - palette[i].g) * blend;
          palette[i].b += (target[i].b - palette[i].b) * blend;
        }
      }
      paletteCurrentRef.current = palette;

      const delta = animate ? clamp((time - (lastTime || time)) / 16.67, 0.25, 2) : 1;
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      pointer.x += (pointer.targetX - pointer.x) * 0.16;
      pointer.y += (pointer.targetY - pointer.y) * 0.16;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (animate) {
          p.phase += 0.008 * delta;
          p.x += p.vx * delta;
          p.y += p.vy * delta;
          p.x += Math.sin(p.phase) * 0.04;
          p.y += Math.cos(p.phase * 0.7) * 0.04;
          if (p.x < -20) p.x = width + 20;
          if (p.x > width + 20) p.x = -20;
          if (p.y < -20) p.y = height + 20;
          if (p.y > height + 20) p.y = -20;
        }
        // No ripple/repel effect: dots keep their natural drift
        screenX[i] = p.x;
        screenY[i] = p.y;
        proximity[i] = 0;
      }

      buildGrid();
      renderConnections(palette);
      renderCursorNearest(palette);
      renderParticles(palette, time);
    };

    const renderStatic = () => { render(performance.now(), false); };
    redrawRef.current = renderStatic;

    const frame = (time: number) => {
      if (!running) return;
      if (reducedMotion.matches || !visible || document.hidden) { running = false; return; }
      render(time, true);
      lastTime = time;
      rafId = requestAnimationFrame(frame);
    };
    const start = () => {
      if (running || reducedMotion.matches || !visible || document.hidden) return;
      running = true; lastTime = 0; rafId = requestAnimationFrame(frame);
    };
    const stop = () => { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = 0; };

    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(parent);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible) start(); else stop();
    });
    visibilityObserver.observe(parent);
    const onVisibilityChange = () => { if (document.hidden) stop(); else start(); };
    const onMotionChange = () => { stop(); lastTime = 0; if (reducedMotion.matches) renderStatic(); else start(); };

    window.addEventListener("pointermove", updatePointer, { passive: true });
    window.addEventListener("blur", leavePointer);
    document.addEventListener("visibilitychange", onVisibilityChange);
    reducedMotion.addEventListener("change", onMotionChange);

    resize();
    if (reducedMotion.matches) renderStatic(); else start();

    return () => {
      stop();
      redrawRef.current = () => {};
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      window.removeEventListener("pointermove", updatePointer);
      window.removeEventListener("blur", leavePointer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      reducedMotion.removeEventListener("change", onMotionChange);
    };
  }, [density, opacity, interactive]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      style={{ opacity: 1 }}
    />
  );
}

export { GeometricParticleNetwork };
