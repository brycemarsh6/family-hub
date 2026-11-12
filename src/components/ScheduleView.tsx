"use client";

// The Schedule view — mission-15 (CV3): one continuous list of days that
// scrolls endlessly backward and forward, today always present. See
// src/lib/useScheduleWindow.ts for the data side (windowing, merging,
// scroll anchoring); this file is rendering only.

import { useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type Ref } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DaySection } from "./DaySection";
import { EventDetailSheet } from "./EventDetailSheet";
import { TaskDetailSheet } from "./TaskDetailSheet";
import { SkeletonBlock } from "./Skeleton";
import { SCHEDULE_TITLE_SLOT_ID, SCHEDULE_HEADER_BAR_HEIGHT_REM } from "./CalendarHeader";
import { useHamburgerInsetPx } from "@/lib/appChrome";
import {
  useScheduleWindow,
  type ScheduleFetchers,
} from "@/lib/useScheduleWindow";
import { useScheduleMonthTitle } from "@/lib/useScheduleMonthTitle";
import { useScheduleDayInView } from "@/lib/useScheduleDayInView";
import { useToday } from "@/lib/useToday";
import { allDayInstantToLocalDay } from "@/lib/calendarDates";
// mission-15/C5: this component is the boundary that's ALLOWED to know
// which Server Actions back the Schedule view — useScheduleWindow.ts no
// longer imports either of these itself (see that file's own header for
// why: a lib module reaching into app/ was a real STRUCTURE.md violation).
import { fetchCalendarEvents, fetchHabitDays } from "@/app/actions/calendar";
import { fetchTasks } from "@/app/actions/tasks";
import { useScheduleHabitDays } from "@/lib/useScheduleHabitDays";
import type { ScheduleRenderDayWithHabits, ScheduleRenderMonthWithHabits } from "@/lib/scheduleHabitDays";
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
  /** mission-46/C3: scrolls the first loaded row on or after `day` (an empty
   * day has no row) under the pinned bar; `false` outside the loaded window. */
  scrollToDay: (day: Date) => boolean;
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
  /** The Tablet login (`tabletMayCompleteAnyTask`): TaskDetailSheet draws Mark complete for it. */
  isTablet: boolean;
  /** Mission 74: a task was just marked complete; shows the bar. `refresh` redraws after its Undo. */
  onTaskCompleted: (taskId: string, refresh: () => void) => void;
  /** The optimistic task ticks (taskDoneOverrides.ts), applied to each day's tasks as drawn. */
  applyDone: (tasks: CalendarTaskView[]) => CalendarTaskView[];
  /** Any other change to a task drops its optimistic tick before the refresh. */
  clearTaskDone: (taskId: string) => void;
  /** Hands the loaded rows' tasks up so an override the server's rows agree with drops (also outside the page's window). */
  pruneTaskDoneWith: (tasks: CalendarTaskView[]) => void;
  /**
   * mission-15/C8 (B1) — reports whether TODAY's own row is genuinely on
   * screen right now. CalendarViews.tsx forwards this straight into the
   * header's Today circle `isCurrentPeriod`, for this one view only — see
   * this file's own tracking effect, below, for how it's determined, and
   * calendarViewConfig.ts's corrected comment for why the OLD anchor-based
   * check was wrong.
   */
  onTodayVisibleChange: (visible: boolean) => void;
  /** Mission 72: the day in view (start-of-day time), for the month panel's ring. */
  onDayInViewChange: (day: number) => void;
  /** Mission 72: read the rows for it only while the month panel is open. */
  trackDayInView: boolean;
  /** Mission 72: height of a stacked open month panel stuck under the chrome (0 when none); rows reveal below it. */
  revealExtraPx: number;
  ref?: Ref<ScheduleViewHandle>;
};

/** One month's days, grouped into Sunday-start week sections — a
 * presentation-only concern, not part of useScheduleWindow.ts's pure data
 * layer, so it lives here rather than there. `days` arrives already in
 * chronological order (scheduleRows' own walk), so this is a single
 * linear pass, not a sort. */
type ScheduleWeekGroup = { weekStart: Date; days: ScheduleRenderDayWithHabits[] };

