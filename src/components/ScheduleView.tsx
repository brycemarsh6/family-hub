"use client";

// The Schedule view — mission-15 (CV3): one continuous list of days that
// scrolls endlessly backward and forward, today always present. See
// src/lib/useScheduleWindow.ts for the data side (windowing, merging,
// scroll anchoring); this file is rendering only.

import { useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type Ref } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DaySection } from "./DaySection";
import { EventDetailSheet } from "./EventDetailSheet";
import { TaskDetailSheet } from "./TaskDetailSheet";
import { SkeletonBlock } from "./Skeleton";
import {
  SCHEDULE_TITLE_SLOT_ID,
  APP_HEADER_HEIGHT_PX,
  SCHEDULE_HEADER_BAR_HEIGHT_PX,
} from "./CalendarHeader";
import {
  useScheduleWindow,
  type ScheduleFetchers,
  type ScheduleRenderDay,
  type ScheduleRenderMonth,
} from "@/lib/useScheduleWindow";
import { useToday } from "@/lib/useToday";
import { allDayInstantToLocalDay } from "@/lib/calendarDates";
// mission-15/C5: this component is the boundary that's ALLOWED to know
// which Server Actions back the Schedule view — useScheduleWindow.ts no
// longer imports either of these itself (see that file's own header for
// why: a lib module reaching into app/ was a real STRUCTURE.md violation).
import { fetchCalendarEvents } from "@/app/actions/calendar";
import { fetchTasks } from "@/app/actions/tasks";
import {
  SHORT_DAY_NAMES,
  formatMonthTitle,
  formatWeekRange,
  isSameDay,
  startOfDay,
  sundayOf,
  toLocalDateString,
} from "@/lib/mealPlanDates";
import type { CalendarEventView, CalendarPersonView, CalendarTaskView } from "@/lib/types";

/**
 * mission-15/C8 (B1) — lets CalendarViews.tsx call `scrollToToday`
 * imperatively from the header's Today circle. React 19 accepts `ref` as
 * an ordinary prop on a function component (see `ScheduleViewProps` below)
 * — no `forwardRef` needed; this is the first component in this codebase
 * to use the pattern.
 */
export type ScheduleViewHandle = {
  /**
   * Attempts to scroll TODAY's row into view. Returns `true` when today is
   * currently loaded (a row exists to scroll to) and `false` otherwise —
   * CalendarViews.tsx's own Today-circle handler treats `false` as its
   * signal to NAVIGATE instead ("scrolls if loaded, navigates if not").
   */
  scrollToToday: () => boolean;
};

type ScheduleViewProps = {
  /** Where the initial load is centered — C4's job to resolve
   * `parseDateParam(?date=) ?? today` before handing this down; this
   * component never reads `useSearchParams` itself (mission-10/CV0's rule:
   * useCalendarNavigation is the Calendar branch's ONLY reader of it). */
  initialDay: Date;
  /** The full household roster — threaded straight through to
   * TaskDetailSheet's edit view, same as CalendarViews.tsx already does. */
  people: CalendarPersonView[];
  canManage: boolean;
  /**
   * mission-15/C8 (B1) — reports whether TODAY's own row is genuinely on
   * screen right now. CalendarViews.tsx forwards this straight into the
   * header's Today circle `isCurrentPeriod`, for this one view only — see
   * this file's own tracking effect, below, for how it's determined, and
   * calendarViewConfig.ts's corrected comment for why the OLD anchor-based
   * check was wrong.
   */
  onTodayVisibleChange: (visible: boolean) => void;
  ref?: Ref<ScheduleViewHandle>;
};

/** One month's days, grouped into Sunday-start week sections — a
 * presentation-only concern, not part of useScheduleWindow.ts's pure data
 * layer, so it lives here rather than there. `days` arrives already in
 * chronological order (scheduleRows' own walk), so this is a single
 * linear pass, not a sort. */
type ScheduleWeekGroup = { weekStart: Date; days: ScheduleRenderDay[] };

function groupByWeek(days: ScheduleRenderDay[]): ScheduleWeekGroup[] {
  const weeks: ScheduleWeekGroup[] = [];
  for (const day of days) {
    const weekStart = sundayOf(day.day);
    const last = weeks[weeks.length - 1];
    if (last && isSameDay(last.weekStart, weekStart)) {
      last.days.push(day);
    } else {
      weeks.push({ weekStart, days: [day] });
    }
  }
  return weeks;
}

