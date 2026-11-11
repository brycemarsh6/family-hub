"use client";

import { useRouter } from "next/navigation";
import { RadioSheet } from "./RadioSheet";
import { EventDetailSheet } from "./EventDetailSheet";
import { TaskDetailSheet } from "./TaskDetailSheet";
import { CALENDAR_VIEW_OPTIONS, type CalendarPeriodView } from "@/lib/calendarViewVocabulary";
import type { CalendarEventView, CalendarPersonView, CalendarTaskView } from "@/lib/types";

/**
 * mission-19/C1 — the sheets `CalendarViews.tsx` mounts (view picker,
 * event detail, task detail), extracted verbatim ahead of CV6 growing
 * that file further (it's the only file in this arc with a rising
 * multi-mission trend — see the mission's "Known risk" note). No behaviour
 * change: every prop below is exactly what `CalendarViews.tsx` already
 * held as local state or received as its own prop: `pickingView`,
 * `selected`, and `selectedTask` are INDEPENDENT pieces of state — none of
 * the sheets below reads another's — which
 * is what makes this an extraction rather than a redesign (verified by
 * re-reading the block before moving it, per the contract's instruction to
 * check the claim rather than trust it).
 *
 * `router` is obtained here directly (not threaded down as a prop) —
 * `useRouter()` returns the same shared object regardless of which
 * component calls it, so this is not a fifth piece of state to keep in
 * sync with the caller, just a second read of one that already exists.
 *
 * mission 68 removed the Add sheet: the Calendar's + now opens
 * `CalendarAddDial`'s bubbles, which keep their own open state.
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

  selected: { event: CalendarEventView; day: Date } | null;
  onCloseSelected: () => void;

  selectedTask: CalendarTaskView | null;
  onCloseTask: () => void;

  people: CalendarPersonView[];
  canManage: boolean;
};

export function CalendarSheets({
  view,
  onSelectView,
  pickingView,
  onClosePickingView,
  selected,
  onCloseSelected,
  selectedTask,
  onCloseTask,
  people,
  canManage,
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
    </>
  );
}
