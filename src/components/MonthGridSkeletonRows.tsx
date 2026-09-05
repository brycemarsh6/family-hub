import { SkeletonBlock } from "./Skeleton";

// Relocated here (mission-10/C3) from `src/app/(app)/calendar/loading.tsx`,
// which held this markup as a second export — the only one of this app's
// eight `loading.tsx` files with one. Its only plausible consumer would have
// been `CalendarViews.tsx`, and importing a route-segment file (`app/`) from
// `src/components/` is an arrow STRUCTURE.md doesn't sanction —
// `components/` files are meant to be importED BY `app/`, never the reverse.
// Moving it here fixes the direction: `loading.tsx` imports this file.
//
// The measured heights and their rationale below are kept exactly as
// measured (CV4 replaces this skeleton entirely later, so re-measuring now
// would be wasted work).
//
// This file's OWN filename used to name a wrapper component that lived
// below `MonthGridSkeletonRows` and was deleted in mission-11/C1: it had
// zero callers repo-wide across two missions, and STRUCTURE.md's
// dormant-export rule says that is a delete rather than a comment. The file
// itself was renamed to match its one remaining export (mission-15/C5, per
// STRUCTURE.md's own note that this mission must close that gap) — its
// single importer, `loading.tsx`, was updated in the same commit.

/**
 * The Month-shaped header-row-plus-six-rows content (mission-9/C2b),
 * sized from the SAME real, signed-in 375px page loading.tsx's own header
 * comment measured everything else against (`getBoundingClientRect` on the
 * live grid): the SHORT_DAY_NAMES header measured 20px; a typical
 * (no-overflow) day row measured 78.5px — MonthCell.tsx's own fixed
 * pieces add up to exactly this (a 20px number/glyph row, three 16px
 * pill slots, 0.5rem/2px gaps between — `gap-0.5` — plus `p-1` padding),
 * so it can't quietly drift out of sync with the real cell the way an
 * eyeballed guess could; a row carrying "+N more" measures taller
 * (91.75px) but a skeleton doesn't need to represent that variant.
 * `gap-1` (4px) between rows matches MonthGrid's own row-wrapper class.
 *
 * Factored out (mission-9/C6) so loading.tsx's `Loading` can embed this
 * SAME markup inside its own single `role="status"`/`mt-4` wrapper when
 * `?view=month`, rather than nesting a second independent status region
 * inside the first. That embedding is the only caller.
 */
export function MonthGridSkeletonRows() {
  return (
    <>
      <div className="grid h-5 grid-cols-7 gap-1 px-1">
        {Array.from({ length: 7 }, (_, index) => (
          <SkeletonBlock key={index} className="h-4 w-full" />
        ))}
      </div>

      <div className="mt-1 flex flex-col gap-1">
        {Array.from({ length: 6 }, (_, row) => (
          <div key={row} className="grid grid-cols-7 gap-1 px-1">
            {Array.from({ length: 7 }, (_, col) => (
              <SkeletonBlock key={col} className="h-[78.5px] w-full" />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
