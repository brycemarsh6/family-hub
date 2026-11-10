// The "Open Marshee on" setting's one vocabulary: which pages a login can start
// on, the default, and the cleaner for a stored value. It imports only the
// drawer's destination list, so it is importable from a Server Action and from
// a client component alike. Anything not exactly in the list reads as the
// Dashboard, so a stored value can never redirect off the app.

import { NAV_SECTIONS } from "./nav";

// Every drawer destination in the drawer's order, minus Lists (still "coming
// soon"). Settings is not offered.
export const START_PAGE_OPTIONS: readonly { href: string; label: string }[] = NAV_SECTIONS.flatMap((section) =>
  section.items
    .filter((item) => item.href !== "/lists")
    .map((item) => ({ href: item.href, label: item.label })),
);

export const DEFAULT_START_PAGE = "/";

/** Narrows a stored value to a start page href. Never throws: anything not in the list is the Dashboard. */
export function toStartPage(raw: unknown): string {
  return START_PAGE_OPTIONS.find((option) => option.href === raw)?.href ?? DEFAULT_START_PAGE;
}

/** The page's name for a stored value (the Dashboard for anything unknown). */
export function startPageLabel(href: unknown): string {
  const clean = toStartPage(href);
  return START_PAGE_OPTIONS.find((option) => option.href === clean)?.label ?? "Dashboard";
}

export const START_PAGE_WORDS = {
  label: "Open Marshee on",
  helpSelf: "Where you land after you sign in.",
  helpTablet: "Where a tap on the slideshow or the black screen takes the tablet.",
  saveError: "Couldn't save the start page. Check your connection and try again.",
  notAllowed: "Only parents, admins and the wall tablet can change this.",
  notAPage: "That isn't a page you can start on.",
} as const;
