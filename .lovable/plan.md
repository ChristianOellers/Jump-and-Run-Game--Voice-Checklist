
## Concept

The app becomes a tiny side-scrolling platformer world. A circle-player runs and jumps across procedurally placed platforms over water. Two floating white popovers live in the world — Voice on the far left, Checklist on the far right — and open only when the player stands nearby. A central shrine converts earned tokens into a slowly growing tree. Every action (steps, spoken words, ticked items) spawns floating `+N` numbers near the player. No death, no fail state — falling off just respawns at center.

All existing logic (stores, speech, LLM service, suggestion engine, activity, settings) stays intact. Only the presentation layer is rebuilt.

## Visual direction

- **Palette:** muted pastel-natural — soft sky, sand, sage, warm brown, off-white. One warm accent (kept terracotta) for player + score pops. Sun tints the whole scene via a single CSS variable that shifts over time.
- **Typography:** one bold neo-brutalist sans display (Archivo Black or Bricolage Grotesque) for HUD/score pops + numbers, humanist sans (Inter) for popover body copy. No serif this time.
- **UI chrome:** near-zero. Only a small HUD in the top-left (steps · words · ticks · seeds) and a hint chip near interactable zones ("press ↑ or tap to open").

## World & rendering

Single full-viewport `<canvas>` renders the game. Three parallax SVG-in-canvas (or plain canvas draw) layers:

```text
[ sky + sun shader ]           ← layer 0, slowest (0.1x)
[ distant hills + clouds ]     ← layer 1 (0.3x)
[ mid trees + far platforms ]  ← layer 2 (0.6x)
[ PLAYABLE platforms + water ] ← layer 3, camera speed (1x)
[ foreground water ripple ]    ← layer 4 (1.2x)
```

- **Sun:** animated radial gradient painted to an offscreen canvas each frame (cheap "shader" — sin-wave pulse + slow color drift). Position lerps toward player x with a heavy delay coefficient. Its current warmth drives a global `sceneTint` (0..1) that biases all layer fills toward warm/cool via `globalCompositeOperation = "multiply"` on a translucent overlay. Simple, no WebGL required.
- **Water:** two stacked sine-wave polylines filled with pastel blue, phase-offset per frame. On top, 6–10 "fish" = small ovals with a triangle tail, each with independent x/y sin drift and occasional direction flip. Foreground water strip has higher amplitude + opacity.
- **Platforms:** flat-topped rounded rectangles in sand/brown. Trees are decorative sprites drawn on platforms — pure visual, no hitbox.
- **Level generation:** on mount, seed a RNG; generate ~18–24 platforms across a fixed world width (e.g. 6000px). Guarantee solvability: each next platform is placed within max-jump distance (horizontal ≤ `vX*airTime`, vertical ≤ jump apex) of the previous. Voice zone anchored near x=200, Checklist zone near x=world-200, Shrine at world/2. Verified reachable by construction.

## Physics & controls

Minimal platformer step in a `requestAnimationFrame` loop (fixed timestep accumulator):

- Gravity, horizontal accel/friction, single jump when grounded, coyote time ~80ms.
- AABB vs platform top-surface collision only (walk-off sides, no wall collide — keeps it forgiving).
- Camera follows player x with lerp; clamps to world bounds.
- **Input:** Arrow keys / A-D + Space/↑ for jump on desktop. On touch: two thumb zones (left = move, tap right = jump). Also an on-screen minimal control strip on mobile.
- **Fall reset:** if `player.y > waterLine + 200`, teleport player to shrine platform, zero velocity, no penalty, brief fade.

## Popovers (Voice + Checklist)

Rendered as real DOM (`fixed` positioned white cards with a subtle shadow + 2px black border for neo-brutalist edge), NOT inside canvas. This keeps all existing React components fully functional — inputs, textareas, drag-and-drop, focus, a11y all work natively.

Behavior:
- Each zone has a world x-range. When `|player.x - zone.x| < 220px`, popover opens (scale/fade in from the zone anchor projected to screen space).
- When the player leaves the range, popover auto-closes. State is preserved in the existing Zustand stores, so reopening is seamless. Voice recording auto-stops on close.
- Popover position tracks the zone's screen coordinate (updates each frame) so it visually hangs above its location. Clamped to viewport edges.
- While a popover is open and focused, keyboard input routes to the form (game input is paused). Clicking outside or moving away returns control.
- Inside the popovers we reuse existing components almost as-is: `VoiceCapture` (mic button + textarea + Analyze) and `ChecklistPanel` (list, add, DnD, progress). Just re-skinned to the muted palette; `SuggestionsPanel` slides in below Voice when suggestions exist.

