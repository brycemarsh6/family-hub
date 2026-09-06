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
// copies that can silently drift (HubNav.tsx's real bottom-nav height, `65`,
// against a stale private copy that said `64`). Passing the one string
// TimelineGrid.tsx already computes is the same fix applied here, instead
// of repeated.
//
// D4 still holds, one call site removed: this file is now the ONLY place
// that calls `monthLayout.assignLanes` for the timeline views — the
// EXISTING packer TimelineGrid.tsx used before this extraction, never a
// second one. `TimelineEvent` (timelineLayout.ts) and `MonthLayoutEvent`
// (monthLayout.ts) are structurally identical `{id, startAt, endAt, allDay}`
// shapes for exactly this reason, so `allDayRow` passes straight through
// with no conversion step.

import { useMemo, useState } from "react";
import { assignLanes, type MonthLayoutEvent } from "@/lib/monthLayout";
import { addDays } from "@/lib/mealPlanDates";
import {
  allDayInstantToLocalDay,
  daysEventCovers,
  localDayToAllDayInstant,
} from "@/lib/calendarDates";
import { avatarColorHex } from "@/lib/constants";
import { bandedBackground } from "@/lib/color";
import type { TimelineEvent } from "@/lib/timelineLayout";
import type { CalendarEventView, CalendarTaskView } from "@/lib/types";

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
};

