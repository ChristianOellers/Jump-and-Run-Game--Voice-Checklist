
## Context

Impeccable (impeccable.style) is a set of design commands for coding agents (`init`, `shape`, `craft`, `adapt`, `audit`) — not an npm package. It has no runtime to install. What we can do is run its **loop** manually against this repo: write a short brief, scan the current UI, then apply one focused redesign pass with its principles (clear hierarchy, honest contrast, restraint, no hype, no purple-gradient/glassmorphism defaults).

Locked from your answers:
- **Voice:** warm, human, everyday
- **Scope:** full visual pass + hero/landing framing

## PRODUCT.md (brief we'll design against)

- **Product:** Voice Checklist — speak progress, review AI suggestions, apply with confirmation.
- **Users:** Individuals tracking personal/work progress hands-free. Not a dashboard, not a marketing site.
- **Voice:** Warm, human, everyday. Plain language, no jargon, no hype.
- **Anti-references:** Purple/indigo gradients on white, generic SaaS hero, glassmorphism, neon accents, Inter-on-everything.

## DESIGN.md (what today's UI does)

- Slate shadcn defaults (cool grays, near-black primary), Inter-ish system stack.
- Thin header + immediate 2-column workspace on desktop, 4-tab layout on mobile.
- Panels are uniform shadcn Cards; no hierarchy between the primary action (Voice) and secondary panels.
- No landing framing — user lands directly in the tool with no orientation.

## Redesign direction

Warm editorial-utility: cream paper background, ink foreground, one warm terracotta accent, a serif display for headings paired with a humanist sans for UI. Generous spacing rhythm, quiet borders, no shadows-as-decoration.

### 1. Design tokens (src/styles.css)

Replace the slate palette with warm neutrals + a single accent. All values in `oklch`, both `:root` and `.dark`.

- `--background`: warm cream (light) / deep ink (dark)
- `--foreground`: near-black ink / warm off-white
- `--card`: paper white / raised ink
- `--muted` / `--muted-foreground`: warm sand tones
- `--primary`: terracotta (single accent, used sparingly for CTAs + recording state)
- `--border`: hairline warm gray
- Add `--font-serif` (display) and `--font-sans` (body) tokens; load via `<link>` in `src/routes/__root.tsx` (Fraunces + Inter, or Instrument Serif + Work Sans — pick one pairing in build).
- Radius drops to `0.5rem` for a calmer feel.

### 2. Hero / landing framing (src/routes/index.tsx)

Add a hero band above the workspace:

```text
┌────────────────────────────────────────────────────┐
│  small eyebrow: "voice checklist"                  │
│  H1 (serif, large): "Talk it through. Tick it off."│
│  Lede (sans, muted): one-sentence value prop       │
│  Row: [Start speaking] primary  ·  How it works    │
└────────────────────────────────────────────────────┘
        ↓ workspace begins here
```

- H1 uses the serif token; body copy uses sans.
- "Start speaking" scrolls to / focuses the Voice panel.
- Hero collapses to a compact single-line header on scroll (CSS only, no JS lib).

### 3. Workspace layout

- Desktop grid rebalanced: left column = **Voice + Suggestions** (the active loop), right column = **Checklist** (the artifact). Activity + Settings move into a subtle bottom strip / disclosure — they're reference, not primary.
- Mobile tabs relabeled with warmer copy: "Speak / List / History / Setup".
- Section headings use serif; panel chrome loses redundant CardTitle repetition where the section heading already labels it.

### 4. Component polish (visual only, no logic changes)

- **ChecklistPanel:** progress bar becomes a slim inline meter next to the count; row hover raises contrast instead of adding a shadow; drag handle only appears on hover/focus; done items get warm strike-through + reduced opacity.
- **VoiceCapture:** big round mic button as the anchor, terracotta when recording with a gentle pulse (CSS `@keyframes`), transcript in serif italic for a "spoken" feel.
- **SuggestionsPanel:** each suggestion becomes a card with status chip (Done / Partial / Not mentioned) in restrained color, confidence as a short bar not a percentage.
- **ActivityPanel:** timeline-style list with hairline rule + timestamp in mono-ish sans.
- **SettingsPanel:** grouped rows with labels-left / control-right, no card-in-card.

### 5. Typography & rhythm

- Type scale: 12 / 14 / 16 / 20 / 28 / 40 (hero only).
- Line-height: 1.5 body, 1.15 display.
- 4pt spacing base; sections use 48–64px vertical rhythm; panels use 24px internal padding.
- One accent color only. No gradients. No decorative icons in headings.

## Files touched

- `src/styles.css` — token overhaul, font family tokens, radius.
- `src/routes/__root.tsx` — `<link>` tags for the chosen font pair.
- `src/routes/index.tsx` — hero band, layout rebalance, tab copy.
- `src/features/checklist/ChecklistPanel.tsx` — progress + row visual pass.
- `src/features/voice/VoiceCapture.tsx` — mic-first layout, recording pulse.
- `src/features/suggestions/SuggestionsPanel.tsx` — status chips, confidence bar.
- `src/features/activity/ActivityPanel.tsx` — timeline styling.
- `src/features/settings/SettingsPanel.tsx` — row layout.

No new dependencies. No changes to stores, server function, speech service, or suggestion engine — logic is locked.

## Out of scope

- Impeccable CLI install (not possible; not a runtime library).
- Dark-mode toggle wiring changes (tokens updated for both, existing toggle keeps working).
- Copywriting rewrites beyond hero + tab labels.

## Validation

- Typecheck clean.
- Preview screenshot at mobile + desktop widths; verify hero, workspace, and each panel.
- Confirm no hardcoded color utilities were introduced (all colors via tokens).