Activity + Settings become a small "menu" popover triggered by a HUD cog button (kept discoverable but out of the world).

## Rewards & tokens

A single `useGameStore` (Zustand) tracks: `steps`, `words`, `ticks`, `seeds`, `treeGrowth`, and a queue of floating pops.

- Every ~40px traveled → +1 step, spawn `+1` pop.
- Voice: on successful analyze, `+N words` where N = transcript word count.
- Checklist: each item marked done → `+5 ticks` pop.
- All events also add to `seeds` (steps ×1, words ×1, ticks ×5).
- Floating pops: bold display font, terracotta, rise 60px over 900ms with ease-out + fade, drawn on a HUD overlay canvas above the game canvas.

## The Shrine (center)

A small stone-slab platform at world center with a young tree sprite. Standing on it for >400ms opens a tiny in-world panel (canvas-drawn card, no DOM):

- Shows `seeds` count + a "Plant" chip.
- Auto-converts seeds to `treeGrowth` at a slow rate (e.g. 10 seeds → +1 growth unit, capped per second so it feels earned).
- Tree sprite scales/adds a ring for every 20 growth units, up to a mature form. Persisted in localStorage.

## State, persistence, isolation

- New store: `src/features/game/useGameStore.ts` — counters, tree growth, seeded level, floating pops. Persisted (except pops).
- Bridge hooks: subscribe to `useChecklistStore` and `useSuggestionsStore` to emit reward events (item done → tick pop; batch applied → words pop).
- No changes to `ai.functions.ts`, `services/llm.ts`, `services/speech.ts`, `services/suggestionEngine.ts`, or any existing store's business logic.

## Files

New:
- `src/features/game/GameCanvas.tsx` — canvas host, rAF loop, input handlers, camera, popover position broadcaster (via context).
- `src/features/game/engine/world.ts` — seeded level gen with solvability guarantee.
- `src/features/game/engine/physics.ts` — step function.
- `src/features/game/engine/render.ts` — layer draws (sky, sun, hills, water, fish, platforms, trees, player, shrine, tree-of-progress).
- `src/features/game/engine/rng.ts` — mulberry32.
- `src/features/game/HUD.tsx` — counters + settings cog + mobile controls.
- `src/features/game/FloatingPops.tsx` — overlay canvas for `+N` numbers.
- `src/features/game/WorldPopover.tsx` — generic anchored popover component.
- `src/features/game/useGameStore.ts` — counters, tree, pops, level seed.
- `src/features/game/useZoneProximity.ts` — hook exposing which zone (voice/checklist/shrine/none) is currently active.

Edited:
- `src/routes/index.tsx` — replace the whole hero + workspace layout with `<GameCanvas />` + `<HUD />` + `<WorldPopover>` slots hosting the existing `VoiceCapture`, `SuggestionsPanel`, `ChecklistPanel`, and an `ActivityPanel`+`SettingsPanel` menu popover.
- `src/styles.css` — swap tokens to muted pastel-natural (sky, sand, sage, warm brown, off-white) + terracotta accent; add a `--scene-tint` CSS var updated per frame; add display font. Remove serif tokens.
- `src/routes/__root.tsx` — swap Google Font link to the chosen display sans (keep Inter for body).
- Light re-skin passes on `VoiceCapture.tsx`, `SuggestionsPanel.tsx`, `ChecklistPanel.tsx`, `ActivityPanel.tsx`, `SettingsPanel.tsx` — swap serif classes for the new display sans on headings, tighten padding for popover context. No logic changes.

Deleted: none.

## Out of scope

- Real WebGL/shaders — the "sun shader" is a canvas 2D radial-gradient effect. Keeps bundle small and works everywhere.
- Sprite art / external graphics — everything is drawn from primitives.
- Sound effects.
- Multiplayer / persistence beyond localStorage.

## Validation

- Typecheck clean.
- Playwright: load page, capture desktop + mobile screenshots, walk player right past shrine to checklist zone and confirm popover opens with a working list; walk left to voice zone and confirm the mic UI mounts with focus routing.
- Verify falling off respawns at shrine with no state loss.
- Verify level solvability by walking end-to-end via a scripted input sequence.
