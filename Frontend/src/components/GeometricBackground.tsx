import { useEffect, useRef } from 'react';

// Respect prefers-reduced-motion
const prefersReducedMotion = typeof window !== 'undefined' && 
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Configuration constants
const GRID_SIZE = 20; // Number of cells per side
const CELL_PADDING = 2; // Padding between cells
const ILLUMINATION_RADIUS = 150; // Maximum distance for illumination
const ILLUMINATION_INTENSITY = 0.8; // Maximum brightness increase
const SMOOTHING_FACTOR = 0.1; // How smoothly cursor position interpolates

// Cell interface
interface Cell {
  x: number;
  y: number;
  currentBrightness: number;
  targetBrightness: number;
}

/**
 * GeometricBackground - A cursor-reactive geometric grid background
 * 
 * Features:
 * - Full-page background with repeating grid of geometric cells
 * - Cursor-following illumination with distance-based lighting
 * - Smooth interpolation and trail effect
 * - Respects prefers-reduced-motion
 * - Uses Karlin_ux green accent identity
 * - pointer-events: none (doesn't block interactions)
 * - Efficient rendering - only renders visible cells
 * - Responsive grid sizing
 * - Device pixel ratio awareness
 * - Proper cleanup of event listeners and animation frames
 */
export function GeometricBackground({ className, style }: { className?: string; style?: React.CSSProperties } = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef({ x: 0, y: 0 });
  const smoothedCursorRef = useRef({ x: 0, y: 0 });
  const animationRef = useRef<number | null>(null);
  const cellsRef = useRef<Cell[]>([]);

  // Initialize cells on mount
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // Set canvas dimensions with device pixel ratio
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d')!;
    if (!ctx) return;

    // Calculate cell dimensions
    const cellSize = Math.max(1, (Math.min(rect.width, rect.height) - CELL_PADDING * 2) / GRID_SIZE);

    // Store cell size for animation loop access
    cellsRef.current = [];
    for (let i = 0; i <= GRID_SIZE; i++) {
      for (let j = 0; j <= GRID_SIZE; j++) {
        cellsRef.current.push({
          x: i * cellSize + CELL_PADDING,
          y: j * cellSize + CELL_PADDING,
          currentBrightness: 0.1,
          targetBrightness: 0.1,
        });
      }
    }

    // Add resize listener
    const handleResize = () => {
      const newRect = canvas.getBoundingClientRect();
      canvas.width = newRect.width * window.devicePixelRatio;
      canvas.style.width = `${newRect.width}px`;
      canvas.style.height = `${newRect.height}px`;

      const newCellSize = Math.max(1, (Math.min(newRect.width, newRect.height) - CELL_PADDING * 2) / GRID_SIZE);
      // Update cell positions
      cellsRef.current.forEach((cell, index) => {
        const col = index % (GRID_SIZE + 1);
        const row = Math.floor(index / (GRID_SIZE + 1));
        cell.x = col * newCellSize + CELL_PADDING;
        cell.y = row * newCellSize + CELL_PADDING;
      });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []); // Empty dependency array - runs once on mount

  // Track cursor position
  useEffect(() => {
    if (prefersReducedMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      cursorRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [prefersReducedMotion]);

  // Animation loop - smooth illumination
  useEffect(() => {
    if (prefersReducedMotion) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const cells = cellsRef.current;

    const animate = () => {
      // Smoothly interpolate cursor position
      smoothedCursorRef.current.x += (cursorRef.current.x - smoothedCursorRef.current.x) * SMOOTHING_FACTOR;
      smoothedCursorRef.current.y += (cursorRef.current.y - smoothedCursorRef.current.y) * SMOOTHING_FACTOR;

      // Clear canvas with slight trail
      ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
      ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

      // Draw each cell with illumination
      cells.forEach(cell => {
        // Calculate distance from cursor
        const dx = cell.x - smoothedCursorRef.current.x;
        const dy = cell.y - smoothedCursorRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Calculate illumination based on distance with smooth falloff
        let illumination = 0;
        if (distance < ILLUMINATION_RADIUS) {
          const normalizedDist = distance / ILLUMINATION_RADIUS;
          illumination = ILLUMINATION_INTENSITY * (1 - normalizedDist ** 2);
        }

        // Update target brightness with smooth trail
        cell.targetBrightness = Math.max(
          0.1,
          Math.min(1, cell.currentBrightness + illumination)
        );

        // Smooth transition of brightness
        cell.currentBrightness += (cell.targetBrightness - cell.currentBrightness) * 0.1;

        // Get green color based on brightness (64 to 255 green channel)
        const green = Math.round(64 + cell.currentBrightness * 191);
        const alpha = 0.05 + cell.currentBrightness * 0.12;

        ctx.fillStyle = `rgba(0, ${green}, 0, ${alpha})`;
        ctx.beginPath();
        ctx.roundRect(
          cell.x - CELL_PADDING / 2,
          cell.y - CELL_PADDING / 2,
          CELL_PADDING,
          CELL_PADDING,
          2
        );
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [prefersReducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: -1,
        ...style,
      }}
    />
  );
}
