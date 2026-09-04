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
 * AGENTS.md, not recalled). The cost is measured, not assumed — and it is
 * NOT zero everywhere. An earlier version of this comment, and a commit
 * message, claimed the native call costs nothing; mission-11's Vision pass 3
 * corrected that (see mission-11/C5, mission-12/C1).
 *
 * FREE on loads and picks. Fourteen bare-URL loads, each rewritten and then
 * picked through, counted off the dev server's own log: 15 "GET /calendar"
 * with the native call — byte-identical to a build that rewrites nothing.
 *
 * +1 FETCH on a cold Back into a canonicalised entry, and this is real: 2 RSC
 * fetches versus 1 on base, deterministic (3/3 dev, 3/3 production,
 * confirmed in the server log). Cause: the entry's history-stored route tree
 * is still the bare one, but its URL now names a built view, so on restore
 * Next's `restoreReducer` fetches, detects the tree/URL mismatch, and
 * soft-retries. The render is correct either way (same cards as a fresh
 * load), and the entry is repaired by the retry — so this costs ONCE: every
 * canonicalised entry shares one cache key, so every later cold Back is a
 * cache hit. Next's own escalation for two successive tree/URL mismatches
 * (forcing a full page reload) needs a SECOND writer replacing the same
 * entry again — this hook itself writes at most one replace per entry, so
 * that guarantee is what THIS HOOK can promise, not a claim about the whole
 * app. It has already been reached once with a second writer present: the
 * tab bar's own `replace` onto an already-canonicalised entry hit exactly
 * that reload (mission-12/C3); the fix there removed the second writer, not
 * anything about this hook's own behaviour.
 *
 * AND BASE PAYS THIS SAME PRICE for any native `pushState` entry of its own
 * — this is the cost of the native History API integration Next's own docs
 * recommend, not a cost this hook introduces. Net against `router.replace`:
 * +1 fetch per cold Back here, versus +1 fetch per bare LOAD there (15 vs 30
 * GETs across 14 picks, measured above) — native still wins overall.
 *
 * DEV-ONLY DOUBLE-FIRE, unrelated to the above: this effect's mount runs
 * twice per bare load in development (React StrictMode double-invoking
 * mount effects) and once in production. Both calls write the identical
 * search string to the identical entry, so it's idempotent — noted here so
 * the next person building a harness against this hook doesn't chase it as
 * a bug.
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
