"use client";

// The all-day strip inside TimelineGrid.tsx's sticky header — mission-17,
// CV4, contract C6. Extracted out of TimelineGrid.tsx once that file crossed
// STRUCTURE.md's 650-line hard cap (809 total / 434 code). Captain had
// already named this exact seam BEFORE C5 landed ("63 lines for 4 props,"
// this mission's own report), measured against the `CalendarViews.tsx`
// sheets block it ruled AGAINST extracting ("62 lines for 13 props") —
// "the same line count for less than a third of the coupling." C5 then grew
// this block well past its original size (tasks and their checkbox
// vocabulary, the real "+N more" expand button and its state, the 24px
// bar), which is why the props below number more than Captain's original
// four — and made the seam more clearly its own job, not less.
//
// C5's own contract boundary did NOT allow creating a new file, so five
// all-day-strip features landed inside TimelineGrid.tsx instead, and that
// file carried a written hard-cap disclosure rather than a split. Captain's
// diagnosis from this mission's gate round is why this contract exists:
// "a must-not-touch boundary is a threshold you can satisfy by copying" — a
// boundary that forbids a new file is one you satisfy by writing a
// JUSTIFICATION instead of a SEAM. This contract takes the seam.
//
// STAYS INSIDE TimelineGrid.tsx's own sticky wrapper
// (`<div className="sticky top-0 ...">`). This component renders ONLY the
// all-day grid's own body, not the sticky positioning around it — the
// weekday header row and this strip keep stacking via ordinary flow inside
// ONE sticky element (TimelineGrid.tsx's own comment: "so there's no second
// `top` offset to compute or keep in sync with the first"). Splitting the
// sticky wrapper itself across two components would reintroduce exactly
// that problem; this file is deliberately just the grid, not the wrapper.
//
// `gridTemplateColumns` arrives as a computed STRING PROP rather than being
// re-derived here from a private copy of TimelineGrid.tsx's
// `GUTTER_WIDTH_PX` constant. The identical value has to line up across the
// weekday header row, this strip, and the hour rail below it — all three
// sit in the same CSS grid columns — and Captain's OWN finding earlier in
// this same mission's gate round was that a forbidden-to-touch boundary is
// exactly what turns a shared magic number into two independently-editable
// copies that can silently drift (the old bottom nav's real height, `65`,
// against a stale private copy that said `64`; that nav is gone now). Passing the one string
// TimelineGrid.tsx already computes is the same fix applied here, instead
// of repeated.
//
// D4 still holds: the timeline has two callers of the EXISTING
// `monthLayout.assignLanes`, never a second packer: this file (the layout) and
// `allDayHiddenCount` in src/lib/timelineAllDay.ts (TimelineGrid's chevron
// test). Both build their items through `timelineAllDayItems` and cap at
// `TIMELINE_ALL_DAY_LANES`, so they cannot disagree. `TimelineEvent` (timelineLayout.ts) and `MonthLayoutEvent`
// (monthLayout.ts) are structurally identical `{id, startAt, endAt, allDay}`
// shapes for exactly this reason, so `allDayRow` passes straight through
// with no conversion step.
//
// Mission 73: the strip shows TIMELINE_ALL_DAY_LANES lanes and a count button
// ("+2" / "2 more") under each busy column; the expand state moved UP to
// TimelineGrid (one state for the whole visible page, so the chevron in the
// gutter corner and these buttons agree). The old "− Show less" row and the
// "+N more" container-query tiers are gone: the chevron closes, and the count
// text is short enough ("+2") that it no longer needs them. The item-building
// code now lives once, in `timelineAllDayItems` (src/lib/timelineAllDay.ts).
// The event and task bars moved to ./TimelineAllDayBar.tsx. Row heights and
// pill text are rem times `--zoom-text-scale` instead of 24px, so Text size
// now grows the row too.

import { useMemo, type ReactNode } from "react";
import { HabitDayPill } from "./HabitDayPill";
import { AllDayEventBar, AllDayTaskBar, ALL_DAY_ROW_HEIGHT } from "./TimelineAllDayBar";
import { assignLanes } from "@/lib/monthLayout";
import { addDays } from "@/lib/mealPlanDates";
import { daysEventCovers } from "@/lib/calendarDates";
import { TIMELINE_ALL_DAY_LANES, timelineAllDayItems } from "@/lib/timelineAllDay";
import { allDayMoreAriaLabel, allDayMoreLabel } from "@/lib/calendarViewVocabulary";
import type { TimelineEvent } from "@/lib/timelineLayout";
import type { CalendarEventView, CalendarHabitDayView, CalendarTaskView } from "@/lib/types";

