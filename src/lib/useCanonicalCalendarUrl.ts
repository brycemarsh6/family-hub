"use client";

// Keeps the Calendar's URL honest: a "/calendar" URL naming no BUILT view is
// rewritten, in place, to name the one it actually renders (mission-11/C4,
// Vision's pass-2 blocker). One rule and the effect that applies it.
//
// A file of its own, and not only because useCalendarNavigation.ts is at its
// 350-line cap — Captain's CV0 Ruling 2 is explicit that a full file is a
// reason to LOOK for a boundary, never a reason to accept one. The boundary
// here is real: that hook reconciles the cursor WITH the URL and treats the
// URL as the source of truth; this module is the one place that ever CORRECTS
// the URL itself, on a rule that has nothing to do with the cursor. Its rule
// is pure and independently testable, and the two consumers a URL naming an
// unbuilt view will grow (CV5's year deep links, CV6's month dropdown) read
// the same one rather than each re-deriving it.

import { useEffect } from "react";
import { buildCalendarSearch } from "./calendarPaging";
import { toBuiltCalendarView, type CalendarPeriodView } from "./calendarViewVocabulary";
/**
 * The search string a URL naming no BUILT view must be rewritten to, or
 * `null` when there is nothing to write — the URL already names a built view,
 * or `today` hasn't resolved so there is no answer yet.
 *
 * WHY THE URL IS REWRITTEN AT ALL (mission-11/C4, Vision's pass-2 blocker).
 * `HUB_NAV_ITEMS` links to a bare `/calendar` (nav.ts), so a URL naming no
 * view is the first thing a family member lands on — and what it MEANS is
 * read from this device's stored preference, which the user's own picker tap
 * then changes. One history entry therefore meant Week when it was pushed and
 * Month by the time Back returned to it: Back appeared to do nothing, and a
 * second Back left the calendar branch entirely.
 *
 * C3 answered that by freezing the preference for the life of the mount,
 * which covers a Back within one mount and nothing else — THE AMBIGUOUS ENTRY
 * OUTLIVES THE MOUNT. Tapping away to another branch and back, or a reload
 * (routine on the household's iOS home-screen app, which reloads after
 * backgrounding), re-freezes from the store the tap just wrote. Vision
 * measured both. Rewriting the entry removes the ambiguity instead of dating
 * it: afterwards every calendar entry names the view it actually rendered, so
 * a popstate to it resolves the same way forever. The preference still
 * decides what a FRESH open means — it is read here, to decide what to write
 * — which is calendar-v2.md decision 5 exactly.
 *
 * Deliberately narrow: only the VIEW is treated as ambiguous. A missing
 * "?date=" resolves through `today`, which no user action can move, and is
 * pinned only because it travels in the same string.
 *
 * Pure and exported so the rule is testable without a renderer, the same
 * standing as `consumePushedSearch` in useCalendarNavigation.ts.
 */
export function canonicalSearchFor(
  viewParam: string | null,
  target: { view: CalendarPeriodView; anchor: Date } | null,
): string | null {
  if (target === null) return null;
  if (toBuiltCalendarView(viewParam) !== null) return null;
  return buildCalendarSearch(target.view, target.anchor);
}

/**
 * Applies the rule above once `today` has resolved, and never writes anything
 * else. Callers pass the params as VALUES, never the `searchParams` object,
 * and the `target` object is deliberately NOT a dependency — it carries a
 * fresh `Date` every render, which is the exact mistake mission-9/C8 fixed.
 *
 * `window.history.replaceState`, NOT `router.replace`. Next documents the
 * native History API as integrating with the router and `useSearchParams`
 * (node_modules/next/dist/docs/01-app/01-getting-started/
 * 04-linking-and-navigating.md:343-345, :397-412 — read in this tree per
 * AGENTS.md, not recalled), and the difference is measured, not assumed, on
 * the Calendar's "force-dynamic" page. Fourteen bare-URL loads, each rewritten
 * and then picked through, counted off the dev server's own log: 15 "GET
 * /calendar" with the native call — byte-identical to a build that rewrites
 * NOTHING — against 30 with `router.replace` swapped in, which also
 * invalidates the router cache and so re-fetches every later push as well.
 * The native call corrects the entry in place; it does not re-fetch a page
 * whose contents did not change.
 *
 * REPLACE, never push — this corrects the entry the user is standing on, not
 * a place they went, and a push would put a second calendar entry under every
 * Back. AND IT MUST NEVER WRITE THE PREFERENCE: `writeLastCalendarView` keeps
 * exactly one caller (the picker), because "last used" means the last view a
 * human deliberately picked, and a URL resync recording itself as a preference
 * would be the app choosing on their behalf and then citing itself as reason.
 */
export function useCanonicalCalendarUrl(
  viewParam: string | null,
  dateParam: string | null,
  todayTime: number | null,
  target: { view: CalendarPeriodView; anchor: Date } | null,
): void {
  useEffect(() => {
    const search = canonicalSearchFor(viewParam, target);
    if (search === null) return;
    window.history.replaceState(null, "", `/calendar?${search}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateParam, viewParam, todayTime]);
}
