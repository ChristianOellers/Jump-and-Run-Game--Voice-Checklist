# AI Workspace Knowledge — Codeconut

## What this project is
A gamified, voice-driven checklist web app. Users speak a progress update; the app transcribes it, analyzes it with an LLM, suggests checklist updates, and turns real-world productivity into an in-game reward loop.

## Stack & constraints
- TanStack Start v1, React 19, TypeScript, Vite 7, Tailwind CSS v4.
- shadcn/ui pattern: no `shadcn-ui` package; uses Radix primitives, `cn()`, `class-variance-authority`, `tailwind-merge`.
- State: Zustand. Persistence: `localStorage` via `src/lib/storage.ts`.
- Game engine: custom Canvas 2D loop in `src/features/game/GameCanvas.tsx`; no external game/physics libraries.
- Server: `createServerFn` from `@tanstack/react-start` for LLM calls only; LLM route is Lovable AI Gateway.

## Architecture rules
- Feature-based folders under `src/features/`: `checklist/`, `voice/`, `suggestions/`, `activity/`, `settings/`, `game/`.
- Business logic lives in `src/services/` and stores; UI components are thin.
- `src/features/types.ts` is the source of truth for shared domain types.
- Never duplicate truth in client state; stores sync to `localStorage`, but logic is data-driven.

## Core user loop (must always work)
1. User speaks → `useSpeechRecognition` (Web Speech API, fallback to typed input).
2. Transcript analyzed → `analyze()` in `src/services/llm.ts` (mock or real via `analyzeTranscript`).
3. Suggestions shown in `SuggestionsPanel` for review; user confirms before apply.
4. Checklist CRUD + DND reorder in `ChecklistPanel`.
5. Every productive action (words spoken, items ticked, movement) rewards seeds/points.
6. Seeds are fed to the shrine tree at the center of the level; tree evolves and gradually greens the world.

## Game rules that must not break
- Player is a circle. No death. Falling in water respawns at neutral middle and costs up to 10 seeds.
- Double jump (2× height) and dash every 5 seconds. Variable jump height on key release.
- Sun follows player on a short leash, emits rays, and drains 3 seeds/sec while player is in the light.
- Sun is never above the shrine; initialized in left or right sky band.
- Platforms are always reachable (max gap 130 px, max rise 75 px).
- 10–20% of platforms bob 10–20 px on a ~2 s sine cycle.
- Voice popover is on the left island; checklist popover is on the right island; shrine is center.
- Player starts on a random non-feature island.
- Popovers are 70% transparent, can be closed with X, and reopen by touching their signpost.

## Visual identity
- Neo-brutalist gamified + natural theme.
- Muted pastel palette; soil/earth tones; world greens as tree evolves.
- Display type: Archivo Black. UI type: sans-serif, clean.
- 3 daylight schemes (morning / day / sunset) cycle with world generation and sync UI theme.
- Parallax layers: sky, sun, clouds, hills, water, platforms, foreground mist/particles. Birds are screen-space, not parallax.

## What to preserve when editing
- All existing functionality: CRUD, DND, voice capture, suggestions review, undo, settings, activity log.
- Game state (seeds, tree stage, greenness, stats) persists across reloads.
- Performance target: 60 FPS on canvas; never drive the game loop through React state.
- Responsive UI + touch controls for mobile.

## Red flags
- Do not add heavy game engines, physics libs, or UI kits without explicit need.
- Do not move protected server functions into public route loaders.
- Do not hardcode colors in components; use CSS theme variables.
- Do not break the review-before-apply flow; suggestions are never auto-applied silently.