/**
 * Today's own row, when it holds nothing — the one day scheduleRows always
 * includes even when empty (src/lib/scheduleWindow.ts's own reason: a plain
 * "only days with something" list would let today silently vanish from an
 * otherwise-populated list the moment it happens to be free). DaySection's
 * own empty state reads "No events", which is right for Week/Day/Month but
 * not the Schedule-specific CTA the plan asks for ("Nothing planned. Tap to
 * create." -> /calendar/new?date=) — DaySection can't be touched to add a
 * second empty-text option (mission-15/C3's own boundary), so this is a
 * small, deliberately separate render path for exactly this one row,
 * copying DaySection's gutter markup verbatim for visual consistency
 * rather than importing a piece that isn't exported.
 */
function TodayEmptyRow({ day }: { day: Date }) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-accent">
          {SHORT_DAY_NAMES[day.getDay()]}
        </span>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-fg">
          {day.getDate()}
        </span>
      </div>
      <div className="border-l-2 border-accent pl-3">
        <Link
          href={`/calendar/new?date=${toLocalDateString(day)}`}
          className="flex min-h-14 w-full items-center justify-center rounded-xl border border-dashed border-line px-3 py-3 text-center text-sm text-muted transition-colors active:bg-surface-2"
        >
          Nothing planned. Tap to create.
        </Link>
      </div>
    </section>
  );
}

