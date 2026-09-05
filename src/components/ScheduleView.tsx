"use client";

// The Schedule view — mission-15 (CV3): one continuous list of days that
// scrolls endlessly backward and forward, today always present. See
// src/lib/useScheduleWindow.ts for the data side (windowing, merging,
// scroll anchoring); this file is rendering only.
//
// NOT wired into the Calendar branch's picker/header yet — that's C4's job
// (mission-15's own contract split). This component is fully built and
// self-contained, but nothing in the shipped UI can reach it until
// CalendarViews.tsx adds a "schedule" branch to its render switch.

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DaySection } from "./DaySection";
import { EventDetailSheet } from "./EventDetailSheet";
import { TaskDetailSheet } from "./TaskDetailSheet";
import { SkeletonBlock } from "./Skeleton";
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

export function ScheduleView({ initialDay, people, canManage }: ScheduleViewProps) {
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

  // Initial scroll to `initialDay` — instant, not smooth, matching
  // RecipeList's own established finding for anything that should land
  // immediately rather than queue a visible animation. Runs on every
  // render until the target day's ref actually exists (it may not yet —
  // still loading, or a genuinely empty non-today day that never renders a
  // row at all) and then never again. Scrolling itself never touches the
  // URL — this reads `dayRefs`/DOM only.
  useLayoutEffect(() => {
    if (hasScrolledInitially.current) return;
    const target = dayRefs.current.get(initialDayTime);
    if (!target) return;
    target.scrollIntoView({ behavior: "instant", block: "start" });
    hasScrolledInitially.current = true;
  });

  function renderMonth(month: ScheduleRenderMonth) {
    return (
      <section key={month.monthStart.getTime()}>
        {/* Sticky month header — the same construction RecipeList's own
            letter headers use (a plain-flow scroll target just below it,
            never on the sticky element itself — see that file's own
            comment on why scrollIntoView doesn't reliably scroll a
            position: sticky node). */}
        <h2 className="sticky top-16 z-10 -mx-4 bg-bg px-4 py-1.5 text-sm font-semibold uppercase tracking-wide text-muted">
          {formatMonthTitle(month.monthStart)}
        </h2>
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
                    className="scroll-mt-16"
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
    </div>
  );
}
