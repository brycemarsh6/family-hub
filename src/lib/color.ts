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
// copy without this hoist. Both then called one shared helper.
//
// mission-77 replaced the two band painters (`bandedBackground` here and
// EventCard's private `bandBackground`) with the single `personFill` below.

/** `#rrggbb` -> `rgba(r, g, b, alpha)`. AVATAR_COLORS (constants.ts) are all
 * plain 6-digit hex, so this doesn't need to handle shorthand (#rgb) or
 * named colors — the one format that vocabulary ever produces. */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** How a person-coloured block looks (mission 77, style D): "solid" is a
 * live event or open task, "faded" is a past event or completed task, "none"
 * is nobody on it (the caller keeps its own flat look and text classes). */
export type PersonLook = "solid" | "faded" | "none";

/** Wash strength of a faded block, measured with `text-muted-strong` text
 * (worst 4.58:1 light / 6.34:1 dark). */
export const FADED_ALPHA = 0.15;

export type PersonFill = {
  look: PersonLook;
  /** The `background` value. */
  background: string;
  /** Text class every inner line follows: white on solid, muted-strong on
   * faded, "" when the caller keeps today's classes. */
  textClass: string;
  /** Inline styles: background, and for "faded" the left stripe in the first
   * person's hex (`stripePx` wide; 0 draws none). Solid/none add nothing. */
  style: {
    background: string;
    backgroundOrigin?: string;
    borderLeftColor?: string;
    borderLeftWidth?: string;
  };
};

/** Paints a block for the people on it. One diagonal band per hex, in order,
 * at full strength when live (white text) or at 15% over an opaque
 * `var(--surface)` backdrop when faded (stripe in the first hex on the left
 * edge, `text-muted-strong` text). The CALLER decides the cap (Month, hour
 * blocks and the all-day strip pass at most 3 hexes; EventCard passes
 * everyone). No hexes gives a flat `var(--surface-2)` and `look: "none"`.
 * The border-box origin keeps the bands from tiling into a transparent
 * border. */
export function personFill(hexes: string[], faded: boolean, stripePx = 0): PersonFill {
  if (hexes.length === 0) {
    return { look: "none", background: "var(--surface-2)", textClass: "", style: { background: "var(--surface-2)" } };
  }
  const bandWidth = 100 / hexes.length;
  const stops = hexes.flatMap((hex, index) => {
    const color = faded ? hexToRgba(hex, FADED_ALPHA) : hex;
    return [`${color} ${index * bandWidth}%`, `${color} ${(index + 1) * bandWidth}%`];
  });
  const bands = `linear-gradient(135deg, ${stops.join(", ")})`;
  if (!faded) {
    return { look: "solid", background: bands, textClass: "text-white", style: { background: bands, backgroundOrigin: "border-box" } };
  }
  const background = `${bands}, var(--surface)`;
  return {
    look: "faded",
    background,
    textClass: "text-muted-strong",
    style: {
      background,
      backgroundOrigin: "border-box",
      ...(stripePx > 0 ? { borderLeftColor: hexes[0], borderLeftWidth: `${stripePx}px` } : {}),
    },
  };
}