export function TimelineAllDayStrip({
  columnDays,
  allDayRow,
  tasks,
  eventById,
  onOpenEvent,
  onOpenTask,
  gridTemplateColumns,
}: TimelineAllDayStripProps) {
  const columnDaysKey = columnDays.map((day) => day.getTime()).join(",");

  // mission-17/C5 — tasks join the all-day row, reshaped into the same
  // `{id, startAt, endAt: +1 day, allDay: true}` layout shape
  // MonthGrid.tsx's own `taskAsMonthEvent` already builds for Month's
  // identical row (D1/D4: no second packer, no second reshape convention
  // either). `startAt` is `task.dueDate` directly — that field IS already
  // the due day's UTC-midnight "all-day instant" (Task.dueDate's own schema
  // comment), so no re-derivation is needed there; `endAt` is the day
  // AFTER's own midnight instant, the same EXCLUSIVE end every other
  // all-day span in this app uses (`daysEventCovers`/`eventDaySpan` both
  // expect it). Kept in a SEPARATE map (`taskById`) from `eventById`,
  // checked FIRST in the render loop below, so a task id is never even
  // looked up against `eventById` — belt-and-braces on top of the fact that
  // the two id spaces can't actually collide (separate cuid-keyed tables).
  const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks]);
  const taskLayoutEvents: MonthLayoutEvent[] = useMemo(
    () =>
      tasks.map((task) => ({
        id: task.id,
        startAt: task.dueDate,
        endAt: localDayToAllDayInstant(addDays(allDayInstantToLocalDay(task.dueDate), 1)),
        allDay: true,
      })),
    [tasks],
  );
  const allDayItems = useMemo(
    () => [...allDayRow, ...taskLayoutEvents],
    [allDayRow, taskLayoutEvents],
  );

  // "+N more" used to be a dead end (see TimelineGrid.tsx's own header for
  // the circular dead-end Strange traced) — tapping it now expands the
  // strip to every lane instead of capping at 3, via `assignLanes`'s own
  // `visibleLanes` argument (monthLayout.ts). Reset whenever the column set
  // changes (paging to a new day/week) so a family member who expanded
  // Tuesday doesn't find Wednesday pre-expanded too.
  //
  // Reset by ADJUSTING STATE DURING RENDER (React's own documented pattern
  // for "reset some state when a prop changes"), not inside a `useEffect` —
  // an effect body calling `setState` unconditionally on every dependency
  // change is exactly what `react-hooks/set-state-in-effect` exists to
  // flag: it costs an extra commit-then-recommit render cycle whenever the
  // reset actually needs to fire. Keying the stored flag to the column set
  // it was computed for means a stale flag from the PREVIOUS column set is
  // detected and corrected in the same render pass, before anything paints.
  const [allDayExpandedFor, setAllDayExpandedFor] = useState({
    key: columnDaysKey,
    expanded: false,
  });
  if (allDayExpandedFor.key !== columnDaysKey) {
    setAllDayExpandedFor({ key: columnDaysKey, expanded: false });
  }
  const allDayExpanded = allDayExpandedFor.key === columnDaysKey && allDayExpandedFor.expanded;
  function expandAllDay() {
    setAllDayExpandedFor({ key: columnDaysKey, expanded: true });
  }
  // mission-17/C7, item 3 (Strange) — expanding used to have no way back:
  // the sticky header grew from 156px to 234px (a 3-lane strip) with
  // nothing to shrink it again except paging away and back, which resets
  // the state as a SIDE EFFECT of navigation rather than offering collapse
  // as a real action (DESIGN.md: "never a dead end"). Same setter, same
  // shape as `expandAllDay` above, just the other value.
  function collapseAllDay() {
    setAllDayExpandedFor({ key: columnDaysKey, expanded: false });
  }

  const { spans: allDaySpans, overflowByDay } = useMemo(
    () => assignLanes(columnDays, allDayItems, allDayExpanded ? Number.POSITIVE_INFINITY : undefined),
    [columnDays, allDayItems, allDayExpanded],
  );
  const maxAllDayLane = allDaySpans.reduce((max, span) => Math.max(max, span.lane), -1);

  // Only rendered with real height when there's something to show
  // (mission-8/K2's own "an empty state must not claim space a real one
  // would" discipline) — an empty grid with zero rows collapses to nothing,
  // exactly like Month's own "+N more" line only appearing when
  // overflow > 0. All hooks above run unconditionally on every render
  // (Rules of Hooks) before this early return.
  if (maxAllDayLane < 0) return null;

  const dayBeforeSet = addDays(columnDays[0], -1);
  const dayAfterSet = addDays(columnDays[columnDays.length - 1], 1);

  return (
    <div
      className="grid gap-0.5 px-1 pb-1"
      // mission-17/C5: raised from 18px to 24px, matching the timed grid's
      // own MIN_BLOCK_MINUTES floor — Strange's ruling on the 24px timed
      // block explicitly does NOT cover this row too: a timed block's 24px
      // is defended by its real duration (MIN_BLOCK_MINUTES x
      // HOUR_HEIGHT_PX), and this bar has no duration to be faithful to at
      // all — `18px` was a free constant, not arithmetic, so it gets no
      // such defense and is raised to match rather than kept shorter for
      // no reason.
      style={{ gridTemplateColumns, gridAutoRows: "24px" }}
    >
      <span aria-hidden="true" />
      {allDaySpans.map((span) => {
        // mission-17/C5 — tasks first, and ONLY against `taskById`: see
        // this file's own header for why a task id is never even looked up
        // against `eventById`.
        const task = taskById.get(span.event.id);
        if (task) {
          const completed = task.completedAt !== null;
          const colors = task.people.slice(0, 3).map((p) => avatarColorHex(p.avatarColor));
          // A task is always single-day (CalendarTaskView's own comment:
          // "exactly one due date, never a span"), so unlike an event bar it
          // never has an open/continuing edge to draw — always fully
          // rounded on both sides.
          return (
            <button
              key={span.event.id}
              type="button"
              onClick={() => onOpenTask(task, columnDays[span.startCol])}
              // `line-through` (a purely visual text-decoration) is not
              // announced by assistive tech, so "completed" is also said in
              // words here via aria-label — the same reasoning
              // TaskCard.tsx's own aria-label already documents for the
              // identical fact.
              aria-label={completed ? `${task.title}, completed` : task.title}
              className={`truncate rounded border px-1 text-left text-[9px] font-semibold leading-[24px] ${
                completed ? "border-muted text-muted" : "border-fg text-fg"
              }`}
              style={{
                gridColumn: `${span.startCol + 2} / ${span.endCol + 3}`,
                gridRow: span.lane + 1,
                background: bandedBackground(colors, completed ? 0.05 : 0.1),
              }}
            >
              {/* MonthCell.tsx's own open/completed checkbox glyph
                  vocabulary (✓ / ☐) — see that component's own comment for
                  the full reasoning on why a glyph exists at all. Paired
                  with `line-through` on the title HERE, unlike MonthCell:
                  this strip's title is a real visible string at every width
                  this file renders (never `sr-only` below `md` the way
                  MonthCell's phone-width pill is), so the reason MonthCell
                  reaches for a glyph INSTEAD of `line-through` — its title
                  is invisible below `md` — doesn't apply here, and both can
                  carry the "done" fact together. No `past`-based dimming
                  (unlike an event bar, and unlike MonthCell's own task
                  handling): TaskCard.tsx's own rule is "only completedAt
                  changes how this renders," and that is the one this code
                  follows directly rather than replicating MonthCell's
                  separate `past` check. */}
              <span aria-hidden="true">{completed ? "✓ " : "☐ "}</span>
              <span className={completed ? "line-through" : ""}>{task.title}</span>
            </button>
          );
        }

        const event = eventById.get(span.event.id);
        if (!event) return null; // defensive; every span's id came from `events`/`tasks`
        const continuesBefore =
          daysEventCovers(event.startAt, event.endAt, event.allDay, [dayBeforeSet]).length > 0;
        const continuesAfter =
          daysEventCovers(event.startAt, event.endAt, event.allDay, [dayAfterSet]).length > 0;
        const colors = event.people.slice(0, 3).map((p) => avatarColorHex(p.avatarColor));
        // The representative day for this bar's tap target — the first
        // column it actually touches in THIS render, not necessarily the
        // event's true start (a bar continuing from before `columnDays[0]`
        // still needs a real day to open the detail sheet against).
        const representativeDay = columnDays[span.startCol];
        return (
          <button
            key={span.event.id}
            type="button"
            onClick={() => onOpenEvent(event, representativeDay)}
            className={`truncate border-y px-1 text-left text-[9px] font-semibold leading-[24px] text-fg border-fg ${
              continuesBefore ? "" : "rounded-l border-l"
            } ${continuesAfter ? "" : "rounded-r border-r"}`}
            style={{
              gridColumn: `${span.startCol + 2} / ${span.endCol + 3}`,
              gridRow: span.lane + 1,
              background: bandedBackground(colors, 0.1),
            }}
          >
            {event.title}
          </button>
        );
      })}
      {/* mission-17/C7 — item 1 (Vision) and item 3 (Strange), both on this
          row. Item 1: C5's `whitespace-nowrap` (added to fix the round-1
          two-line wrap) turned the escape HORIZONTAL instead of closing it —
          measured with `Range.getClientRects` (a bounding-box probe reports
          this clean, and is WRONG: the same instrument error Strange
          corrected at round 1), "+2 more" spilled 4.6px and "+10 more"
          8.8px past a Week column's ~31px box at 320px, with ADJACENT
          days' ink actually overlapping. `min-w-0 overflow-hidden` keeps
          the ink inside the box no matter the label length (a grid item's
          default `min-width: auto` is what let it escape at all); Week
          additionally gets a shortened "+N" label, since no other view's
          columns (Day ~290px, 3 Day ~75px) are narrow enough to need it.
          The ACCESSIBLE name never shortens — every button keeps a real
          "+N more" aria-label regardless of what its visible text says, per
          the contract's own instruction that the control must keep saying
          what it does.
          Item 3: expanding used to have no collapse affordance anywhere —
          the only way back was paging away and returning, which resets the
          state as a side effect rather than offering it as an action
          (DESIGN.md: "never a dead end"). One "− Show less" button, not one
          per day: expanding/collapsing is a single strip-wide toggle (there
          is no per-day axis on `allDayExpandedFor`), so it spans every day
          column via `gridColumn: "2 / -1"` rather than sitting in one — which
          also sidesteps item 1's narrow-column problem outright, since
          "− Show less" comfortably fits the full row width at every size
          this file renders and needs no further shortening. */}
      {allDayExpanded ? (
        <button
          type="button"
          onClick={collapseAllDay}
          className="min-w-0 overflow-hidden whitespace-nowrap text-left text-[9px] leading-[24px] text-muted underline decoration-dotted"
          style={{ gridColumn: "2 / -1", gridRow: maxAllDayLane + 2 }}
        >
          − Show less
        </button>
      ) : (
        columnDays.map((day, col) => {
          if (overflowByDay[col] <= 0) return null;
          const overflowLabel = `+${overflowByDay[col]} more`;
          const visibleLabel = columnDays.length === 7 ? `+${overflowByDay[col]}` : overflowLabel;
          return (
            <button
              key={`overflow-${day.getTime()}`}
              type="button"
              onClick={expandAllDay}
              aria-label={overflowLabel}
              className="min-w-0 overflow-hidden whitespace-nowrap text-left text-[9px] leading-[24px] text-muted underline decoration-dotted"
              style={{ gridColumn: col + 2, gridRow: maxAllDayLane + 2 }}
            >
              {visibleLabel}
            </button>
          );
        })
      )}
    </div>
  );
}
