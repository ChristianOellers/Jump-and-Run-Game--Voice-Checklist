# Voice Checklist App — Build Plan

A single-page checklist app where users speak progress updates. Speech is transcribed (Web Speech API), sent to an LLM (via a server function using Lovable AI), and returns suggested checklist state changes for user review.

## Stack

- TanStack Start (existing template) + React 19 + TypeScript + Tailwind v4
- shadcn/ui components (already available)
- `@dnd-kit/core` + `@dnd-kit/sortable` for drag & drop
- Web Speech API (browser) for STT with manual text fallback
- Lovable AI Gateway (`openai/gpt-5.5`) via `createServerFn` for LLM
- `localStorage` for persistence (behind a storage abstraction)
- Zustand for lightweight state (checklist, suggestions, activity, settings)

## Architecture

```text
src/
  routes/
    index.tsx                  // main app shell (replaces placeholder)
  features/
    checklist/
      ChecklistPanel.tsx
      ChecklistItem.tsx
      SortableList.tsx
      useChecklistStore.ts
    voice/
      VoiceCapture.tsx
      useSpeechRecognition.ts  // Web Speech API + fallback state
    suggestions/
      SuggestionsPanel.tsx
      useSuggestionsStore.ts
    activity/
      ActivityPanel.tsx
      useActivityStore.ts
    settings/
      SettingsPanel.tsx
      useSettingsStore.ts
  services/
    speech.ts                  // SpeechService interface + Web Speech impl
    llm.ts                     // LLMService: mock | server (calls server fn)
    suggestionEngine.ts        // transcript + items -> Suggestion[]
  lib/
    ai.functions.ts            // createServerFn: analyzeTranscript
    storage.ts                 // typed localStorage adapter (swap-ready)
  types/
    checklist.ts, suggestion.ts, activity.ts, settings.ts
```

Data flow: `VoiceCapture` -> `speech.ts` -> transcript -> `suggestionEngine` -> `llm.ts` -> server fn (real) or local mock -> normalized `Suggestion[]` -> `SuggestionsPanel` -> user confirms -> mutations on checklist store + activity log entry (with undo snapshot).

## Data Model

```ts
ChecklistItem { id, title, description, done, doneAt?, confidence?, source: 'user'|'llm', order }
Suggestion   { itemId, status: 'completed'|'partial'|'not_mentioned', confidence, reasoning }
ActivityEntry{ id, timestamp, transcript, suggestions, appliedActions, snapshotBefore }
Settings     { language, theme, autoApply, apiMode: 'mock'|'real', voiceEnabled }
```

## LLM Layer

- Server function `analyzeTranscript({ transcript, items })` calls Lovable AI Gateway with a strict JSON schema (via `Output.object`) returning `{ suggestions: [{ itemId, status, confidence, reasoning }] }`.
- Mock mode: keyword + fuzzy match locally, returns same shape.
- `apiMode` in Settings toggles between them. Secrets never leave the server function.

## Suggestion Review Rules

- Show transcript + per-item reasoning and confidence.
- Confirmation required unless `autoApply` is on AND confidence ≥ 0.8.
- Never delete items. Every apply saves a `snapshotBefore` for one-step Undo.
- "Undo last auto-apply" button restores snapshot and logs the reversal.

## UI Layout (mobile-first)

Single page, responsive grid: Checklist (primary) | right column stacks Voice Capture, Suggestions, Activity, Settings (tabs on mobile). Progress bar with % complete + counts. Loading/empty/error states for each panel. Keyboard accessible, semantic landmarks, focus rings, `aria-live` for transcript and suggestions.

## Error Handling

- Mic denied / unsupported → fallback textarea + clear message.
- Empty transcript → inline warning, no LLM call.
- LLM failure / malformed JSON → toast + keep transcript editable + retry button.
- Storage failure → in-memory fallback + toast.

## Implementation Steps

1. Add deps: `@dnd-kit/core`, `@dnd-kit/sortable`, `zustand`.
2. Create `types/`, `lib/storage.ts`, stores (checklist, suggestions, activity, settings) with localStorage hydration.
3. Build `services/speech.ts` + `useSpeechRecognition` hook (Web Speech + fallback).
4. Build mock suggestion engine in `services/suggestionEngine.ts` + `services/llm.ts`.
5. Add `src/lib/ai.functions.ts` server function using Lovable AI Gateway with strict JSON output.
6. Build UI: `ChecklistPanel` (CRUD + dnd-kit reorder + manual toggle), `VoiceCapture`, `SuggestionsPanel` (review/apply/reject + auto-apply rule), `ActivityPanel` (with Undo), `SettingsPanel`.
7. Replace `src/routes/index.tsx` placeholder with app shell + real head metadata (title/description/og/twitter).
8. Verify: typecheck passes, manual smoke via preview (mock mode default so it works with no key), toggle real mode to hit server fn.

## Out of Scope

- Auth / multi-user / backend DB (storage layer is swap-ready).
- Real-time collaboration.
- i18n beyond passing `language` to STT + LLM prompt.
