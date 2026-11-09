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
      ? hex
          .split("")
          .map((v) => v + v)
          .join("")
      : hex;

  if (!/^[0-9a-fA-F]{6}$/.test(full)) return FALLBACK_COLOR;

  const value = Number.parseInt(full, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

const toRgba = (color: RGB, alpha: number) =>
  `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(
    color.b
  )}, ${alpha})`;

/** Get (or create) the batched Path2D for a colour/alpha bucket. */
function bucketPath(buckets: Map<number, Path2D>, key: number): Path2D {
  let path = buckets.get(key);

  if (!path) {
    path = new Path2D();
    buckets.set(key, path);
  }

  return path;
}

/** Flush all batched paths, one canvas call per colour/alpha bucket. */
function flushBuckets(
  ctx: CanvasRenderingContext2D,
  buckets: Map<number, Path2D>,
  palette: RGB[],
  alphaStep: number,
  mode: "fill" | "stroke"
) {
  if (!palette.length) return;

  buckets.forEach((path, key) => {
    const colorIndex = Math.floor(key / 1024) % palette.length;
    const level = key % 1024;
    const alpha = Math.min(1, level * alphaStep);

    if (alpha <= 0) return;

    const color = palette[colorIndex] ?? palette[0];
    const value = toRgba(color, alpha);

    if (mode === "fill") {
      ctx.fillStyle = value;
      ctx.fill(path);
    } else {
      ctx.strokeStyle = value;
      ctx.lineWidth = 0.8;
      ctx.stroke(path);
    }
  });
}

/**
 * GeometricParticleNetwork
 *
 * A living, cursor-reactive geometric network:
 * - dense depth-layered particles with irregular triangular faces
 * - uniform spatial grid so neighbour search stays cheap as density rises
 * - batched Path2D drawing (a handful of canvas calls per frame)
 * - smooth cursor displacement plus local illumination (no big halo)
 * - palette changes are blended live, outside React state
 * - respects prefers-reduced-motion and pauses when hidden
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

  // Current palette is interpolated toward the target every frame.
  const paletteCurrentRef = useRef<RGB[]>([]);
  const paletteTargetRef = useRef<RGB[]>(
    (colors.length ? colors : DEFAULT_COLORS).map(parseColor)
  );
  // Lets the palette effect repaint a static (reduced-motion) frame.
  const redrawRef = useRef<() => void>(() => {});

  useEffect(() => {
    const next = (paletteKey ? paletteKey.split(",") : DEFAULT_COLORS).map(
      parseColor
    );

    paletteTargetRef.current = next;

    if (!paletteCurrentRef.current.length) {
      paletteCurrentRef.current = next.map((color) => ({ ...color }));
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

    let connectionDistance = 140;
    let interactionRadius = 210;
    let cellSize = 140;
    let gridCols = 1;
    let gridRows = 1;

    const particles: Particle[] = [];
    const screenX: number[] = [];
    const screenY: number[] = [];
    const proximity: number[] = [];

    // Reused per-frame structures (no per-frame garbage for the grid).
    let cellBuckets: number[][] = [];
    let neighbourLists: number[][] = [];
    const triangleCandidates: number[] = [];

    const lineBuckets = new Map<number, Path2D>();
    const triangleBuckets = new Map<number, Path2D>();
    const coreBuckets = new Map<number, Path2D>();
    const glowBuckets = new Map<number, Path2D>();

    const pointer = {
      x: -10000,
      y: -10000,
      targetX: -10000,
      targetY: -10000,
      active: false,
    };

    const mobile = () => window.innerWidth < 768 || coarsePointer.matches;

    const random = (min: number, max: number) =>
      Math.random() * (max - min) + min;

    const createParticle = (): Particle => ({
      x: random(0, width),
      y: random(0, height),
      vx: random(-0.18, 0.18),
      vy: random(-0.18, 0.18),
      z: random(0.35, 1),
      radius: random(0.85, 1.9),
      phase: random(0, Math.PI * 2),
    });

    const particleCount = () => {
      const area = Math.max(1, width * height);
      const baseDensity = mobile() ? 1.2 : 1.7;
      const scaled = (area / 7500) * baseDensity * clamp(density, 0.5, 1.6);

      return clamp(
        Math.floor(scaled),
        mobile() ? 44 : 105,
        mobile() ? 95 : 300
      );
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

      while (neighbourLists.length < count) neighbourLists.push([]);
      neighbourLists.length = count;

      const spacing = Math.sqrt((width * height) / Math.max(1, count));
      connectionDistance = clamp(
        spacing * 2.05,
        mobile() ? 92 : 120,
        mobile() ? 140 : 200
      );
      interactionRadius = mobile() ? 0 : clamp(connectionDistance * 1.5, 180, 240);

      cellSize = connectionDistance;
      gridCols = Math.max(1, Math.ceil(width / cellSize));
      gridRows = Math.max(1, Math.ceil(height / cellSize));
      cellBuckets = Array.from(
        { length: gridCols * gridRows },
        () => [] as number[]
      );

      if (reducedMotion.matches) {
        renderStatic();
      }
    };

    const updatePointer = (event: PointerEvent) => {
      if (!interactive || reducedMotion.matches || mobile()) return;
      if (event.pointerType === "touch") return;

      const rect = parent.getBoundingClientRect();
      const firstEntry = !pointer.active;

      pointer.targetX = event.clientX - rect.left;
      pointer.targetY = event.clientY - rect.top;
      pointer.active =
        pointer.targetX >= 0 &&
        pointer.targetX <= width &&
        pointer.targetY >= 0 &&
        pointer.targetY <= height;

      // Snap on (re-)entry so the spotlight never flies in from its park
      // position the first time the visitor moves the pointer.
      if (firstEntry && pointer.active) {
        pointer.x = pointer.targetX;
        pointer.y = pointer.targetY;
      }
    };

    const leavePointer = () => {
      pointer.active = false;
    };

    const distSq = (a: number, b: number) => {
      const dx = screenX[a] - screenX[b];
      const dy = screenY[a] - screenY[b];
      return dx * dx + dy * dy;
    };

    const buildGrid = () => {
      for (let i = 0; i < cellBuckets.length; i++) {
        cellBuckets[i].length = 0;
      }

      for (let i = 0; i < particles.length; i++) {
        const cx = clamp(Math.floor(screenX[i] / cellSize), 0, gridCols - 1);
        const cy = clamp(Math.floor(screenY[i] / cellSize), 0, gridRows - 1);
        cellBuckets[cy * gridCols + cx].push(i);
      }
    };

    const buildNeighbours = () => {
      for (let i = 0; i < neighbourLists.length; i++) {
        neighbourLists[i].length = 0;
      }

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

              if (dx * dx + dy * dy < maxDistSq) {
                neighbourLists[i].push(j);
                neighbourLists[j].push(i);
              }
            }
          }
        }
      }
    };

    const renderTriangles = (palette: RGB[]) => {
      triangleBuckets.clear();

      const maxEdgeSq = (connectionDistance * 0.9) ** 2;
      const minArea = 160;
      const maxArea = connectionDistance * connectionDistance * 0.2;
      const triNeighbours = 4;

      // Faces are decorative accents; building them for every third node keeps
      // translucent overdraw low without making the formations look patterned.
      for (let i = 0; i < particles.length; i += 3) {
        const list = neighbourLists[i];
        if (list.length < 2) continue;

        // Closest connections first, then keep only forward indices so each
        // triangle is emitted exactly once (i < j, k).
        list.sort((a, b) => distSq(i, a) - distSq(i, b));

        triangleCandidates.length = 0;

        for (let n = 0; n < list.length; n++) {
          const j = list[n];
          if (j > i) triangleCandidates.push(j);
          if (triangleCandidates.length >= triNeighbours) break;
        }

        if (triangleCandidates.length < 2) continue;

        const ax = screenX[i];
        const ay = screenY[i];

        for (let n = 0; n < triangleCandidates.length; n++) {
          const j = triangleCandidates[n];

          for (let m = n + 1; m < triangleCandidates.length; m++) {
            const k = triangleCandidates[m];

            if (distSq(j, k) > maxEdgeSq) continue;

            const area =
              Math.abs(
                (screenX[j] - ax) * (screenY[k] - ay) -
                  (screenX[k] - ax) * (screenY[j] - ay)
              ) / 2;

            if (area < minArea || area > maxArea) continue;

            const depth =
              (particles[i].z + particles[j].z + particles[k].z) / 3;
            const boost = Math.max(
              proximity[i],
              proximity[j],
              proximity[k]
            );
            const alpha = opacity * (0.022 + depth * 0.03 + boost * 0.03);
            const level = Math.min(1023, Math.round(alpha / 0.015));

            if (level <= 0) continue;

            const colorIndex = (i + j + k) % palette.length;
            const path = bucketPath(
              triangleBuckets,
              colorIndex * 1024 + level
            );

            path.moveTo(ax, ay);
            path.lineTo(screenX[j], screenY[j]);
            path.lineTo(screenX[k], screenY[k]);
            path.closePath();
          }
        }
      }

      flushBuckets(ctx, triangleBuckets, palette, 0.015, "fill");
    };

    const renderLines = (palette: RGB[]) => {
      lineBuckets.clear();

      for (let i = 0; i < particles.length; i++) {
        const list = neighbourLists[i];

        for (let n = 0; n < list.length; n++) {
          const j = list[n];
          if (j <= i) continue;

          const dx = screenX[j] - screenX[i];
          const dy = screenY[j] - screenY[i];
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance >= connectionDistance) continue;

          const strength = 1 - distance / connectionDistance;
          const depth = (particles[i].z + particles[j].z) / 2;
          const boost = Math.max(proximity[i], proximity[j]);

          const alpha =
            opacity *
            (0.065 + strength * depth * 0.4) *
            (0.85 + boost * 1.1);

          const level = Math.min(1023, Math.round(alpha / 0.07));
          if (level <= 0) continue;

          const colorIndex = (i + j) % palette.length;
          const path = bucketPath(lineBuckets, colorIndex * 1024 + level);

          path.moveTo(screenX[i], screenY[i]);
          path.lineTo(screenX[j], screenY[j]);
        }
      }

      flushBuckets(ctx, lineBuckets, palette, 0.07, "stroke");
    };

    const renderParticles = (palette: RGB[]) => {
      coreBuckets.clear();
      glowBuckets.clear();

      for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        const colorIndex = i % palette.length;
        const boost = 1 + proximity[i] * 0.7;

        const radius = particle.radius * (0.7 + particle.z * 0.9);
        const alpha = clamp(
          opacity * (0.38 + particle.z * 0.58) * boost,
          0,
          1
        );

        const coreLevel = Math.min(1023, Math.round(alpha / 0.14));
        const glowLevel = Math.min(
          1023,
          Math.round((alpha * 0.12) / 0.06)
        );

        if (coreLevel > 0) {
          const path = bucketPath(coreBuckets, colorIndex * 1024 + coreLevel);
          path.moveTo(screenX[i] + radius, screenY[i]);
          path.arc(screenX[i], screenY[i], radius, 0, Math.PI * 2);
        }

        // A glow per particle is costly and barely visible; only the nearer
        // (larger-z) particles get one.
        if (glowLevel > 0 && particle.z > 0.55) {
          const glowRadius = radius * 2.7;
          const path = bucketPath(glowBuckets, colorIndex * 1024 + glowLevel);
          path.moveTo(screenX[i] + glowRadius, screenY[i]);
          path.arc(screenX[i], screenY[i], glowRadius, 0, Math.PI * 2);
        }
      }

      flushBuckets(ctx, glowBuckets, palette, 0.06, "fill");
      flushBuckets(ctx, coreBuckets, palette, 0.14, "fill");
    };

    const renderSpotlight = (palette: RGB[]) => {
      if (!interactive || !pointer.active || !palette.length) return;

      const radius = Math.min(170, interactionRadius * 0.9);
      const glow = ctx.createRadialGradient(
        pointer.x,
        pointer.y,
        0,
        pointer.x,
        pointer.y,
        radius
      );
      const secondary = palette[1 % palette.length] ?? palette[0];

      glow.addColorStop(0, toRgba(palette[0], 0.08));
      glow.addColorStop(0.5, toRgba(secondary, 0.03));
      glow.addColorStop(1, toRgba(palette[0], 0));

      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
    };

    const render = (time: number, animate: boolean) => {
      const target = paletteTargetRef.current;
      let palette = paletteCurrentRef.current;

      if (!target.length) return;

      if (palette.length !== target.length) {
        palette = target.map((color) => ({ ...color }));
      } else {
        const blend = animate
          ? Math.min(1, 0.12 * clamp((time - lastTime) / 16.67 || 1, 0.25, 2))
          : 1;

        for (let i = 0; i < palette.length; i++) {
          const current = palette[i];
          const next = target[i];

          current.r += (next.r - current.r) * blend;
          current.g += (next.g - current.g) * blend;
          current.b += (next.b - current.b) * blend;
        }
      }

      paletteCurrentRef.current = palette;

      const delta = animate
        ? clamp((time - (lastTime || time)) / 16.67, 0.25, 2)
        : 1;

      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      pointer.x += (pointer.targetX - pointer.x) * 0.16;
      pointer.y += (pointer.targetY - pointer.y) * 0.16;

      const pointerActive = interactive && pointer.active && !reducedMotion.matches;

      for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];

        if (animate) {
          particle.phase += 0.007 * delta;
          particle.x += particle.vx * delta;
          particle.y += particle.vy * delta;
          particle.x += Math.sin(particle.phase) * 0.055;
          particle.y += Math.cos(particle.phase * 0.7) * 0.055;

          if (particle.x < -20) particle.x = width + 20;
          if (particle.x > width + 20) particle.x = -20;
          if (particle.y < -20) particle.y = height + 20;
          if (particle.y > height + 20) particle.y = -20;
        }

        let x = particle.x;
        let y = particle.y;

        if (pointerActive && interactionRadius > 0) {
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance > 0.001 && distance < interactionRadius) {
            const influence = 1 - distance / interactionRadius;

            // Squared falloff keeps the push smooth and local.
            const force = influence * influence * 30 * particle.z;
            x += (dx / distance) * force;
            y += (dy / distance) * force;
          }
        }

        screenX[i] = x;
        screenY[i] = y;

        if (pointerActive && interactionRadius > 0) {
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          proximity[i] = clamp(
            1 - distance / (interactionRadius * 1.5),
            0,
            1
          );
        } else {
          proximity[i] = 0;
        }
      }

      buildGrid();
      buildNeighbours();

      renderSpotlight(palette);
      renderTriangles(palette);
      renderLines(palette);
      renderParticles(palette);
    };

    const renderStatic = () => {
      render(performance.now(), false);
    };

    redrawRef.current = renderStatic;

    const frame = (time: number) => {
      if (!running) return;

      if (reducedMotion.matches || !visible || document.hidden) {
        running = false;
        return;
      }

      render(time, true);
      lastTime = time;
      rafId = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running || reducedMotion.matches || !visible || document.hidden) {
        return;
      }

      running = true;
      lastTime = 0;
      rafId = requestAnimationFrame(frame);
    };

    const stop = () => {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    };

    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(parent);

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;

      if (visible) start();
      else stop();
    });
    visibilityObserver.observe(parent);

    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else start();
    };

    const onMotionChange = () => {
      stop();
      lastTime = 0;

      if (reducedMotion.matches) {
        renderStatic();
      } else {
        start();
      }
    };

    // The canvas has pointer-events:none, so listen on the window.
    window.addEventListener("pointermove", updatePointer, { passive: true });
    window.addEventListener("blur", leavePointer);
    document.addEventListener("visibilitychange", onVisibilityChange);
    reducedMotion.addEventListener("change", onMotionChange);

    resize();

    if (reducedMotion.matches) {
      renderStatic();
    } else {
      start();
    }

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
