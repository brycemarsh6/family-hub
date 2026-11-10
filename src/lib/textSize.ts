// The "Text size" setting's one vocabulary: which sizes exist, what they are
// called and which one is the default. No React imports on purpose, so this
// file is importable from a Server Action and from a client component alike.
// A size scales the whole app on wide screens (globals.css); phones stay put.

export const TEXT_SIZES = ["normal", "large", "xl"] as const;

export type TextSize = (typeof TEXT_SIZES)[number];

export const TEXT_SIZE_LABELS: Record<TextSize, string> = {
  normal: "Normal",
  large: "Large",
  xl: "Extra large",
};

export const TEXT_SIZE_HELP = "Applies on wide screens.";

export const DEFAULT_TEXT_SIZE: TextSize = "normal";

/** Narrows a stored value to a TextSize. Never throws: anything unknown is the default. */
export function toTextSize(raw: unknown): TextSize {
  return TEXT_SIZES.find((size) => size === raw) ?? DEFAULT_TEXT_SIZE;
}