type TimelineAllDayStripProps = {
  columnDays: Date[];
  /** The all-day half of TimelineGrid.tsx's own `partitionForTimeline` call
   * — that file still owns the call (its OTHER half, `timed`, feeds the
   * hour rail this component never renders), so this arrives as a prop
   * rather than being re-derived here: one partition, two consumers, no
   * risk of the two halves disagreeing about which events are all-day. */
  allDayRow: TimelineEvent[];
  /** The same `tasks` prop CalendarViews.tsx threads to every view — this
   * component decides which touch `columnDays` itself, via `assignLanes`,
   * exactly like MonthGrid.tsx's own row already does for Month. */
  tasks: CalendarTaskView[];
  /** The viewer's planned habit days (decision 146): all-day items that open the habit's page. */
  habitDays: CalendarHabitDayView[];
  /** Looked up by id for every non-task span. Kept in the CALLER
   * (TimelineGrid.tsx) rather than built here, because that file's own hour
   * rail needs the identical map for its timed blocks — one map, two
   * readers, never two builds of the same lookup. */
  eventById: Map<string, CalendarEventView>;
  onOpenEvent: (event: CalendarEventView, day: Date) => void;
  onOpenTask: (task: CalendarTaskView, day: Date) => void;
  /** Computed once in TimelineGrid.tsx and reused by its weekday header row
   * and hour rail too — see this file's own header for why it arrives as a
   * prop rather than a private re-derivation of `GUTTER_WIDTH_PX`. */
  gridTemplateColumns: string;
  /** Day view's weekday and date (mission 67), drawn in the gutter cell and
   * spanning every row, with the all-day lanes beside it. Left out for 3 Day
   * and Week, whose labels sit in their own row above. The strip renders when
   * it has lanes OR a corner. */
  corner?: ReactNode;
  /** Every lane shows when true; otherwise TIMELINE_ALL_DAY_LANES. Owned by
   * TimelineGrid (neighbour pages are always collapsed). */
  expanded?: boolean;
  /** A count button was tapped: open every lane. */
  onExpand?: () => void;
};

