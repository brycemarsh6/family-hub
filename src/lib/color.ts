// Shared pure color-string helpers for the Calendar branch.
//
// Deliberately has no "server-only" guard and no imports: `hexToRgba` is
// pure over its inputs, reads no env, and does no I/O — the same standing
// match.ts/duplicates.ts already established for this repo's other
// pure-function libs (see match.ts's own header comment for the reasoning).
//
// Hoisted here (mission-10/C3) from two byte-identical private copies —
// MonthCell.tsx and EventCard.tsx each declared their own `hexToRgba` with
// the exact same body, because EventCard.tsx was off an earlier contract's
// boundary (must-not-touch) with no legal way to share one copy without
// editing it. This mission's boundary map puts both files in the SAME
// contract, so the duplication could finally be collapsed instead of
// re-noted a second time.
//
// mission-17/C5 hoisted a SECOND byte-identical pair the same way:
// MonthCell.tsx's `pillBackground` and TimelineGrid.tsx's `blockBackground`
// were character-for-character identical (Fury diffed them), each under a
// comment claiming to be "a private, minimal variant, not a copy" — the
// exact failure this file's own remedy already names, one call stack
// higher: mission-9/C2's `pillBackground` and mission-17/C2's
// `blockBackground` were built in DIFFERENT contracts, each forbidden from
// touching the other's file, so neither could legally share the other's
// copy without this hoist. Both now call the single `bandedBackground`
// below.
//
// `bandBackground` (EventCard.tsx) STAYS separate — it's a genuine variant,
// not a third copy of the two above: it takes color NAMES rather than hex
// strings, returns `undefined` on an empty list rather than a fallback
// background, and is uncapped at however many people are on an event
// (Month/Timeline both cap at 3 bands — see either caller's own comment for
// why; EventCard's list view doesn't). Only the byte-identical leaf
// helpers — `hexToRgba`, and now `bandedBackground` — ever move here.

/** `#rrggbb` -> `rgba(r, g, b, alpha)`. AVATAR_COLORS (constants.ts) are all
 * plain 6-digit hex, so this doesn't need to handle shorthand (#rgb) or
 * named colors — the one format that vocabulary ever produces. */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Up to a handful of diagonal color bands, one per person, over an opaque
 * `var(--surface)` backdrop — shared by Month's pills (MonthCell.tsx) and
 * the timeline's all-day/timed blocks (TimelineGrid.tsx), see this file's
 * own header for the hoist. The CALLER decides the cap (both currently
 * `slice(0, 3)` before calling this) and the alpha (both currently 0.10
 * live / 0.05 past-or-done, numbers reused unchanged from EventCard's own
 * already-measured contrast pass — mission-8/Strange: worst case 4.64:1
 * light / 5.53:1 dark against all 8 AVATAR_COLORS); this function only ever
 * renders however many colors it's handed. An empty list (no people on the
 * event/task) falls back to a flat `var(--surface-2)` rather than an empty
 * gradient. */
export function bandedBackground(colors: string[], alpha: number): string {
  if (colors.length === 0) return "var(--surface-2)";
  const bandWidth = 100 / colors.length;
  const stops = colors.flatMap((hex, index) => {
    const color = hexToRgba(hex, alpha);
    return [`${color} ${index * bandWidth}%`, `${color} ${(index + 1) * bandWidth}%`];
  });
  return `linear-gradient(135deg, ${stops.join(", ")}), var(--surface)`;
}
