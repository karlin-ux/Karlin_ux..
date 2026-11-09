# PHASE 5.11 — INTERACTIVE GEOMETRIC NETWORK REPORT

## Objective

Replace the existing geometric particle-network background with one that is
actually visible on the dark page, reads as a living interconnected geometric
network, reacts clearly to the cursor, and stays cheap enough to run on every
page without adding a second animation.

## What was wrong before

The first implementation was technically mounted but effectively invisible:

- The canvas was sized to the **full document height** (~4,225 px on Home), so
  the particles were spread over one enormous surface and only a thin slice
  was ever on screen.
- Every page section painted an **opaque** `bg-[var(--bg)]` /
  `bg-[var(--bg-secondary)]` fill over the canvas, so any particles behind them
  were completely covered.
- Neighbour and triangle generation ran without a spatial index, which made a
  denser network expensive.
- The cursor listener was attached to the canvas, but the canvas sat behind
  page content, so pointer events rarely reached it.

## Final implementation

### Files

| File | Change |
|------|--------|
| `Frontend/src/components/effects/GeometricParticleNetwork.tsx` | Rewritten component (single effect, refs, spatial grid, batched rendering) |
| `Frontend/src/layout/Layout.tsx` | Mounts one viewport-sized fixed backdrop and passes the project palette |
| `Frontend/src/index.css` | Scoped translucent page-section fills so the backdrop shows through |
| `PHASE_5.11_INTERACTIVE_GEOMETRIC_NETWORK_REPORT.md` | This report |

### Single shared backdrop

`Layout.tsx` mounts the network once, as a viewport-sized fixed layer behind
all routed content:

```tsx
<div className="karlin-particle-backdrop relative isolate min-h-screen flex flex-col">
  <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
    <div className="relative h-full w-full">
      <GeometricParticleNetwork
        colors={NETWORK_COLORS}
        className="absolute inset-0 h-full w-full"
        density={1}
        opacity={0.9}
        interactive
      />
    </div>
  </div>
  ...
```

- One canvas for the whole app — no duplicate/second animation.
- `position: fixed` + viewport size means particle density is consistently
  visible instead of being spread over the full document height.
- `pointer-events-none` and `-z-10` keep it behind content and stop it
  intercepting any site interaction; the `elementFromPoint` check returns page
  content at every sampled point.
- The inner `relative` wrapper gives the canvas the parent it needs to fill.

### Living geometric network

- **Particles:** 105–300 on desktop, 44–95 on mobile, scaled by viewport area
  and the `density` prop. Each has depth (`z`), radius, velocity and phase.
- **Connections:** uniform spatial grid (cell size = connection distance) finds
  neighbours in constant-ish time; line distance is
  `spacing * 2.05`, clamped to 120–200 px desktop / 92–140 px mobile.
- **Triangles:** generated every third node with up to four forward neighbours,
  constrained by area, so faces appear as irregular accents rather than a
  uniform mesh. This bound was chosen after profiling (see below).
- **Depth:** alpha and radius follow `z`, giving layered line brightness and
  varied particle sizes instead of a flat field.
- **Motion:** continuous drift plus a small sinusoidal wander, updated in the
  animation loop (never in React state).

### Cursor interaction

- Window-level `pointermove` (the canvas is `pointer-events: none`) maps the
  pointer into canvas space.
- Particles inside the interaction radius are pushed outward with a squared
  falloff; the offset is recomputed each frame so the structure bends, reforms
  and returns smoothly when the pointer moves away.
- A compact radial gradient (max ~170 px, two-stop palette blend) follows the
  pointer. It is deliberately small and soft — there is no large circular
  cursor halo.
- The first pointer entry **snaps** to the cursor instead of interpolating from
  the parked position, so the spotlight is responsive on first hover.
- Touch and coarse pointers skip interaction (mobile has no hover target).

### Colour and theme

- `NETWORK_COLORS = ['#53F5B0', '#5C9DFF', '#9B85FF']` matches the actual
  tokens `--accent`, `--accent-2`, `--accent-3`.
- The `colors` prop is parsed into RGB refs and each frame blends the current
  palette toward the target, entirely outside React state. Changing the prop
  recolours the running network smoothly; a reduced-motion frame is repainted
  immediately.
- Works on both dark and light themes; the canvas itself is transparent.

### Performance and accessibility

- Batched `Path2D` rendering: lines, triangles, particle cores and glows are
  accumulated into per-colour/alpha buckets and flushed with a handful of
  canvas calls per frame.
- No per-frame allocation for the spatial grid (`cellBuckets` and
  `neighbourLists` are reused and cleared in place).
- Device pixel ratio capped at 1.5; the animation pauses when the document is
  hidden or the backdrop is outside the viewport (`IntersectionObserver`).
- `prefers-reduced-motion`: one static frame is rendered, the rAF loop never
  starts, and pointer input is ignored. A media-query change re-renders/blends
  correctly at runtime.

### Making the backdrop visible

Cards and surfaces stay fully opaque, so text contrast is unchanged. Only
page-level section fills are softened, scoped under the layout root:

```css
.karlin-particle-backdrop main section[class*="bg-[var(--bg)]"] {
  background-color: color-mix(in srgb, var(--bg) 35%, transparent);
}
.karlin-particle-backdrop main section[class*="bg-[var(--bg-secondary)]"] {
  background-color: color-mix(in srgb, var(--bg-secondary) 35%, transparent);
}
```