export function TimelineAllDayStrip({
  columnDays,
  allDayRow,
  tasks,
  habitDays,
  eventById,
  onOpenEvent,
  onOpenTask,
  gridTemplateColumns,
  corner,
  expanded = false,
  onExpand,
}: TimelineAllDayStripProps) {
  // mission-17/C5 — tasks join the all-day row (reshaped by
  // `timelineAllDayItems`). Looked up in a SEPARATE map (`taskById`) from
  // `eventById`, checked FIRST in the render loop below, so a task id is
  // never even looked up against `eventById` — belt-and-braces on top of the
  // fact that the two id spaces can't actually collide (separate cuid-keyed
  // tables).
  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  // Planned habit days (decision 146) pack the same way, as single-day spans.
  const habitDayById = useMemo(() => new Map(habitDays.map((item) => [item.id, item])), [habitDays]);
  const allDayItems = useMemo(
    () => timelineAllDayItems(allDayRow, tasks, habitDays),
    [allDayRow, tasks, habitDays],
  );

  const { spans: allDaySpans, overflowByDay } = useMemo(
    () => assignLanes(columnDays, allDayItems, expanded ? Number.POSITIVE_INFINITY : TIMELINE_ALL_DAY_LANES),
    [columnDays, allDayItems, expanded],
  );
  const maxAllDayLane = allDaySpans.reduce((max, span) => Math.max(max, span.lane), -1);

  // Only rendered with real height when there's something to show
  // (mission-8/K2's own "an empty state must not claim space a real one
  // would" discipline) — an empty grid with zero rows collapses to nothing.
  // All hooks above run unconditionally on every render (Rules of Hooks)
  // before this early return.
  if (maxAllDayLane < 0 && !corner) return null;

  // Rows the corner spans: one per lane, plus the count row when it is
  // drawn. At least one, so a corner alone still has a row.
  const hasMoreRow = maxAllDayLane >= 0 && !expanded && overflowByDay.some((count) => count > 0);
  const cornerRows = Math.max(1, maxAllDayLane + 1 + (hasMoreRow ? 1 : 0));

  const dayBeforeSet = addDays(columnDays[0], -1);
  const dayAfterSet = addDays(columnDays[columnDays.length - 1], 1);

  return (
    <div
      className={`grid gap-0.5 px-1 pb-1 ${corner ? "items-start" : ""}`}
      // mission-17/C5: raised from 18px to 24px, matching the timed grid's
      // own MIN_BLOCK_MINUTES floor — Strange's ruling on the 24px timed
      // block explicitly does NOT cover this row too: a timed block's 24px
      // is defended by its real duration (MIN_BLOCK_MINUTES x
      // the default 48px hour), and this bar has no duration to be faithful to at
      // all — `18px` was a free constant, not arithmetic, so it gets no
      // such defense and is raised to match rather than kept shorter for
      // no reason. Mission 73: that 24px is now `1.5rem` times the zoom text
      // scale (ALL_DAY_ROW_HEIGHT).
      // With a corner the rows may grow to fit its label (Largest text);
      // without one they stay a fixed ALL_DAY_ROW_HEIGHT as before.
      // With a corner, `items-start` on the grid keeps every bar (event,
      // task, habit pill) at its row height at the top of its row instead of
      // stretching to the corner's height.
      style={{
        gridTemplateColumns,
        gridAutoRows: corner ? `minmax(${ALL_DAY_ROW_HEIGHT}, auto)` : ALL_DAY_ROW_HEIGHT,
      }}
    >
      {corner ? (
        <div className="py-1" style={{ gridColumn: 1, gridRow: `1 / span ${cornerRows}` }}>
          {corner}
        </div>
      ) : (
        <span aria-hidden="true" />
      )}
      {allDaySpans.map((span) => {
        const gridColumn = `${span.startCol + 2} / ${span.endCol + 3}`;
        const gridRow = span.lane + 1;
        // mission-17/C5 — tasks first, and ONLY against `taskById`: see
        // the comment above for why a task id is never even looked up
        // against `eventById`.
        const habitDay = habitDayById.get(span.event.id);
        if (habitDay) {
          return (
            <HabitDayPill key={span.event.id} habitDay={habitDay} gridColumn={gridColumn} gridRow={gridRow} />
          );
        }
        const task = taskById.get(span.event.id);
        if (task) {
          return (
            <AllDayTaskBar
              key={span.event.id}
              task={task}
              gridColumn={gridColumn}
              gridRow={gridRow}
              hasCorner={!!corner}
              onOpen={() => onOpenTask(task, columnDays[span.startCol])}
            />
          );
        }

        const event = eventById.get(span.event.id);
        if (!event) return null; // defensive; every span's id came from `events`/`tasks`
        const continuesBefore =
          daysEventCovers(event.startAt, event.endAt, event.allDay, [dayBeforeSet]).length > 0;
        const continuesAfter =
          daysEventCovers(event.startAt, event.endAt, event.allDay, [dayAfterSet]).length > 0;
        // The representative day for this bar's tap target — the first
        // column it actually touches in THIS render, not necessarily the
        // event's true start (a bar continuing from before `columnDays[0]`
        // still needs a real day to open the detail sheet against).
        const representativeDay = columnDays[span.startCol];
        return (
          <AllDayEventBar
            key={span.event.id}
            event={event}
            gridColumn={gridColumn}
            gridRow={gridRow}
            hasCorner={!!corner}
            continuesBefore={continuesBefore}
            continuesAfter={continuesAfter}
            onOpen={() => onOpenEvent(event, representativeDay)}
          />
        );
      })}
      {/* The count under each column with hidden items ("+2" in 3 Day and
          Week, "2 more" in Day). Its accessible name always says what it
          does, whatever the visible text. `min-w-0 overflow-hidden` keeps the
          ink inside a narrow Week column. One tap opens every column. */}
      {!expanded &&
        columnDays.map((day, col) => {
          const count = overflowByDay[col];
          if (count <= 0) return null;
          return (
            <button
              key={`overflow-${day.getTime()}`}
              type="button"
              onClick={onExpand}
              aria-label={allDayMoreAriaLabel(count)}
              className="min-w-0 overflow-hidden whitespace-nowrap text-left text-[0.6875rem] font-semibold text-muted"
              style={{ gridColumn: col + 2, gridRow: maxAllDayLane + 2, minHeight: ALL_DAY_ROW_HEIGHT }}
            >
              {allDayMoreLabel(count, columnDays.length === 1)}
            </button>
          );
        })}
    </div>
  );
}
