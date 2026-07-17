## Scope

Frontend-only tweaks in `src/features/game/GameCanvas.tsx` and `src/features/game/HUD.tsx`. No business logic touched.

## Changes

### 1. Sun placement (never over shrine)
In the sun init (~L536): compute `sunHomeX` as either left band (`WORLD_W * 0.15..0.32`) or right band (`WORLD_W * 0.68..0.85`), 50/50. Guarantees clear sky above `WORLD_W/2` shrine so seeds can be deposited without sun-ray drain.

### 2. Birds exempt from parallax
Birds currently drift in world coords behind gameplay. Move their draw pass to use screen-space X (no `cam.x` subtraction, wrap on viewport width instead of `WORLD_W`), keeping their Y band above mountains. They become a pure sky layer like clouds-in-sky, not tied to camera.

### 3. Stronger platform bob
In `generateLevel` bob assignment (~L184): raise amplitude to `5..10px` (from 2..5). Keep sine easing (already smooth ease in/out via `Math.sin`), slow the phase slightly by using `now / 1800` in the render (~L1030).

### 4. Floating platforms touch water visually
After generating platforms, add a decorative "stilt" or extend the platform's `shade` face down to `WATER_Y`. Simplest: in the platform render (~L1043) draw a narrower tapered shade column from platform bottom down to `WATER_Y` (semi-transparent same shade color). Collision unchanged; visual only, so every island appears rooted in water.

### 5. Varied earth color
In `makePlatform`, add `soilTint` = one of 3 brown variants (default, warmer, darker) chosen with 25% chance for a non-default. In render, lerp `platFront`/`platShade`/`platTop` toward this tint before the greenness lerp.

### 6. Tree stage in HUD + grass growth on platforms
- `HUD.tsx`: add a "STAGE x/5" badge next to TREE counter, derived from same `shrineStage` thresholds (duplicate the small helper in HUD or export from GameCanvas — export is cleaner).
- Grass spread from stage ≥ 3: introduce a per-platform `grassLevel` (0..1) computed each frame. Seed the shrine platform first at stage 3, then propagate to neighbors over time (increment based on elapsed frames, e.g. one platform every ~4s). Store spread state in a ref (`grassSpread: number[]` indexed by platform). This is decoupled from the existing 5-stage `greenness` system (which activates only after stage 5) — grass here is a preview that starts at stage 3.

### 7. Grass tuft design
Add `drawGrassTuft(ctx, x, y, level)` — 3–5 short curved blades, ~6–10px tall, muted olive/sage. Drawn on platform top in the render loop when `grassSpread[i] > 0`, density scaled by grassSpread value.

### 8. Foreground mist/foam layer
After water render, before HUD, draw a thin transparent mist band from `WATER_Y - 20` to `WATER_Y + 30`: 6–10 soft blurred white ellipses drifting slowly in screen space (independent of parallax, wrap horizontally). Very low alpha (0.06–0.12), `filter: blur(8px)`. Adds depth over water + platform bases.

## Files touched

- `src/features/game/GameCanvas.tsx` — items 1–5, 6 (grass logic), 7, 8
- `src/features/game/HUD.tsx` — item 6 (stage badge)

## Risks

- Grass spread state must reset on level regen — tie to the same seed regen effect.
- Sun-band randomization: verify SUN_LEASH still keeps sun from crossing shrine when player stands there (leash is 260px, safe with bands starting at 32%/68% of a ~4000px world).
- Stilts below platforms must not visually clash with existing shade — keep alpha low.