function groupByWeek(days: ScheduleRenderDayWithHabits[]): ScheduleWeekGroup[] {
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

/** The chrome Schedule pins above its list: inset + bar. One source for the scroll margins and the month panel's sticky top (mission 72). */
export const scheduleChromeHeightPx = (insetPx: number, rootPx: number) => insetPx + SCHEDULE_HEADER_BAR_HEIGHT_REM * rootPx;
export function ScheduleView({
  initialDay,
  people,
  canManage,
  isTablet,
  onTaskCompleted,
  applyDone,
  clearTaskDone,
  pruneTaskDoneWith,
  onTodayVisibleChange,
  onDayInViewChange,
  trackDayInView,
  revealExtraPx,
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
    months: loadedMonths,
    windowStart,
    windowEnd,
    hasMoreBackward,
    hasMoreForward,
    loadingBackward,
    loadingForward,
    topSentinelRef,
    bottomSentinelRef,
    refreshDay,
  } = useScheduleWindow(initialDay, today, fetchers);
  // Planned habit days (decision 146), folded into the loaded months.
  const { months, habitDaysLoaded, habitDaysFailed } = useScheduleHabitDays(loadedMonths, windowStart, windowEnd, fetchHabitDays);

  // Mission 74 (F3): the rows are the server's answer for these days; an override they agree with drops.
  // `months` gets a new identity often, but the prune returns the same map when nothing drops: no loop.
  const loadedTasks = useMemo(() => months.flatMap((m) => m.days.flatMap((d) => d.tasks)), [months]);
  useEffect(() => pruneTaskDoneWith(loadedTasks), [loadedTasks, pruneTaskDoneWith]);

  // Until the habit days load (or fail, which shows its own line), today's
  // row cannot be called empty.
  const habitDaysPending = !habitDaysLoaded && !habitDaysFailed;
  const isEmptyToday = (row: ScheduleRenderDayWithHabits) =>
    today !== null &&
    isSameDay(row.day, today) &&
    row.events.length === 0 &&
    row.tasks.length === 0 &&
    row.habitDays.length === 0;

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

  // mission-17/C1 (Captain's rider) — named once rather than recomputed at
  // each of the three places below (this file's own initial-scroll effect,
  // useScheduleMonthTitle's offset argument, and every day row's own
  // scrollMarginTop): the chrome this view has pinned above it is the
  // Schedule bar, measured from the screen's top edge. The hook measures
  // the hamburger's bottom edge (safe-area inset + the 3.5rem row, which
  // follows the Text size), so swapping that row for the bar's own height
  // leaves inset + bar (`scheduleChromeHeightPx`: 86px bar at 16, 129px at Largest).
  const { insetPx, rootPx } = useHamburgerInsetPx();
  const scheduleChromeHeight = scheduleChromeHeightPx(insetPx, rootPx);
  // Mission 72: the line under everything pinned above the list: the chrome, plus a stacked open month panel.
  const revealLine = scheduleChromeHeight + revealExtraPx;

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
  //
  // mission-16/C10 (Vision, correcting this mission's own earlier record)
  // — `scrollIntoView` can land CLAMPED on this route: measured 12/12, the
  // target stopped at the document's max `scrollTop` rather than at the
  // reveal margin, because the initial commit that first renders `target`
  // can happen BEFORE the forward chunk that gives the page enough height
  // to actually place it there. `scrollToToday` (the imperative handle
  // below) never hits this — by the time a reader can tap Today, the
  // surrounding content has long since loaded. Detected by checking BOTH
  // that the landing missed the margin AND that the scroller is pinned to
  // its own maximum — top alone can't tell "landed short because clamped"
  // from "landed short for some other reason," and only the clamped case
  // should be retried.
  useLayoutEffect(() => {
    if (hasScrolledInitially.current) return;
    const target = dayRefs.current.get(initialDayTime);
    if (!target) return;
    target.scrollIntoView({ behavior: "instant", block: "start" });

    const scroller = document.scrollingElement;
    const landedShort = target.getBoundingClientRect().top > revealLine + 1;
    const pinnedToScrollMax =
      scroller !== null && scroller.scrollTop >= scroller.scrollHeight - scroller.clientHeight - 1;

    // Bounded: a clamped landing leaves the flag false, which re-runs this
    // SAME effect on the next render a forward chunk commit causes (no
    // separate timer or retry loop) — either that chunk gives the page
    // enough height to land exactly (landedShort flips false) or, once
    // `hasMoreForward` goes false, there's nothing left to wait for and
    // the flag is forced true regardless of where it landed, so this can
    // never re-arm itself indefinitely.
    if (landedShort && pinnedToScrollMax && hasMoreForward) return;
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
  // mission-15/C10 — a bare `threshold: 0` with `rootMargin: "0px"`: with
  // the bottom tab bar gone, the layout viewport is the visible area.
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
      { threshold: 0, rootMargin: `-${revealLine}px 0px 0px 0px` },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [today, months, onTodayVisibleChange, revealLine]);

  // mission-16/C9 — "which month is topmost" and the header portal it feeds
  // moved out to src/lib/useScheduleMonthTitle.ts (Captain's own named seam:
  // this file hit 620/650, the mechanical hard cap, after C7 added the
  // render-loop guard below). `revealLineY`/`titleSlotId` are computed HERE
  // and passed in rather than the hook importing CalendarHeader's constants
  // itself — this component stays the one boundary "ALLOWED to know" which
  // component owns them (see useScheduleWindow.ts's own C5 header for why a
  // src/lib/ module reaching into src/components/ would be a real
  // STRUCTURE.md violation). The render-loop guard from C7 — `useToday()`
  // returns a fresh `Date` every render, so `months` gets a new reference on
  // effectively every render, and only a `.getTime()`-compared ref (never
  // `Date` identity) stops that from looping forever — moved WITH it,
  // unchanged; see the hook's own header for the full explanation.
  const { monthSectionRef, portal } = useScheduleMonthTitle(
    months,
    initialDay,
    scheduleChromeHeight,
    SCHEDULE_TITLE_SLOT_ID,
  );

  // Mission 72: the day in view feeds the panel's ring (rows read only while open; +2 absorbs rounding).
  const dayInViewTime = useScheduleDayInView(dayRefs, months, revealLine + 2, trackDayInView, initialDay);
  useEffect(() => onDayInViewChange(dayInViewTime), [dayInViewTime, onDayInViewChange]);

  function scrollToDay(day: Date): boolean {
    if (day < windowStart || day >= windowEnd) return false;
    const time = Math.min(...[...dayRefs.current.keys()].filter((t) => t >= startOfDay(day).getTime()));
    const target = dayRefs.current.get(time);
    if (!target) return false;
    target.scrollIntoView({ behavior: "instant", block: "start" });
    return true;
  }

  useImperativeHandle(ref, () => ({
    scrollToToday: () => {
      if (today === null) return false;
      const node = dayRefs.current.get(startOfDay(today).getTime());
      if (!node) return false;
      node.scrollIntoView({ behavior: "instant", block: "start" });
      return true;
    },
    scrollToDay,
  }));

  function renderMonth(month: ScheduleRenderMonthWithHabits) {
    return (
      <section
        key={month.monthStart.getTime()}
        ref={monthSectionRef(month.monthStart)}
      >
        {/* mission-16/C4 (D2): no longer sticky. Before this contract's
            globals.css fix, `sticky` here was already inert app-wide (see
            that file's own comment), so this rendered as a plain in-flow
            divider anyway — now that sticky positioning actually works,
            leaving this sticky too would show the month name TWICE at
            once, stacked under the pinned CalendarHeader's own now-live
            title (which this component feeds via a portal — see
            useScheduleMonthTitle.ts, mission-16/C9).

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
                    // mission-16/C7 (BLOCKER) — the old `scroll-mt-16` (64px)
                    // landed a scrolled-to day's top behind the pinned
                    // chrome (Strange measured `visiblePx: 0`). Both
                    // `scrollIntoView` call sites (the initial/deep-link
                    // effect above, and `scrollToToday`'s imperative handle)
                    // now clear `scheduleChromeHeight`, named once above.
                    // This view only renders while CalendarHeader's
                    // Schedule bar is pinned (both read `VIEW_CONFIG`), so
                    // that number always describes the real chrome.
                    style={{ scrollMarginTop: revealLine }}
                  >
                    {isEmptyToday(row) ? (
                      // Holds off until the habit days arrive: an empty today row
                      // may only be empty because they have not loaded yet.
                      habitDaysPending ? <DaySection loading /> : <TodayEmptyRow day={row.day} />
                    ) : today === null ? (
                      <DaySection loading />
                    ) : (
                      <DaySection
                        day={row.day}
                        today={today}
                        events={row.events}
                        tasks={applyDone(row.tasks)}
                        habitDays={row.habitDays}
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

          {habitDaysFailed && (
            <p role="alert" className="px-1 pb-2 text-sm text-warn">
              Couldn&apos;t load your planned habit days.
            </p>
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
          isTablet={isTablet}
          onClose={() => setSelectedTask(null)}
          onCompleted={() => {
            // Mission 74: close, redraw the task's day and show the bar; its
            // Undo redraws the same way.
            const dueDay = allDayInstantToLocalDay(selectedTask.dueDate);
            const refresh = () => {
              refreshDay(dueDay);
              router.refresh();
            };
            setSelectedTask(null);
            refresh();
            onTaskCompleted(selectedTask.id, refresh);
          }}
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
            clearTaskDone(selectedTask.id);
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
            clearTaskDone(selectedTask.id);
            const dueDay = allDayInstantToLocalDay(selectedTask.dueDate);
            setSelectedTask(null);
            refreshDay(dueDay);
            router.refresh();
          }}
        />
      )}

      {/* mission-16/C9 — feeds the pinned CalendarHeader's own live month
          label; see useScheduleMonthTitle.ts's own header for the full
          design. `portal` is `null` for one paint on first mount and
          briefly again if this whole view unmounts — nothing renders until
          it's a real node, no separate loading branch needed here. */}
      {portal}
    </div>
  );
}
