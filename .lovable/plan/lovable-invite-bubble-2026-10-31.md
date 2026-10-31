# Lovable invite bubble

Add a small round floating button in the bottom-right corner linking to https://lovable.dev/invite/NZPTJTD.

## Behavior
- Opens in a new tab (`target="_blank"`, `rel="noopener noreferrer"`).
- Tooltip/title and accessible label: "Try Lovable with +10 credits".
- Hidden on mobile (below `sm`), visible on tablet/desktop.
- Always on top (`fixed`, very high z-index, `pointer-events-auto`), so it stays clickable above the game, HUD and popups.
- Placed above the bottom hint bar area without overlapping it (bottom-right corner).

## Style
- Round bubble, thick black outline, white fill, neo-brutalist hard shadow matching the rest of the UI.
- Red heart icon in the exact center, rotated 45° to the right to resemble the Lovable mark (inline SVG, no external icon library).
- Hover: scale 1.02 and slight fade (opacity ~85%), smooth transition; visible keyboard focus ring.

## Technical details
- New single file `src/components/LovableBubble.tsx`: self-contained, Tailwind classes only, inline SVG heart, no imports beyond React types, no project tokens — so it can be copied into other projects as is. Black/white/red use Tailwind's built-in palette deliberately for portability.
- Rendered once in `src/routes/__root.tsx` so it appears on every page.
