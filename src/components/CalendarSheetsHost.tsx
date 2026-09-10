"use client";

import { useImperativeHandle, useState, type Ref } from "react";
import { CalendarSheets } from "./CalendarSheets";
import type { CalendarPeriodView } from "@/lib/calendarViewVocabulary";
import type { CalendarEventView, CalendarPersonView, CalendarTaskView } from "@/lib/types";

/**
 * mission-20 (CD1)/F2(d) — the "sheets/modal block" extraction the mission
 * flagged as the seam, not the render switch (Captain's CV5 ruling: the
 * switch is where future growth lands). `CalendarViews.tsx` crossed the
 * 650 hard cap the moment F2's fixes (a)/(c) landed (668/650, measured with
 * `preflight.mjs`'s canonical counter) — this is that extraction, not a
 * hard-cap justification in prose (mission-17 already recorded a file
 * shipping the latter instead of a seam).
 *
 * Owns the five pieces of state `CalendarSheets` (mission-19/C1) needs —
 * `pickingView`/`addingEvent`/`pickingMonth`/`selected`/`selectedTask` —
 * moved here verbatim from `CalendarViews.tsx`, same independence as
 * before (none of the five reads another's). What moved is OWNERSHIP, not
 * behaviour: `CalendarSheets` itself is untouched, still receiving the
 * exact same props it always has, just supplied from this file instead of
 * from `CalendarViews.tsx` directly.
 *
 * The caller reaches in via an imperative handle — `ScheduleView.tsx`'s
 * own `ScheduleViewHandle` is the house precedent this copies (React 19
 * accepts `ref` as an ordinary prop; no `forwardRef`) — rather than a
 * render-prop or a lifted-state redesign: `CalendarHeader`'s `onAdd`/
 * `onOpenMonthJump`/`onPickView` and `renderPeriodContent`'s `onOpenEvent`/
 * `onOpenTask` all need to reach this state from OUTSIDE this component's
 * own subtree (they sit in `CalendarViews.tsx`'s own JSX, on either side of
 * where this component mounts), which only a ref can do without threading
 * five new setter props back out the way they came in.
 */
export type CalendarSheetsHostHandle = {
  openViewPicker: () => void;
  openAdd: () => void;
  openMonthJump: () => void;
  openEvent: (event: CalendarEventView, day: Date) => void;
  openTask: (task: CalendarTaskView) => void;
};

type CalendarSheetsHostProps = {
  view: CalendarPeriodView;
  onSelectView: (view: CalendarPeriodView) => void;
  /** `?date=...` built from the currently anchored day, or `""` — passed
   * straight through to `CalendarSheets`, unchanged from before this
   * extraction. */
  addSheetDateParam: string;
  people: CalendarPersonView[];
  canManage: boolean;
  /** Read-only values `MonthJumpSheet` needs to seed itself — see
   * `CalendarSheets.tsx`'s own comment for why these stay read-only rather
   * than becoming a sixth piece of state owned here. */
  anchor: Date | null;
  today: Date | null;
  onJumpToDay: (day: Date) => void;
  ref?: Ref<CalendarSheetsHostHandle>;
};

export function CalendarSheetsHost({
  view,
  onSelectView,
  addSheetDateParam,
  people,
  canManage,
  anchor,
  today,
  onJumpToDay,
  ref,
}: CalendarSheetsHostProps) {
  const [pickingView, setPickingView] = useState(false);
  const [addingEvent, setAddingEvent] = useState(false);
  const [pickingMonth, setPickingMonth] = useState(false);
  const [selected, setSelected] = useState<{ event: CalendarEventView; day: Date } | null>(null);
  const [selectedTask, setSelectedTask] = useState<CalendarTaskView | null>(null);

  useImperativeHandle(ref, () => ({
    openViewPicker: () => setPickingView(true),
    openAdd: () => setAddingEvent(true),
    openMonthJump: () => setPickingMonth(true),
    openEvent: (event, day) => setSelected({ event, day }),
    openTask: (task) => setSelectedTask(task),
  }));

  return (
    <CalendarSheets
      view={view}
      onSelectView={onSelectView}
      pickingView={pickingView}
      onClosePickingView={() => setPickingView(false)}
      addingEvent={addingEvent}
      onCloseAdding={() => setAddingEvent(false)}
      addSheetDateParam={addSheetDateParam}
      selected={selected}
      onCloseSelected={() => setSelected(null)}
      selectedTask={selectedTask}
      onCloseTask={() => setSelectedTask(null)}
      people={people}
      canManage={canManage}
      pickingMonth={pickingMonth}
      onClosePickingMonth={() => setPickingMonth(false)}
      anchor={anchor}
      today={today}
      onJumpToDay={onJumpToDay}
    />
  );
}
