// The "Menu style" setting's one vocabulary: which modes exist, what they are
// called and which one is the default. No React imports on purpose, so this
// file is importable from a Server Action and from a client component alike.
// On wide screens a mode may pin the side drawer open; phones always use the
// menu button.

export const NAV_MODES = ["hamburger", "rail", "sidebar"] as const;

export type NavMode = (typeof NAV_MODES)[number];

export const NAV_MODE_LABELS: Record<NavMode, string> = {
  hamburger: "Menu button",
  rail: "Always open, icons only",
  sidebar: "Always open, icons + names",
};

export const NAV_MODE_HELP = "Applies on wide screens. Phones always use the menu button.";

export const DEFAULT_NAV_MODE: NavMode = "hamburger";

/** Narrows a stored value to a NavMode. Never throws: anything unknown is the default. */
export function toNavMode(raw: unknown): NavMode {
  return NAV_MODES.find((mode) => mode === raw) ?? DEFAULT_NAV_MODE;
}
