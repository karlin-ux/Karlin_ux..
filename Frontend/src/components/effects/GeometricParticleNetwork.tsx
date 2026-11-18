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
  mode: "spiral" | "zigzag" | "wander";
  modeT: number;
  turn: number;
  teleportIn: number;
  glow: number;
  glowTarget: number;
  glowChangeAt: number;
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

    const pickMode = (): Particle["mode"] => {
      const r = Math.random();
      if (r < 0.34) return "spiral";
      if (r < 0.67) return "zigzag";
      return "wander";
    };

    const createParticleAt = (x: number, y: number, i = 0): Particle => ({
      x,
      y,
      vx: random(-1.4, 1.4),
      vy: random(-1.4, 1.4),
      z: 1,
      radius: 1.4,
      phase: random(0, Math.PI * 2),
      mode: pickMode(),
      modeT: random(20, 90),
      turn: Math.random() < 0.5 ? -1 : 1,
      teleportIn: random(90, 240),
      glow: 0,
      glowTarget: Math.random() < 0.3 ? 1 : 0,
      glowChangeAt: performance.now() + random(800, 2600) + i * 3,
    });

    const particleCount = () => {
      const area = Math.max(1, width * height);
      const base = mobile() ? 1.3 : 1.75;
      const scaled = (area / 10000) * base * clamp(density, 0.6, 1.8);
      return clamp(Math.floor(scaled), mobile() ? 45 : 80, mobile() ? 95 : 190);
    };

    const placeParticles = (count: number) => {
      particles.length = 0;
      const area = Math.max(1, width * height);
      const spacing = Math.sqrt(area / Math.max(1, count));
      // Space dots ~25% further apart to avoid tight groups
      const minDist = spacing * 0.72;
      const minDistSq = minDist * minDist;
      for (let i = 0; i < count; i++) {
        let x = random(0, width);
        let y = random(0, height);
        let bestX = x;
        let bestY = y;
        let bestScore = -1;
        const attempts = 18;
        for (let a = 0; a < attempts; a++) {
          const tx = random(0, width);
          const ty = random(0, height);
          let nearestSq = Infinity;
          // check against placed particles (best-effort)
          for (let j = 0; j < particles.length; j++) {
            const dx = tx - particles[j].x;
            const dy = ty - particles[j].y;
            const d2 = dx * dx + dy * dy;
            if (d2 < nearestSq) nearestSq = d2;
          }
          if (particles.length === 0) nearestSq = Infinity;
          if (nearestSq >= minDistSq) {
            bestX = tx;
            bestY = ty;
            bestScore = nearestSq;
            break;
          }
          if (nearestSq > bestScore) {
            bestScore = nearestSq;
            bestX = tx;
            bestY = ty;
          }
        }
        x = bestX;
        y = bestY;
        particles.push(createParticleAt(x, y, i));
      }
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
      placeParticles(count);
      screenX.length = count;
      screenY.length = count;
      proximity.length = count;

      const spacing = Math.sqrt((width * height) / Math.max(1, count));
      connectionDistance = clamp(spacing * 2.35, mobile() ? 95 : 115, mobile() ? 135 : 175);
      cellSize = connectionDistance;
      gridCols = Math.max(1, Math.ceil(width / cellSize));
      gridRows = Math.max(1, Math.ceil(height / cellSize));
      cellBuckets = Array.from({ length: gridCols * gridRows }, () => [] as number[]);

      if (reducedMotion.matches) renderStatic();
    };

    const updatePointer = (event: PointerEvent) => {
      if (!interactive || reducedMotion.matches) return;
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

    const renderConnections = (_palette: RGB[]) => {
      // Dot-to-dot lines removed: cursor connects to dots instead
    };

    const renderCursorNearest = (palette: RGB[]) => {
      if (!interactive || !pointer.active || reducedMotion.matches) return;
      if (particles.length === 0) return;
      // Use same line color as constellation lines
      const lineColor = palette.length === 2 ? palette[1] : (palette[1] ?? palette[0] ?? parseColor("#53F5B0"));

      // Cursor "tunnel" node: 170% larger ring with transparent center
      const cursorRadius = 2.4 * 1.7;
      const ringWidth = Math.max(1.5, cursorRadius * 0.38);
      const ringOuter = cursorRadius + ringWidth / 2;

      for (let i = 0; i < particles.length; i++) {
        const dx = screenX[i] - pointer.x;
        const dy = screenY[i] - pointer.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= ringOuter) continue; // don't draw lines inside/through the ring

        const maxDist = Math.max(width, height) * 0.9;
        const fade = clamp(1 - dist / maxDist, 0.15, 1);
        const ux = dx / dist;
        const uy = dy / dist;
        const edgeX = pointer.x + ux * ringOuter;
        const edgeY = pointer.y + uy * ringOuter;

        ctx.strokeStyle = toRgba(lineColor, opacity * (0.18 + fade * 0.5));
        ctx.lineWidth = 0.7 + fade * 0.8;
        ctx.beginPath();
        ctx.moveTo(screenX[i], screenY[i]);
        ctx.lineTo(edgeX, edgeY);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(pointer.x, pointer.y, cursorRadius, 0, Math.PI * 2);
      ctx.strokeStyle = toRgba(lineColor, opacity * 0.9);
      ctx.lineWidth = ringWidth;
      ctx.stroke();
    };

    const renderParticles = (palette: RGB[], time: number) => {
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const twinkle = 0.9 + 0.1 * (0.5 + 0.5 * Math.sin(time * 0.0012 + p.phase * 2.4));
        const boost = 1 + proximity[i] * 0.5;
        const r = p.radius;
        const alpha = clamp(opacity * 0.75 * twinkle * boost, 0, 1);
        const col = palette.length === 2 ? palette[0] : (palette[i % palette.length] ?? palette[0]);

        // Random rotating neon glow (~30% over time)
        if (p.glow > 0.01) {
          const g = p.glow;
          ctx.save();
          ctx.shadowBlur = 10 + g * 18;
          ctx.shadowColor = toRgba(col, clamp(alpha * (0.35 + g * 0.55), 0, 1));
          ctx.beginPath();
          ctx.arc(screenX[i], screenY[i], r + g * 1.6, 0, Math.PI * 2);
          ctx.fillStyle = toRgba(col, clamp(alpha * (0.5 + g * 0.5), 0, 1));
          ctx.fill();
          ctx.restore();
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
          // Random rotating glow: ~30% glowing on average, changes over time
          if (time >= p.glowChangeAt) {
            p.glowTarget = Math.random() < 0.3 ? 1 : 0;
            p.glowChangeAt = time + random(700, 3200);
          }
          const glowStep = 1 - Math.pow(0.08, delta);
          p.glow += (p.glowTarget - p.glow) * glowStep;

          p.phase += 0.03 * delta;
          p.modeT -= delta;
          p.teleportIn -= delta;

          if (p.teleportIn <= 0) {
            p.x = random(0, width);
            p.y = random(0, height);
            p.vx = random(-1.6, 1.6);
            p.vy = random(-1.6, 1.6);
            p.teleportIn = random(80, 260);
            p.mode = pickMode();
            p.modeT = random(18, 80);
          }

          if (p.modeT <= 0) {
            p.mode = pickMode();
            p.modeT = random(18, 80);
            p.turn = Math.random() < 0.5 ? -1 : 1;
          }

          let speed = Math.hypot(p.vx, p.vy) || 1;
          if (p.mode === "spiral") {
            // Spiral: rotate velocity and pulse speed
            const ang = 0.08 * p.turn * delta;
            const cos = Math.cos(ang), sin = Math.sin(ang);
            const nx = p.vx * cos - p.vy * sin;
            const ny = p.vx * sin + p.vy * cos;
            const target = 1.1 + 0.5 * Math.sin(p.phase * 1.3);
            speed = clamp(speed * 0.97 + target * 0.08, 0.5, 2.2);
            p.vx = (nx / (Math.hypot(nx, ny) || 1)) * speed;
            p.vy = (ny / (Math.hypot(nx, ny) || 1)) * speed;
          } else if (p.mode === "zigzag") {
            // Zig-zag: periodic sharp turns
            if (Math.random() < 0.08 * delta) {
              const ang = (Math.PI / 2.2) * p.turn * (0.7 + Math.random() * 0.8);
              const cos = Math.cos(ang), sin = Math.sin(ang);
              const nx = p.vx * cos - p.vy * sin;
              const ny = p.vx * sin + p.vy * cos;
              speed = clamp(1.2 + Math.random() * 1.0, 0.8, 2.4);
              p.vx = (nx / (Math.hypot(nx, ny) || 1)) * speed;
              p.vy = (ny / (Math.hypot(nx, ny) || 1)) * speed;
              p.turn *= -1;
            } else {
              speed = clamp(speed * 0.995 + 1.4 * 0.01, 0.7, 2.3);
              p.vx = (p.vx / (Math.hypot(p.vx, p.vy) || 1)) * speed;
              p.vy = (p.vy / (Math.hypot(p.vx, p.vy) || 1)) * speed;
            }
          } else {
            // Fast random wander
            if (Math.random() < 0.12 * delta) {
              p.vx = clamp(p.vx + random(-0.5, 0.5), -2.2, 2.2);
              p.vy = clamp(p.vy + random(-0.5, 0.5), -2.2, 2.2);
            }
            speed = clamp(Math.hypot(p.vx, p.vy) || 1, 0.6, 2.2);
            p.vx = (p.vx / (Math.hypot(p.vx, p.vy) || 1)) * speed;
            p.vy = (p.vy / (Math.hypot(p.vx, p.vy) || 1)) * speed;
          }

          p.x += p.vx * delta;
          p.y += p.vy * delta;
          if (p.x < -20) p.x = width + 20;
          if (p.x > width + 20) p.x = -20;
          if (p.y < -20) p.y = height + 20;
          if (p.y > height + 20) p.y = -20;
        }
        let x = p.x, y = p.y;
        const pointerActive = interactive && pointer.active && !reducedMotion.matches;
        if (pointerActive) {
          const dx = pointer.x - x;
          const dy = pointer.y - y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          // Gentle follow toward cursor/touch
          if (dist < 220 && dist > 0.001) {
            const pull = (1 - dist / 220) * 0.45;
            x += (dx / dist) * pull;
            y += (dy / dist) * pull;
          }
        }
        screenX[i] = x;
        screenY[i] = y;
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
