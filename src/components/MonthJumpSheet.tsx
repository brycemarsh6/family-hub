"use client";

import { useEffect, useState } from "react";
import { monthGridDays } from "@/lib/monthLayout";
import { formatDayLabel, isSameDay, isSameMonth, SHORT_DAY_NAMES } from "@/lib/mealPlanDates";
import { MonthChips } from "./MonthChips";

/**
 * mission-19/C3 — the sheet CalendarHeader's new title control opens: a
 * compact, navigation-only month grid plus `MonthChips` (reused UNCHANGED —
 * this contract's boundary forbids touching that file, and its own header
 * comment already anticipated exactly this reuse: "CV6 reuses this exact
 * component inside its month-picker dropdown, on every view, not only
 * Month"). Tapping any day calls `onPickDay`, which the caller
 * (`CalendarSheets.tsx`) wires to `useCalendarNavigation`'s `jumpToDay`
 * (mission-19/C2) — jumping to that day while keeping whichever view was
 * already showing, never forcing Day view the way Month's own `openDay`
 * does.
 *
 * Deliberately NOT `MonthGrid.tsx`/`MonthCell.tsx` (both must-not-touch,
 * and both are event-PILL renderers built around `assignLanes`, spanning
 * bars and "+N more") — this is a much smaller, self-contained date picker
 * with no event data at all. The mission brief's own language ("colour
 * bands shrunk to dots") describes an embellishment this component
 * deliberately skips: plumbing `events`/`tasks`/the fetch window through a
 * FIFTH sheet just to draw a per-day presence dot is real surface area
 * this contract's own Done criteria and verification steps never actually
 * require, and the mission's named "hard part" is the header control
 * above, not this grid. A disclosed simplification, not a silent one —
 * see the mission's own C3 report for the reasoning.
 *
 * `monthGridDays` is `src/lib/monthLayout.ts` — a pure lib function, not a
 * component, so reusing it here doesn't touch anything on the must-not-
 * touch list (`MonthGrid.tsx` is the component built ON TOP of it that IS
 * off-limits). It's the exact same Sunday-first 42-day grid Month itself
 * renders, so a family already used to that shape sees the same one here.
 */
export function MonthJumpSheet({
  /** The calendar's current anchor — where this sheet's grid starts before
   * anyone taps a MonthChips month. Any real day works; only its
   * year/month are read for that initial framing. */
  anchor,
  /** The browser's own "today" (useToday.ts) — guaranteed non-null by the
   * caller before this sheet is ever mounted (see CalendarSheets.tsx's own
   * guard), same convention as MonthGrid.tsx's own `today` prop. */
  today,
  onPickDay,
  onClose,
}: {
  anchor: Date;
  today: Date;
  onPickDay: (day: Date) => void;
  onClose: () => void;
}) {
  // LOCAL to this sheet, deliberately: picking a month here (via
  // MonthChips) only changes what THIS grid displays, it does not
  // navigate the calendar until a specific DAY is tapped. That's what
  // lets a family browse a year either direction without leaving
  // whichever view they opened this sheet from — MonthChips' own
  // `onPickMonth` callback is reused for exactly that local re-framing,
  // not for `onPickDay`.
  const [shownMonth, setShownMonth] = useState(anchor);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const gridDays = monthGridDays(shownMonth);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Jump to a month or day"
        className="relative flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Jump to a date</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-xl text-muted transition-colors hover:bg-surface-2"
          >
            ×
          </button>
        </div>

        <MonthChips anchor={shownMonth} onPickMonth={setShownMonth} />

        <div className="grid grid-cols-7 pb-1 text-center text-xs font-semibold uppercase tracking-wide text-muted">
          {SHORT_DAY_NAMES.map((name) => (
            <span key={name}>{name}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-1">
          {gridDays.map((day) => {
            const isToday = isSameDay(day, today);
            const inMonth = isSameMonth(day, shownMonth);
            return (
              <button
                key={day.getTime()}
                type="button"
                onClick={() => onPickDay(day)}
                aria-label={`Jump to ${formatDayLabel(day)}`}
                className={`flex h-11 w-11 items-center justify-center justify-self-center rounded-full text-sm font-medium transition-colors active:bg-surface-2 ${
                  isToday ? "bg-accent text-accent-fg" : inMonth ? "text-fg" : "text-muted"
                }`}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
