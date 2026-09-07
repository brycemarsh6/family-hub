"use client";

import { useSearchParams } from "next/navigation";
import { SkeletonBlock } from "@/components/Skeleton";
import { MonthGridSkeletonRows } from "@/components/MonthGridSkeletonRows";
import { parseViewParam } from "@/lib/calendarPaging";
import type { CalendarPeriodView } from "@/lib/calendarViewVocabulary";

// Calendar's own loading.tsx (Next's route-level Suspense fallback, shown
// while page.tsx's server-side query is still running) — can't be the
// generic app/(app)/loading.tsx SkeletonPage, same reasoning as the
// dashboard's own (home)/loading.tsx: this page's shape (two action
// circles, a prev/next+title row, seven day rows) is nothing like a plain
// list of rows.
//
// mission-9/C8 correction: an earlier version of this comment claimed this
// file "now ALSO fires on every real navigation CalendarViews.tsx's paging
// triggers (Prev/Next, Today, a view switch, a deep link)". MEASURED FALSE
// with a MutationObserver across all three, with and without 1.5s injected
// latency: `statusSeen` stayed 0 every time. A same-route "?date="/"?view="
// search-param push (CalendarViews.tsx's `navigateTo`) is a transition over
// an ALREADY-MOUNTED Suspense boundary, so React keeps the old UI on screen
// rather than re-showing this fallback — this file only actually renders on
// a genuinely FRESH mount: a first visit to `/calendar`, a hard reload, or
// an external/deep link landing here before the Suspense boundary exists
// yet. It still has to pick the right shape for THAT case — a fresh visit
// to `?view=month` (a bookmark, a shared link) must render the Month
// skeleton below, not the Week one. A Client Component (`"use client"`, per
// this file's own doc comment options — loading.js "can also be used as a
// Client Component") is what lets this read the "?view=" param via
// `useSearchParams()` and choose that shape on first render.
// `useSearchParams()` is safe to call here without its own extra
// <Suspense> wrapper: this route is `force-dynamic` (never statically
// prerendered — see that doc's own "Prerendering" caveat), and loading.tsx
// is ONLY ever rendered as part of a route-level Suspense fallback to
// begin with.
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
// WHICH SHAPE, per view — a total `Record`, read through the same
// `parseViewParam` the app itself uses (mission-11/C2). It used to be a
// hardcoded `searchParams.get("view") === "month"`, which produced NO
// compile error when the union widened to six views: Schedule, 3 Day and
// Year would each have silently taken the seven-row Week shape. Going
// through `parseViewParam` also means an unbuilt or malformed "?view="
// gets the same shape the app will actually render for it, because both
// answers now come from the one `BUILT_VIEWS` table.
//
// SEVEN ROWS FOR SCHEDULE IS DELIBERATE, and the reason is worth stating
// because it looks like a bug: a skeleton's job is to match the frame that
// paints NEXT, and for Schedule that frame is CalendarViews' own generic
// `today === null` placeholder — which renders SEVEN rows whatever the URL
// says, because `useCalendarNavigation` seeds the cursor with the default
// view (Week) and the URL's view lands a tick later (measured in
// mission-11/C1, identical on the pre-C1 build). A "measured" one-row Day
// skeleton would therefore ADD a shape jump rather than remove one, back
// when Day also fell through that generic placeholder. Month is the case
// that argues the other way and is why this file branches at all: its grid
// is tall enough that the seven-row shape is the worse mismatch of the two.
//
// mission-17/C4 gives Day/3 Day/Week a SECOND reason to branch away from
// the seven-row shape, on top of Month's: `CalendarViews.tsx`'s
// `renderPeriodContent` now handles `renderer === "timeline"` the same way
// it already handles "month" — BEFORE the generic placeholder, not through
// it — because `today === null`'s seven-block shape is what USED to paint
// next for these three (the same mechanism the paragraph above describes),
// and MEASURED against the real app that produces a ~225px height DROP the
// instant `TimelineGrid` mounts (a 7-block list settles around 1093px of
// page height at 375×812; the real timeline box settles around 868px) — a
// far bigger mismatch than the list-to-list swap Schedule still makes
// (mission-18/C4 moved Year off this list entirely — see its own paragraph
// below, past `SKELETON_SHAPE`). So the frame that now paints next for
// these three is a brief gap (both
// `today` and `now` are client-side `useSyncExternalStore` reads, not a
// network round trip) followed directly by the real `TimelineGrid`, and
// this file's own timeline shape below is sized to match THAT box, not the
// seven-block shape it replaces.
//
// mission-18/C4 gives Year the SAME third reason mission-17/C4 gave
// Day/3 Day/Week: `CalendarViews.tsx`'s `renderPeriodContent` now handles
// `renderer === "year"` ahead of the generic `today === null` placeholder
// too (the same place "month" and "timeline" are handled), so the frame
// that paints next for Year is the real `YearView`, not the seven-block
// shape — which is what makes a MEASURED Year shape correct here rather
// than another guess. This repo has shipped a guessed skeleton twice
// already and both times it was wrong (see `TimelineGridSkeleton`'s own
// header for the ~225px drop that caught the second one); `YearGridSkeleton`
// below is sized from the real rendered grid instead, the same discipline.
type CalendarSkeletonShape =
  | { dayRows: number }
  | { monthGrid: true }
  | { timelineGrid: true }
  | { yearGrid: true };

