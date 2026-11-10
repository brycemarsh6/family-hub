// The "Text size" setting's one vocabulary: which sizes exist, what they are
// called and which one is the default. No React imports on purpose, so this
// file is importable from a Server Action and from a client component alike.
// A size scales the whole app on wide screens (globals.css); phones stay put.

export const TEXT_SIZES = ["normal", "large", "xl", "xxl"] as const;

export type TextSize = (typeof TEXT_SIZES)[number];

export const TEXT_SIZE_LABELS: Record<TextSize, string> = {
  normal: "Normal",
  large: "Large",
  xl: "Larger",
  xxl: "Largest",
};

/**
 * How big the "Aa" on each Settings tile is drawn, in rem. These are the
 * same factors as the font-size percentages and icon zoom in the mission-58
 * block of globals.css (100 / 110 / 135 / 150%): change both together.
 */
export const TEXT_SIZE_PREVIEW_REM: Record<TextSize, number> = {
  normal: 1,
  large: 1.1,
  xl: 1.35,
  xxl: 1.5,
};

export const TEXT_SIZE_HELP = "Applies on wide screens.";

export const DEFAULT_TEXT_SIZE: TextSize = "normal";

/** Narrows a stored value to a TextSize. Never throws: anything unknown is the default. */
export function toTextSize(raw: unknown): TextSize {
  return TEXT_SIZES.find((size) => size === raw) ?? DEFAULT_TEXT_SIZE;
}