Without this the fixed canvas is painted correctly but covered by opaque
sections; it is the required companion change for visibility.

## Validation (real browser)

Chromium was driven with Playwright against the running Vite dev server at
`http://localhost:5173`. Screenshots were decoded and compared at the pixel
level, and canvas pixels were sampled directly.

### Integration / DOM

| Check | Result |
|-------|--------|
| Canvas instances | **1** |
| Canvas CSS size | **1440 × 900** (viewport) |
| Parent position | `relative` |
| Backdrop position / z-index | `fixed` / `-10` |
| Horizontal page overflow | **0 px** |
| `elementFromPoint` at four viewport points | page content, never the canvas |
| Canvas blocks site interaction | No (`pointer-events: none`) |

### Visual density and movement

| Measurement | Result |
|-------------|--------|
| Frame-to-frame change | animating (stats change every sample) |
| Non-zero canvas pixels | ~25.7 % |
| Strong (>40 alpha) pixels | ~1.5 % |
| Mean canvas alpha | ~4.65 |
| Average lit RGB | ~`[106, 177, 228]` (mint→blue→violet blend) |
| Composited visibility (whole viewport, canvas shown vs hidden) | meanAbs **2.94**, changedPct **20.2 %** |
| Composited visibility (400 × 400 background band) | meanAbs **1.19**, changedPct **13.8 %** |

The composited numbers are the important ones: they show the network is
actually visible through the page, not merely present in the canvas bitmap.

### Cursor

| Check | Result |
|-------|--------|
| Local alpha at pointer, before → after move | **5.84 → 17.18** (+11.34) |
| Spotlight follows to a second position | Yes (second region bright, first region back to baseline) |
| Focused sample at pointer centre | alpha **0 → 18–19** |
| Particles pushed aside and reform | Yes (local structure moves outward and settles when pointer leaves) |

### Palette

A temporary hot-swap of `NETWORK_COLORS` to red/orange/pink changed the
canvas average from `[107, 180, 226]` to `[255, 100, 81]`, then restored to
`[107, 180, 226]`. The prop genuinely drives the rendered colours.

### Responsive / reduced motion / themes

| Check | Result |
|-------|--------|
| Mobile 390 × 844 (DPR 2) | canvas 390 × 844 CSS, 585 × 1266 backing; nonZero ~12–15 %, meanAlpha ~2.3–2.9; **no overflow** |
| Mobile animation | running; ~23 fps in headless software rendering |
| `prefers-reduced-motion` | static frame, no change on pointer move, marquee animation `none` |
| Light theme | canvas present, no crash, correct light body background |
| Page/JS runtime errors | **none** |

### Console note

The only console errors are two pre-existing `403` responses for
`/api/auth/me/` when a visitor is signed out. They come from the auth bootstrap
request, occur with or without the particle network, and are unrelated to this
component. There are no errors from `GeometricParticleNetwork`.

### Build / static checks

| Check | Result |
|-------|--------|
| `npx tsc -b` | Pass |
| `npm run build` (`tsc -b && vite build`) | Pass |
| `npm run lint` (oxlint) | No issues in the new component; only pre-existing warnings elsewhere |

## Performance notes

The headless Chromium used for validation is **software-rasterised**, so its
frame-rate and CPU figures are pessimistic and do not represent a normal
GPU-composited browser. Profiling showed native canvas rasterisation (large
translucent triangles and lines), not JavaScript math, was the dominant cost.
The following bounds were applied as a result:

- triangles built every third node, maximum four forward neighbours,
  area-constrained;
- particle cap 300 desktop / 95 mobile;
- particle glow only for nearer (`z > 0.55`) particles;
- coarser alpha buckets and a compact connection radius;
- DPR capped at 1.5.

With header blur and the marquee neutralised, the layer test reached
33–45 fps in software; the real composited Chromium renderer was observed at
~15 % CPU for the running site. A GPU browser should be comfortably smooth.

## Acceptance criteria

| # | Requirement | Status |
|---|-------------|--------|
| 1 | Particles move continuously and smoothly | Pass |
| 2 | Connections form a changing geometric network | Pass |
| 3 | Dense but not cluttered; visible on dark background | Pass |
| 4 | Cursor visibly pushes nearby particles | Pass |
| 5 | Lines/faces bend and reform around the cursor | Pass |
| 6 | Soft spotlight follows the cursor (no large halo) | Pass |
| 7 | Stationary appearance is composed and varied | Pass |
| 8 | Project colour changes pass through and blend | Pass |
| 9 | Mobile layout/performance acceptable, no overflow | Pass |
| 10 | `prefers-reduced-motion` respected | Pass |
| 11 | No JS/page console errors introduced | Pass (only pre-existing auth 403s) |
| 12 | TypeScript, lint and production build | Pass |

## Limitations

- Palette is driven by the `colors` prop, not by live CSS custom-property
  changes; a theme/palette change must pass new colours (or use the defaults).
- Triangles are intentionally sampled rather than exhaustive to keep overdraw
  bounded; this is a visual choice as much as a performance one.
- Cursor interaction is disabled on touch/coarse pointers, where there is no
  hover target.

**Phase 5.11 status:** complete. Changes are committed locally; nothing has
been pushed or deployed.