const SKELETON_SHAPE: Record<CalendarPeriodView, CalendarSkeletonShape> = {
  schedule: { dayRows: 7 },
  day: { timelineGrid: true },
  threeDay: { timelineGrid: true },
  week: { timelineGrid: true },
  month: { monthGrid: true },
  year: { yearGrid: true },
};

/**
 * The hour timeline's own box (mission-17/C4) — a single bordered block
 * rather than stacked rows, matching `TimelineGrid.tsx`'s real
 * `overflow-hidden rounded-xl border border-line` wrapper shape rather than
 * this file's day-row shape. Sized with the SAME formula that component
 * itself falls back on before its own runtime measurement lands (see its
 * own `scrollerHeightStyle` and `MIN_SCROLLER_HEIGHT_PX`) — `369` is
 * `top + navHeight` MEASURED against the real running page at 375px
 * (`getBoundingClientRect`, the same technique every other number in this
 * file was measured with): the app header, this page's own title/action-
 * circles/prev-next rows (all reproduced above, unchanged), and the bottom
 * nav together reserve that much of the viewport before the timeline box
 * itself starts. An inline `style`, not a Tailwind arbitrary class, to
 * match `TimelineGrid.tsx`'s own technique for the identical `calc()` —
 * `min-h` is `MIN_SCROLLER_HEIGHT_PX` (320) as a real Tailwind utility
 * rather than folded into the `calc()`, since CSS `calc()` can't express a
 * clamp on its own and `max()` nested inside a template string is harder to
 * read than the same floor `min-h-80` already states plainly.
 */
function TimelineGridSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="min-h-80 w-full animate-pulse rounded-lg bg-surface-2"
      style={{ height: "calc(100dvh - 369px)" }}
    />
  );
}

/**
 * Year's own shape (mission-18/C4): twelve grey blocks in `YearView.tsx`'s
 * own `grid grid-cols-2 gap-3` — the exact same wrapper class, not a
 * lookalike, so a real device's column width can never drift from what
 * this skeleton assumes. Unlike the timeline box above, this shape has a
 * FIXED height regardless of viewport (twelve fixed-size tiles, not
 * "however much of the screen is left"), matching `MonthGridSkeletonRows`'
 * own reasoning rather than `TimelineGridSkeleton`'s `calc()`.
 *
 * `h-36` (144px) per tile is MEASURED, not guessed: the real rendered
 * `YearView` at 375×812 gives every month tile a 166×144px box (`Range
 * .getClientRects`/`getBoundingClientRect` on a live tile, `Open September
 * 2026`'s own button), and the six-row/gap-3 total — 6×144 + 5×12 = 924px —
 * matches the real content container's measured height (924px) exactly,
 * which is the cross-check that the per-tile number is right rather than
 * merely close. Width is `w-full` (not a fixed px), since the grid's own
 * `grid-cols-2` already divides the row — the same reason `MonthGridSkeletonRows`
 * uses `w-full` cells rather than hardcoding a pixel width per column.
 */
function YearGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 12 }, (_, index) => (
        <SkeletonBlock key={index} className="h-36 w-full" />
      ))}
    </div>
  );
}

/**
 * `MonthChips`' own skeleton (mission-18/C5, closes Vision's blocker) —
 * same outer scroll-container classes as the real component
 * (`-mx-4 mb-4 overflow-x-auto px-4`, plus its scrollbar-hiding utilities,
 * copied verbatim so this can never drift out of sync with a class change
 * over there), same `flex w-max gap-2` inner row, same `min-h-11` chip
 * height — five grey pills rather than the real 25 month names, since a
 * skeleton doesn't scroll and five is enough to fill the strip's visible
 * width at 375px.
 *
 * WHY THIS EXISTS: mission-18/C3 mounted the real `MonthChips` above
 * `MonthGrid` on the Month view, but this file was outside that
 * contract's own may-touch list, so the Month skeleton went untouched —
 * exactly the boundary gap Vision's mission-18 blocker named. MEASURED at
 * 375×812 against a real production build (Runtime.evaluate over CDP,
 * cookie-authenticated, CPU- and network-throttled to widen the streaming
 * race enough to catch the skeleton frame at all): the real weekday-name
 * row sits at y=379; without this strip the skeleton's own weekday-row
 * placeholder sat at y=303 instead — a 76px jump on every cold load of
 * `/calendar?view=month`, and a tap aimed at skeleton row N would land on
 * real row N−1 during the swap.
 *
 * That 76px is deliberately NOT derived as `44 + 16` (this strip's chip
 * height plus its own `mb-4`) — CalendarViews.tsx renders the real
 * `MonthChips` and `MonthGrid` as siblings inside its own
 * `flex flex-col gap-4` wrapper, so a SECOND 16px (that parent's `gap-4`)
 * sits between them too: 44 + 16 + 16 = 76. `Loading`, below, reproduces
 * that same wrapper around this component and `MonthGridSkeletonRows` for
 * the `monthGrid` shape specifically, which is what makes the 76px come
 * out of the real box model rather than a constant chosen to match a
 * number — confirmed by re-measuring the wrapped result, not by the
 * arithmetic alone. Year does NOT get this treatment: `YearGridSkeleton`
 * measured a 0px difference against its own real render and is already
 * correct, and this component would only be a stray hardcoded month strip
 * — the wrong content for a view that has no month-chips row at all.
 */
function MonthChipsSkeleton() {
  return (
    <div className="-mx-4 mb-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max gap-2">
        {Array.from({ length: 5 }, (_, index) => (
          <SkeletonBlock key={index} className="h-11 w-16 shrink-0 rounded-full" />
        ))}
      </div>
    </div>
  );
}

export default function Loading() {
  const searchParams = useSearchParams();
  const shape = SKELETON_SHAPE[parseViewParam(searchParams.get("view"))];
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

        {"monthGrid" in shape ? (
          // mission-18/C5 — the `flex flex-col gap-4` wrapper here is the
          // SAME class CalendarViews.tsx uses around MonthChips + MonthGrid
          // (its own siblings), not a lookalike — see MonthChipsSkeleton's
          // own comment for why the 76px gap this closes depends on
          // reproducing that exact structure rather than a single margin.
          <div className="flex flex-col gap-4">
            <MonthChipsSkeleton />
            <MonthGridSkeletonRows />
          </div>
        ) : "timelineGrid" in shape ? (
          <TimelineGridSkeleton />
        ) : "yearGrid" in shape ? (
          <YearGridSkeleton />
        ) : (
          <div className="flex flex-col gap-4">
            {Array.from({ length: shape.dayRows }, (_, index) => (
              <SkeletonBlock key={index} className="h-[82px] w-full" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
