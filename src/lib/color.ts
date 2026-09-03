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
// `pillBackground` (MonthCell.tsx) and `bandBackground` (EventCard.tsx)
// stay where they are — genuine variants (hex vs. color-name input,
// different empty-input fallbacks, one folding in a `var(--surface)`
// backdrop, one capped at 3 bands vs. uncapped), not copies of one another.
// Only the byte-identical leaf helper moved.

/** `#rrggbb` -> `rgba(r, g, b, alpha)`. AVATAR_COLORS (constants.ts) are all
 * plain 6-digit hex, so this doesn't need to handle shorthand (#rgb) or
 * named colors — the one format that vocabulary ever produces. */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
