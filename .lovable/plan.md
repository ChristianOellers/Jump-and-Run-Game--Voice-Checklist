## Scope

All changes are presentation-only, contained to `src/features/game/GameCanvas.tsx` and `src/features/game/WorldPopover.tsx`. No business logic, stores, or services touched.

## Changes

### 1. Popover opacity
- In `WorldPopover.tsx`, add `opacity-75` on the outer container (alongside existing transition classes). Applies to the whole card including border/shadow so the world stays readable behind it.

### 2. Tree wiggle in the wind
- Extend the tree records generated in the world init with a `wigglePhase` (random 0..2π) and `wiggleAmp` (0.5–2px). ~60% of trees get non-zero amp; the rest stay static.
- In the tree render pass, offset the trunk/canopy top by `sin(now * 0.0015 + phase) * amp` on X. Base stays anchored so it looks like it sways from the root. Independent per tree via unique phase.

### 3. Mountain variant per world
- Where distant hills are generated, pick one style per world from the seeded RNG: `"soft"` (rounded sine ridges, current look) or `"spiky"` (jagged polyline with sharp triangular peaks, small random peak heights). Never mixed — one style for the whole run.
- Rocky variant uses the same palette but sharper vertices and slightly darker fill for depth.

### 4. Birds
- Add a `birds[]` array (3–6 per world) generated with: `x`, baseline `y` between the hill band and the platform band (behind trees, above mountains), `speed` (slow, direction ±), `sineAmp` 4–10px, `sinePhase`, `size` small.
- Render pass sits between the mid-hills layer and the platforms layer so birds appear behind gameplay elements.
- Each frame: advance `x` by `speed`, wrap around world bounds like clouds; draw as a tiny two-arc "M" silhouette (a couple of bezier/quadratic strokes) at `(x, y + sin(now*k + phase)*sineAmp)`.
- No collision, no interaction — pure decoration inheriting the fish-style independent drift.

### 5. Tilted + floating platforms
- Extend each platform record with `tiltDeg` (0 for most, ±1–3° for ~20%) and `bob` (`{ amp, phase }` for ~1–2 platforms per world; 0 otherwise).
- Collision stays axis-aligned against the original rect — tilt/bob are visual only, so physics remains predictable and levels stay solvable.
- Render: `ctx.save(); ctx.translate(cx, cy); ctx.rotate(tiltDeg*π/180); ctx.translate(0, sin(now*0.0008 + bob.phase)*bob.amp); draw platform; ctx.restore();` Trees/extras placed on the platform draw inside the same transform so they move with it.
- Shrine, voice, and checklist platforms are excluded from tilt/bob so their signposts and popover anchors stay stable.

### 6. Rain
- On world regen, 25% chance the level `hasRain = true`. If true, 50% chance `rainIntensity = "heavy"` else `"light"`.
- Pre-allocate a particle pool: light = ~120 drops, heavy = ~300. Each drop: `x` in camera-relative space, `y`, `vy` (heavy faster), `len` (heavy longer).
- Render pass: drawn as thin translucent lines above the foreground vignette but below HUD/popovers. Each frame advance `y += vy`; when `y > viewportH`, respawn at top with new random x. Slight wind slant (constant small `vx`).
- No gameplay effect — purely visual. Independent of daylight scheme.

## Technical notes

- All new per-entity randomness uses the existing seeded RNG so a given world seed keeps a stable look.
- Bird and rain rendering both use cheap 2D primitives (lines / small arcs) to keep the frame budget flat.
- Platform tilt/bob is applied only in the render transform; the `platforms[]` used by `physics.ts` collision stays untouched.

## Files

Edited:
- `src/features/game/WorldPopover.tsx` — add `opacity-75`.
- `src/features/game/GameCanvas.tsx` — tree wiggle, mountain variant, birds, platform tilt/bob, rain particles.

## Validation

- Typecheck.
- Playwright: regenerate world a few times, screenshot to confirm mountain variants alternate, birds visible behind trees, some platforms visibly tilted/bobbing, and rain appears on ~1 in 4 seeds.
- Walk the level end-to-end to confirm tilted/bobbing platforms are still landable (collision unchanged).
