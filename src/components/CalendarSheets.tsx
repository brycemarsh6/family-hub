"use client";

import { useRouter } from "next/navigation";
import { CalendarDays, ListChecks } from "lucide-react";
import { RadioSheet } from "./RadioSheet";
import { ActionSheet } from "./ActionSheet";
import { EventDetailSheet } from "./EventDetailSheet";
import { TaskDetailSheet } from "./TaskDetailSheet";
import { MonthJumpSheet } from "./MonthJumpSheet";
import { CALENDAR_VIEW_OPTIONS, type CalendarPeriodView } from "@/lib/calendarViewVocabulary";
import type { CalendarEventView, CalendarPersonView, CalendarTaskView } from "@/lib/types";

/**
 * mission-19/C1 — the four sheets `CalendarViews.tsx` mounts (view picker,
 * Add, event detail, task detail), extracted verbatim ahead of CV6 growing
 * that file further (it's the only file in this arc with a rising
 * multi-mission trend — see the mission's "Known risk" note). No behaviour
 * change: every prop below is exactly what `CalendarViews.tsx` already
 * held as local state or received as its own prop: `pickingView`,
 * `addingEvent`, `selected`, and `selectedTask` are FOUR INDEPENDENT
 * pieces of state — none of the four sheets below reads another's — which
 * is what makes this an extraction rather than a redesign (verified by
 * re-reading the block before moving it, per the contract's instruction to
 * check the claim rather than trust it).
 *
 * `router` is obtained here directly (not threaded down as a prop) —
 * `useRouter()` returns the same shared object regardless of which
 * component calls it, so this is not a fifth piece of state to keep in
 * sync with the caller, just a second read of one that already exists.
 *
 * mission-19/C3 added a FIFTH sheet, `MonthJumpSheet` — `pickingMonth`,
 * `onClosePickingMonth`, `anchor`, `today`, and `onJumpToDay` below are its
 * own props, independent of the original four exactly the way those four
 * are independent of each other. `anchor`/`today` are read-only values
 * (not state this component owns or sets) so the sheet can seed its own
 * grid and highlight the real "today" without duplicating
 * `useCalendarNavigation`'s own hook call — that hook is outside this
 * contract's boundary, and CalendarViews.tsx already holds both values.
 *
 * `ScheduleView.tsx` mounts its OWN `EventDetailSheet`/`TaskDetailSheet`
 * (its own comment says "same as CalendarViews.tsx already does") — this
 * component does not replace that copy. Routed to Captain as a
 * one-source-of-truth question for a later contract; fixing it isn't this
 * one's job. The prop names below are deliberately about WHAT closes and
 * WHAT changed (`onCloseSelected`, `onCloseTask`) rather than anything
 * specific to `CalendarViews`' own state variable names, so a future
 * contract collapsing the two copies has a prop surface to reuse rather
 * than one welded to this caller.
 */
type CalendarSheetsProps = {
  view: CalendarPeriodView;
  onSelectView: (view: CalendarPeriodView) => void;
  pickingView: boolean;
  onClosePickingView: () => void;

  addingEvent: boolean;
  onCloseAdding: () => void;
  /** `?date=...` built from the currently anchored day, or `""` — the
   * exact string `CalendarViews.tsx` already computed for its Add sheet's
   * "new event"/"new task" links. */
  addSheetDateParam: string;

  selected: { event: CalendarEventView; day: Date } | null;
  onCloseSelected: () => void;

  selectedTask: CalendarTaskView | null;
  onCloseTask: () => void;

  people: CalendarPersonView[];
  canManage: boolean;

  /** mission-19/C3 — `MonthJumpSheet`'s own open/closed state and the two
   * read-only values it needs to seed itself (see this file's own header
   * comment for why these are read-only rather than a sixth setter). */
  pickingMonth: boolean;
  onClosePickingMonth: () => void;
  /** Null exactly while `today` hasn't resolved yet — CalendarViews.tsx
   * only ever flips `pickingMonth` true from a control that's already
   * `disabled` until then (CalendarHeader's own overlay button), so this
   * is guarded here purely so the type matches what CalendarViews.tsx
   * actually holds, not because the sheet is expected to render null. */
  anchor: Date | null;
  today: Date | null;
  /** `useCalendarNavigation`'s `jumpToDay` (mission-19/C2) — jumps to the
   * tapped day while keeping whichever view is already showing. */
  onJumpToDay: (day: Date) => void;
};

export function CalendarSheets({
  view,
  onSelectView,
  pickingView,
  onClosePickingView,
  addingEvent,
  onCloseAdding,
  addSheetDateParam,
  selected,
  onCloseSelected,
  selectedTask,
  onCloseTask,
  people,
  canManage,
  pickingMonth,
  onClosePickingMonth,
  anchor,
  today,
  onJumpToDay,
}: CalendarSheetsProps) {
  const router = useRouter();

  return (
    <>
      {pickingView && (
        <RadioSheet<CalendarPeriodView>
          title="View"
          options={CALENDAR_VIEW_OPTIONS}
          selected={view}
          onSelect={onSelectView}
          onClose={onClosePickingView}
        />
      )}

      {addingEvent && (
        <ActionSheet
          title="Add"
          onClose={onCloseAdding}
          items={[
            {
              label: "Event",
              icon: <CalendarDays aria-hidden="true" size={18} />,
              onClick: () => {
                onCloseAdding();
                router.push(`/calendar/new${addSheetDateParam}`);
              },
            },
            {
              label: "Task",
              icon: <ListChecks aria-hidden="true" size={18} />,
              onClick: () => {
                onCloseAdding();
                router.push(`/calendar/new/task${addSheetDateParam}`);
              },
            },
          ]}
        />
      )}

      {selected && (
        <EventDetailSheet
          event={selected.event}
          day={selected.day}
          createdByName={selected.event.createdByName}
          canManage={canManage}
          onClose={onCloseSelected}
          onDeleted={() => {
            onCloseSelected();
            router.refresh();
          }}
        />
      )}

      {selectedTask && (
        <TaskDetailSheet
          task={selectedTask}
          people={people}
          canManage={canManage}
          onClose={onCloseTask}
          onChanged={() => router.refresh()}
          onDeleted={() => {
            onCloseTask();
            router.refresh();
          }}
        />
      )}

      {/* mission-19/C3 — guarded on BOTH `anchor` and `today` (belt-and-
          braces, same convention CalendarViews.tsx already uses for this
          exact pair — they resolve together, but guarding both is what
          lets TypeScript narrow both to non-null below without an
          assertion). In practice `pickingMonth` can only ever become true
          from a control that's already disabled until `today` resolves
          (CalendarHeader's overlay button), so this guard is never
          expected to fail closed, only to prove it to the compiler. */}
      {pickingMonth && anchor !== null && today !== null && (
        <MonthJumpSheet
          anchor={anchor}
          today={today}
          onPickDay={(day) => {
            onClosePickingMonth();
            onJumpToDay(day);
          }}
          onClose={onClosePickingMonth}
        />
      )}
    </>
  );
}