export function ScheduleView({
  initialDay,
  people,
  canManage,
  onTodayVisibleChange,
  ref,
}: ScheduleViewProps) {
  const router = useRouter();
  const today = useToday();
  // Stable across renders (useScheduleWindow.ts's own fetchersRef only
  // needs this to be kept CURRENT, not referentially stable — but
  // memoizing it costs nothing and avoids re-running that ref-sync effect
  // on every render for no reason).
  const fetchers: ScheduleFetchers = useMemo(
    () => ({ fetchEvents: fetchCalendarEvents, fetchTasks }),
    [],
  );
  const {
    months,
    hasMoreBackward,
    hasMoreForward,
    loadingBackward,
    loadingForward,
    topSentinelRef,
    bottomSentinelRef,
    refreshDay,
  } = useScheduleWindow(initialDay, today, fetchers);

  const [selected, setSelected] = useState<{ event: CalendarEventView; day: Date } | null>(null);
  const [selectedTask, setSelectedTask] = useState<CalendarTaskView | null>(null);

  // Registered by each rendered day row below; used only once, to scroll to
  // `initialDay` after it first appears. Not tied to React state on
  // purpose — a ref map churns on every render without needing to trigger
  // one itself, the same reasoning SwipeActions/RecipeList's own section
  // refs already establish in this codebase.
  const dayRefs = useRef(new Map<number, HTMLElement>());
  const hasScrolledInitially = useRef(false);
  const initialDayTime = startOfDay(initialDay).getTime();

  // mission-16/C4 (D2) — one ref per rendered month `<section>`, watched by
  // the "which month is topmost" observer below. Same reasoning as
  // `dayRefs` above: a ref map churns on every render without needing to
  // trigger one itself.
  const monthRefs = useRef(new Map<number, HTMLElement>());

  // mission-15/C10 (Strange's blocker) — re-arms the one-shot below
  // whenever `initialDayTime` genuinely changes, mirroring
  // useScheduleWindow.ts's own window-rebuild effect keyed on the same
  // value. Before this, tapping Today (a CLIENT-SIDE navigation that only
  // changes the `initialDay` prop, no remount) rebuilt the DATA but left
  // this ref permanently spent from the component's first mount — the URL
  // and the window both moved, but the reader never actually arrived.
  const seededInitialDayTime = useRef(initialDayTime);
  useEffect(() => {
    if (seededInitialDayTime.current === initialDayTime) return;
    seededInitialDayTime.current = initialDayTime;
    hasScrolledInitially.current = false;
  }, [initialDayTime]);

  // Initial scroll to `initialDay` — instant, not smooth, matching
  // RecipeList's own established finding for anything that should land
  // immediately rather than queue a visible animation. Runs on every
  // render until the target day's ref actually exists (it may not yet —
  // still loading, or a genuinely empty non-today day that never renders a
  // row at all) and then never again, UNTIL the effect above re-arms it.
  // Scrolling itself never touches the URL — this reads `dayRefs`/DOM only.
  useLayoutEffect(() => {
    if (hasScrolledInitially.current) return;
    const target = dayRefs.current.get(initialDayTime);
    if (!target) return;
    target.scrollIntoView({ behavior: "instant", block: "start" });
    hasScrolledInitially.current = true;
  });

  // mission-15/C8 (B1) — tracks whether TODAY's own row is genuinely ON
  // SCREEN right now, which is what CalendarViews.tsx now disables the
  // header's Today circle against (see calendarViewConfig.ts's own
  // corrected comment for why the OLD anchor-based check was wrong: an
  // anchor that scrolling deliberately never moves read "you're on today"
  // forever, the instant the reader scrolled anywhere at all).
  //
  // A plain IntersectionObserver targeted at whichever DOM node `dayRefs`
  // currently holds for today, re-run whenever `today`/`months` change so
  // it re-targets the moment today's row actually mounts (a deep link far
  // from today has no such row until the reader scrolls all the way back
  // to it) — separate from the two endless-scroll sentinels in
  // useScheduleSentinels.ts, which exist to trigger a FETCH a viewport
  // ahead of the edge (`rootMargin: "100%"`); this one answers a different
  // question ("is this exact row visible right now") and needs a tight
  // margin, not a generous one.
  //
  // mission-15/C10 (Strange's NOTE) — a bare `threshold: 0` uses the
  // LAYOUT viewport, which the app's fixed 65px bottom nav sits on top of:
  // a row fully behind the nav still read "intersecting", disabling Today
  // while the reader genuinely couldn't see it. `rootMargin`'s bottom
  // value shrinks the effective observing area by that same 65px, so a row
  // has to be visible ABOVE the nav to count.
  useLayoutEffect(() => {
    if (today === null) {
      onTodayVisibleChange(false);
      return;
    }
    const node = dayRefs.current.get(startOfDay(today).getTime());
    if (!node) {
      // Not loaded at all — can't be on screen, and CalendarViews.tsx's own
      // fallback (scrollToToday returning false, below) is what makes a tap
      // on Today NAVIGATE instead of scroll in exactly this case.
      onTodayVisibleChange(false);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => onTodayVisibleChange(entry.isIntersecting),
      { threshold: 0, rootMargin: "0px 0px -65px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [today, months, onTodayVisibleChange]);

  // mission-16/C4 (D2) — the pinned CalendarHeader now owns the one live
  // month label for Schedule (see SCHEDULE_TITLE_SLOT_ID's own comment for
  // why this is a portal rather than a prop). Seeded with `initialDay`'s
  // own month so the very first paint matches whatever the header would
  // have shown anyway (no jump on load) — this observer only ever moves it
  // from there once the reader actually scrolls into a different month.
  const [visibleMonthAnchor, setVisibleMonthAnchor] = useState(initialDay);
  // mission-16/C7 — mirrors `visibleMonthAnchor`'s latest value without
  // being a state read the effect below has to depend on (same ref-not-
  // state reasoning as `hasScrolledInitially`/`seededInitialDayTime`
  // above). Needed to break a genuine infinite-render loop the scroll-
  // driven effect below would otherwise cause: `useScheduleWindow.ts`'s
  // `months` is memoized on `[state, today, initialDay]`, and `useToday()`
  // hands back a FRESH `Date` object every render even when the underlying
  // calendar day hasn't moved — so `months` gets a new array reference on
  // effectively every render, re-running that effect every time. The old
  // IntersectionObserver-based version this replaced only ever called
  // `setVisibleMonthAnchor` from a genuine browser intersection-change
  // callback, so re-running its setup on every render was merely wasteful.
  // This version calls `setVisibleMonthAnchor` synchronously from the
  // effect body itself (matching `syncTitleSlot`'s own established
  // pattern) — without this ref-backed guard, it would hand back a new
  // `Date` instance for the SAME calendar month on every run, which
  // `Object.is` always treats as changed, triggering a re-render, a new
  // `months` reference, another effect run, another "changed" Date... an
  // unbounded loop (reproduced and confirmed via React's own "Maximum
  // update depth exceeded" error before this guard was added).
  const visibleMonthAnchorRef = useRef(initialDay);

  // The header portal's target node. CalendarHeader and this component are
  // SIBLINGS under CalendarViews.tsx, both committed to the DOM in the same
  // pass, so by the time the effect below runs the node reliably already
  // exists — same ordering CalendarHeader's own comment on
  // SCHEDULE_TITLE_SLOT_ID relies on. Looked up inside the scroll-driven
  // effect just below rather than a standalone effect of its own: an effect
  // that does nothing but a direct DOM read + setState, with no subscription
  // of any kind, is exactly the "cascading render" shape
  // react-hooks/set-state-in-effect exists to catch — RecipeList.tsx's own
  // `railTop` measurement establishes the same fix (fold the direct read
  // into an effect that ALSO subscribes to something real), rather than
  // suppressing the rule.
  const [titleSlot, setTitleSlot] = useState<HTMLElement | null>(null);

  // mission-16/C7 (Vision's BLOCKER) — this used to reuse the "today
  // visible" observer's own instrument: an IntersectionObserver whose
  // `rootMargin` (`-227px 0px -80% 0px`) carved out a thin band meant to
  // start exactly where content clears both pinned bars. That band is
  // INVERTED — its top edge sits below its bottom edge — on any viewport
  // shorter than 1135px (227px is already more than 20% of a 375-tall
  // phone screen), which makes it empty. Chrome silently clamps an
  // inverted rect to a zero-height line and still reports edge-adjacent
  // intersections, so it looked like it worked; WebKit's
  // `edgeInclusiveIntersect` does not clamp, and never intersects at all —
  // which is why the label froze on one month for the whole session on
  // every iPhone and the installed PWA (measured on Playwright WebKit
  // 26.6: 65 scroll steps, 0 label changes). A narrower band would only
  // trade this bug for the same class at some OTHER viewport; there is no
  // `rootMargin` that is provably non-empty at every phone height.
  //
  // The fix drops the observer entirely and reads the DOM directly on
  // scroll: of the 5-12 month `<section>`s actually rendered, which one's
  // top has scrolled up past `revealLineY` (the real bottom edge of the
  // two stacked pinned bars) — the LAST one for which that's true, since
  // months render in chronological/DOM order and a `<section>` further
  // down the list can never start higher on screen than one before it.
  // `getBoundingClientRect()` on a handful of nodes per scroll/resize is
  // not a performance concern at this scale; batched behind
  // `requestAnimationFrame` so a fast scroll can't queue the read more
  // than once per frame.
  useLayoutEffect(() => {
    // Named, rather than an inline `setTitleSlot(...)` statement, for the
    // same reason RecipeList.tsx's own `measure()` is: a bare direct
    // setState call in an effect's own immediate body is what
    // react-hooks/set-state-in-effect flags — nesting it one level down,
    // even when (as here) it's still invoked synchronously right away,
    // reads as "seed an initial value" rather than "an effect whose only
    // job is calling setState", which is the actual pattern being flagged.
    function syncTitleSlot() {
      setTitleSlot(document.getElementById(SCHEDULE_TITLE_SLOT_ID));
    }
    syncTitleSlot();

    if (months.length === 0) return;

    const revealLineY = APP_HEADER_HEIGHT_PX + SCHEDULE_HEADER_BAR_HEIGHT_PX;
    let framePending = false;

    function syncVisibleMonth() {
      framePending = false;
      let current: Date | null = null;
      for (const month of months) {
        const node = monthRefs.current.get(month.monthStart.getTime());
        if (!node) continue;
        if (node.getBoundingClientRect().top > revealLineY) break;
        current = month.monthStart;
      }
      // A `null` result means the reader hasn't scrolled far enough for
      // ANY month's top to have cleared the reveal line yet (e.g. still at
      // the very start of the list) — leave `visibleMonthAnchor` at
      // whatever it already is (seeded to `initialDay`'s own month) rather
      // than clearing it, matching this state's own established rule that
      // it only ever moves once the reader genuinely scrolls into a
      // different month.
      //
      // The `.getTime()` comparison against the ref (not the `current`
      // Date's own identity) is what makes this idempotent — see
      // `visibleMonthAnchorRef`'s own comment above for the infinite-loop
      // this guards against.
      if (current && current.getTime() !== visibleMonthAnchorRef.current.getTime()) {
        visibleMonthAnchorRef.current = current;
        setVisibleMonthAnchor(current);
      }
    }

    function onScrollOrResize() {
      if (framePending) return;
      framePending = true;
      requestAnimationFrame(syncVisibleMonth);
    }

    syncVisibleMonth();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [months]);

  useImperativeHandle(ref, () => ({
    scrollToToday: () => {
      if (today === null) return false;
      const node = dayRefs.current.get(startOfDay(today).getTime());
      if (!node) return false;
      node.scrollIntoView({ behavior: "instant", block: "start" });
      return true;
    },
  }));

  function renderMonth(month: ScheduleRenderMonth) {
    return (
      <section
        key={month.monthStart.getTime()}
        ref={(element) => {
          if (element) monthRefs.current.set(month.monthStart.getTime(), element);
          else monthRefs.current.delete(month.monthStart.getTime());
        }}
      >
        {/* mission-16/C4 (D2): no longer sticky. Before this contract's
            globals.css fix, `sticky` here was already inert app-wide (see
            that file's own comment), so this rendered as a plain in-flow
            divider anyway — now that sticky positioning actually works,
            leaving this sticky too would show the month name TWICE at
            once, stacked under the pinned CalendarHeader's own now-live
            title (which this component feeds via a portal — see
            visibleMonthAnchor, above).

            mission-16/C7 (Strange's BLOCKER) — a PLAIN, visible divider
            wasn't enough: at the very top of a month, this heading sits in
            the 0-120px landing range where the pinned bar's own title
            (same month, same words) is ALSO on screen, so the same name
            rendered twice at once — exactly what D2 says must never
            happen, just reached from a range C4's own check didn't cover.
            `sr-only`, not `hidden` — `hidden` is `display:none`, which
            STRIPS an element from the accessibility tree (mission-8/K2's
            own finding: Month at phone width exposed 0 event names that
            way). `sr-only` keeps this month heading in document order for
            a screen reader — the same role the week-range divider below
            already plays for structure inside a month — while the pinned
            bar carries the only VISIBLE label. */}
        <h2 className="sr-only">{formatMonthTitle(month.monthStart)}</h2>
        <div className="flex flex-col gap-4 py-2">
          {groupByWeek(month.days).map((week) => (
            <div key={week.weekStart.getTime()}>
              <p className="mb-2 px-1 text-xs font-medium text-muted">
                {formatWeekRange(week.weekStart)}
              </p>
              <div className="flex flex-col gap-2">
                {week.days.map((row) => (
                  <div
                    key={row.day.getTime()}
                    ref={(element) => {
                      if (element) dayRefs.current.set(row.day.getTime(), element);
                      else dayRefs.current.delete(row.day.getTime());
                    }}
                    // mission-16/C7 (Captain by reading, Strange by
                    // measuring — BLOCKER) — `scroll-mt-16` (64px) is a
                    // leftover from CV3, when this app's own global header
                    // was still inert (see globals.css's C4 comment) and
                    // nothing on the page was pinned at all. C4 pinned 227px
                    // of real chrome above this list (the app header,
                    // APP_HEADER_HEIGHT_PX, plus this file's own Schedule bar,
                    // SCHEDULE_HEADER_BAR_HEIGHT_PX) without updating this
                    // number, so both `scrollIntoView` call sites (the
                    // initial/deep-link effect above, and `scrollToToday`'s
                    // imperative handle) landed the target day's TOP at 64px
                    // — fully behind the bars (Strange measured `visiblePx:
                    // 0`, `elementFromPoint` returning the app header, 3/3).
                    // A constant sum, not a runtime measurement, because
                    // ScheduleView only ever renders while CalendarHeader's
                    // Schedule bar is pinned — CalendarViews.tsx mounts this
                    // component exclusively inside `view === "schedule"`,
                    // and CalendarHeader.tsx's own `pinned` flag is exactly
                    // that same condition — so there is no render of this
                    // row where the two constants imported above don't
                    // already describe the real, current chrome height.
                    style={{ scrollMarginTop: APP_HEADER_HEIGHT_PX + SCHEDULE_HEADER_BAR_HEIGHT_PX }}
                  >
                    {today !== null &&
                    isSameDay(row.day, today) &&
                    row.events.length === 0 &&
                    row.tasks.length === 0 ? (
                      <TodayEmptyRow day={row.day} />
                    ) : today === null ? (
                      <DaySection loading />
                    ) : (
                      <DaySection
                        day={row.day}
                        today={today}
                        events={row.events}
                        tasks={row.tasks}
                        onOpenEvent={(event, day) => setSelected({ event, day })}
                        onOpenTask={(task) => setSelectedTask(task)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <div>
      {today === null ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 7 }, (_, index) => (
            <DaySection key={index} loading />
          ))}
        </div>
      ) : (
        <>
          {/* Sentinels sit OUTSIDE the loaded content, not between rows —
              rootMargin: "100% 0px" (set in the hook) means a fetch starts
              a full viewport before the sentinel is literally on screen,
              so the next chunk is usually ready before the reader reaches
              the edge. */}
          <div ref={topSentinelRef} aria-hidden="true" />
          {loadingBackward && (
            <div className="flex flex-col gap-2 pb-2">
              <SkeletonBlock className="h-[46px] w-full" />
            </div>
          )}
          {/* Only shown once a direction has genuinely stopped (D2/the
              hook's own applyChunkResult) — never while it's merely
              between fetches, which is what `loadingBackward` above
              already covers separately. */}
          {!hasMoreBackward && !loadingBackward && (
            <p className="pb-2 text-center text-xs text-muted">That&apos;s as far back as this loads.</p>
          )}

          {months.map(renderMonth)}

          {!hasMoreForward && !loadingForward && (
            <p className="pt-2 text-center text-xs text-muted">That&apos;s as far ahead as this loads.</p>
          )}
          {loadingForward && (
            <div className="flex flex-col gap-2 pt-2">
              <SkeletonBlock className="h-[46px] w-full" />
            </div>
          )}
          <div ref={bottomSentinelRef} aria-hidden="true" />
        </>
      )}

      {selected && (
        <EventDetailSheet
          event={selected.event}
          day={selected.day}
          createdByName={selected.event.createdByName}
          canManage={canManage}
          onClose={() => setSelected(null)}
          onDeleted={() => {
            const day = selected.day;
            setSelected(null);
            // Schedule's own answer to "so router.refresh() after an edit
            // flows in" — see useScheduleWindow.ts's refreshDay for why
            // this is a targeted re-merge rather than a passive prop.
            // router.refresh() is still called too, for parity with every
            // other view (revalidates anything server-rendered elsewhere
            // on the page) even though Schedule's own list is entirely
            // client-fetched and doesn't depend on it.
            refreshDay(day);
            router.refresh();
          }}
        />
      )}

      {selectedTask && (
        <TaskDetailSheet
          task={selectedTask}
          people={people}
          canManage={canManage}
          onClose={() => setSelectedTask(null)}
          onChanged={(updated) => {
            // mission-15/C7 — the vanishing-task fix. `selectedTask` is a
            // snapshot captured when the sheet was opened (see its own
            // declaration above); an edit that MOVES the due date makes
            // that snapshot stale the instant the save succeeds. Refreshing
            // only the OLD day (what this used to do) re-fetches a chunk
            // centered on the day the task no longer lives on — the new
            // day's chunk is never touched, so the task renders on no day
            // at all until the whole view remounts.
            //
            // The fix: when `updated` carries a new dueDate (edit only —
            // mark-complete/uncomplete pass none, see TaskDetailSheet's own
            // comment), refresh the OLD day and, if it differs, the NEW
            // day too — and re-seat `selectedTask` to the updated record so
            // a SECOND edit reads the right "old day" instead of repeating
            // this same bug one move later. Both conversions go through
            // allDayInstantToLocalDay for the same UTC-midnight reason the
            // comment below already explains.
            const oldDay = allDayInstantToLocalDay(selectedTask.dueDate);
            refreshDay(oldDay);
            if (updated) {
              const newDay = allDayInstantToLocalDay(updated.dueDate);
              if (!isSameDay(newDay, oldDay)) refreshDay(newDay);
              setSelectedTask((prev) => (prev ? { ...prev, dueDate: updated.dueDate } : prev));
            }
            router.refresh();
          }}
          onDeleted={() => {
            const dueDay = allDayInstantToLocalDay(selectedTask.dueDate);
            setSelectedTask(null);
            refreshDay(dueDay);
            router.refresh();
          }}
        />
      )}

      {/* mission-16/C4 (D2) — feeds the pinned CalendarHeader's own live
          month label. `titleSlot` is null for one paint on first mount
          (see its own declaration above) and briefly again if this whole
          view unmounts — createPortal simply renders nothing until it's a
          real node, no separate loading branch needed. Matches the
          non-pinned title's own markup exactly (CalendarHeader.tsx), so
          switching in and out of Schedule shows the identical style. */}
      {titleSlot &&
        createPortal(
          <h2 className="truncate text-lg font-semibold">
            {formatMonthTitle(visibleMonthAnchor)}
          </h2>,
          titleSlot,
        )}
    </div>
  );
}
