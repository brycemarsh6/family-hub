"use client";

import { useSearchParams } from "next/navigation";
import { SkeletonBlock } from "@/components/Skeleton";

// Calendar's own loading.tsx (Next's route-level Suspense fallback, shown
// while page.tsx's server-side query is still running) — can't be the
// generic app/(app)/loading.tsx SkeletonPage, same reasoning as the
// dashboard's own (home)/loading.tsx: this page's shape (two action
// circles, a prev/next+title row, seven day rows) is nothing like a plain
// list of rows.
//
// mission-9/C6: this file now ALSO fires on every real navigation
// CalendarViews.tsx's paging triggers (Prev/Next, Today, a view switch, a
// deep link), not just the very first load — real navigation is the whole
// point of that contract (see page.tsx's own comment). A Client Component
// (`"use client"`, per this file's own doc comment options — loading.js
// "can also be used as a Client Component") is what lets this read the
// in-flight "?view=" param via `useSearchParams()` and choose the Month
// shape below instead of the Week/Day one when that's genuinely what's
// loading — without this, navigating Month→Month would flash the 7-row
// Week skeleton (wrong dimensions entirely) on every single step, a real
// regression C6 would otherwise have introduced. `useSearchParams()` is
// safe to call here without its own extra <Suspense> wrapper: this route
// is `force-dynamic` (never statically prerendered — see that doc's own
// "Prerendering" caveat), and loading.tsx is ONLY ever rendered as part of
// an already-in-flight client-side navigation to begin with.
//
// Every height below is MEASURED against the real signed-in page at 375px
// (getBoundingClientRect in the browser), not guessed — the dashboard's own
// h-56-for-a-164px-tile bug is exactly the failure mode this avoids. They
// also happen to equal Tailwind utilities CalendarViews.tsx already uses
// for the same rows (h-14 circles, h-11 buttons, gap-10/mb-5/mb-4/gap-4),
// which is reassuring rather than coincidental: both this file and the real
// component are built from the same design tokens, so they can't quietly
// drift apart the way two independently-eyeballed pixel counts could.
//   h1 "Calendar" (text-2xl font-bold):                     32px  -> h-8
//   action-circles row (Today + view switcher), no margin:  78px  -> h-[78px], mb-5 below (20px)
//   prev/next + title row:                                  44px  -> h-11, mb-4 below (16px)
//   one day row (gutter placeholder + a 46px grey body block —
//     the SAME two pieces DaySection's own `loading` state
//     renders, drawn here as one flat block instead of the two-
//     piece markup; NEVER the real "No events" card — a loading
//     row must not assert a fact about data it hasn't fetched
//     yet, see DaySection.tsx's own comment):                82px  -> h-[82px]
//   gap between day rows:                                    16px  -> gap-4
//
// Seven rows for Week/Day because Week is CalendarViews' own default view
// — the same count its internal today===null hydration placeholder
// renders (see CalendarViews.tsx) — so this skeleton, that placeholder,
// and the first resolved render all agree on shape, and any day that
// turns out to have zero events transitions through all three with no
// shift at all (see DaySection.tsx's own comment on why that's the
// honest limit: a day *with* real events genuinely grows once they're
// known). Month gets its own shape below (`MonthGridSkeletonRows`) as of
// mission-9/C6 — real navigation now reaches this file while Month is
// the active view (Prev/Next/Today from inside Month, or a deep link
// straight to one), which couldn't happen before that contract (`view`
// only ever became "month" via a tap, by which point `useToday()` had
// already resolved — see this file's own C6 comment above).
function isMonthView(searchParams: ReturnType<typeof useSearchParams>): boolean {
  return searchParams.get("view") === "month";
}

export default function Loading() {
  const searchParams = useSearchParams();
  return (
    <div className="py-2" role="status" aria-label="Loading Calendar">
      <SkeletonBlock className="h-8 w-32" />

      <div className="mt-4">
        <div className="mb-5 flex h-[78px] items-center justify-center gap-10">
          <SkeletonBlock className="h-14 w-14 rounded-full" />
          <SkeletonBlock className="h-14 w-14 rounded-full" />
        </div>

        <div className="mb-4 flex h-11 items-center gap-2">
          <SkeletonBlock className="h-11 w-11" />
          <SkeletonBlock className="h-11 flex-1" />
          <SkeletonBlock className="h-11 w-11" />
        </div>

        {isMonthView(searchParams) ? (
          <MonthGridSkeletonRows />
        ) : (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 7 }, (_, index) => (
              <SkeletonBlock key={index} className="h-[82px] w-full" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The Month-shaped header-row-plus-six-rows content (mission-9/C2b),
 * sized from the SAME real, signed-in 375px page this file's own header
 * measured everything else against (`getBoundingClientRect` on the live
 * grid): the SHORT_DAY_NAMES header measured 20px; a typical
 * (no-overflow) day row measured 78.5px — MonthCell.tsx's own fixed
 * pieces add up to exactly this (a 20px number/glyph row, three 16px
 * pill slots, 0.5rem/2px gaps between — `gap-0.5` — plus `p-1` padding),
 * so it can't quietly drift out of sync with the real cell the way an
 * eyeballed guess could; a row carrying "+N more" measures taller
 * (91.75px) but a skeleton doesn't need to represent that variant.
 * `gap-1` (4px) between rows matches MonthGrid's own row-wrapper class.
 *
 * Factored out (mission-9/C6) so `Loading` above can embed this SAME
 * markup inside its own single `role="status"`/`mt-4` wrapper when
 * `?view=month`, rather than nesting a second independent status region
 * inside the first — `MonthLoadingSkeleton` below is still exported and
 * still a complete, self-contained frame in its own right (this is an
 * additive change, not a breaking one to callers still expecting that
 * shape).
 */
function MonthGridSkeletonRows() {
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

/**
 * A complete, self-contained Month-shaped frame (`role="status"`/`mt-4`
 * of its own) — kept for any caller that needs the Month skeleton without
 * this file's Week/Day header-row scaffolding around it. `Loading` above
 * now renders the SAME `MonthGridSkeletonRows` content directly (as of
 * mission-9/C6) rather than this wrapper, for the reason in that
 * function's own comment.
 */
export function MonthLoadingSkeleton() {
  return (
    <div className="mt-4" role="status" aria-label="Loading Calendar">
      <MonthGridSkeletonRows />
    </div>
  );
}
