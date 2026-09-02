import { SkeletonBlock } from "@/components/Skeleton";

// Calendar's own loading.tsx (Next's route-level Suspense fallback, shown
// while page.tsx's server-side query is still running) — can't be the
// generic app/(app)/loading.tsx SkeletonPage, same reasoning as the
// dashboard's own (home)/loading.tsx: this page's shape (two action
// circles, a prev/next+title row, seven day rows) is nothing like a plain
// list of rows.
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
// Seven rows because Week is CalendarViews' own default view — the same
// count its internal today===null placeholder renders (see
// CalendarViews.tsx) — so this skeleton, that hydration-only placeholder,
// and the first resolved render all agree on shape, and any day that turns
// out to have zero events transitions through all three with no shift at
// all (see DaySection.tsx's own comment on why that's the honest limit:
// a day *with* real events genuinely grows once they're known).
export default function Loading() {
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

        <div className="flex flex-col gap-4">
          {Array.from({ length: 7 }, (_, index) => (
            <SkeletonBlock key={index} className="h-[82px] w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
