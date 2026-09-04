"use client";

import { useSearchParams } from "next/navigation";
import { SkeletonBlock } from "@/components/Skeleton";
import { MonthGridSkeletonRows } from "@/components/MonthLoadingSkeleton";
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
// SEVEN ROWS FOR DAY IS DELIBERATE, and the reason is worth stating
// because it looks like a bug: a skeleton's job is to match the frame that
// paints NEXT, and that frame is always CalendarViews' own
// `today === null` placeholder — which renders SEVEN rows whatever the URL
// says, because `useCalendarNavigation` seeds the cursor with the default
// view (Week) and the URL's view lands a tick later (measured in
// mission-11/C1, identical on the pre-C1 build). A "measured" one-row Day
// skeleton would therefore ADD a shape jump rather than remove one. Month
// is the case that argues the other way and is why this file branches at
// all: its grid is tall enough that the seven-row shape is the worse
// mismatch of the two.
//
// The unbuilt views' rows are unreachable — `parseViewParam` normalizes
// them away — and each is the Week shape rather than a guess at a view
// that does not exist. CV3/CV4/CV5 replace their own row with a MEASURED
// shape in the commit that flips `BUILT_VIEWS`, per calendar-v2.md; this
// repo has shipped a guessed skeleton twice and both times it was wrong.
type CalendarSkeletonShape = { dayRows: number } | { monthGrid: true };

const SKELETON_SHAPE: Record<CalendarPeriodView, CalendarSkeletonShape> = {
  schedule: { dayRows: 7 },
  day: { dayRows: 7 },
  threeDay: { dayRows: 7 },
  week: { dayRows: 7 },
  month: { monthGrid: true },
  year: { dayRows: 7 },
};

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
          <MonthGridSkeletonRows />
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
