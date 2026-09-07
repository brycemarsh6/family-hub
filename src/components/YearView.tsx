"use client";

import { monthGridDays } from "@/lib/monthLayout";
import { isSameDay, isSameMonth } from "@/lib/mealPlanDates";

/**
 * The Year view's whole content (mission-18/C4): twelve mini month-grids
 * for `anchor`'s calendar year, day numbers only — no events, no tasks, no
 * pills. That's a deliberate simplicity call the contract states directly,
 * not a placeholder for a future upgrade: a real event pill is unreadable
 * at this scale even before three of them start competing for a lane
 * (MonthCell.tsx's own B3/B5 findings — 6-8 characters and a border just to
 * be legible at Month's much larger cell), and Year exists to answer "which
 * week does this fall in", not "what's on that day."
 *
 * Reuses `monthGridDays` (monthLayout.ts) for each month's Sunday-first
 * 42-day grid — the SAME function MonthGrid.tsx's own real grid is built
 * from — so a mini-grid's shape (six rows of seven, adjacent-month padding
 * days included) can never drift from what tapping through to Month itself
 * shows.
 *
 * Per DESIGN.md's touch-target rule, the tappable unit is the WHOLE month
 * tile — "a month cell in a mini-grid is tappable; day numbers are not
 * interactive here" (this contract's own words) — so each of the twelve is
 * one real `<button>`, comfortably past the 44px floor by its own content
 * (a month label plus a 7-column grid), and the day numbers inside are
 * `aria-hidden` (see the render below): they're real information but not
 * independently reachable, so exposing all 42 of them as separately
 * discoverable text per tile would be noise the button's own accessible
 * name ("Open <Month> <Year>") already answers ("this opens that month").
 *
 * `onPickMonth` is the SAME callback CalendarViews.tsx already threads to
 * `MonthChips.tsx` for the Month view's own month-tap (`handlePickMonth`,
 * pushing `buildCalendarSearch("month", day)`) — reused here rather than
 * duplicated, since "jump to the 1st of a tapped month, in Month view" is
 * the identical action from a different picker.
 */
export type YearViewProps = {
  /** Any real day inside the year to render — only its year is read. */
  anchor: Date;
  /** The browser's own "today" (useToday.ts, via useCalendarNavigation) —
   * for circling today's day number in whichever month it falls in. */
  today: Date;
  /** Called with the 1st of the tapped month. */
  onPickMonth: (firstOfMonth: Date) => void;
};

/** "January" — full name: the header row has room for the longest month
 * name at this tile width (measured; see the contract's own evidence), and
 * a full name reads less ambiguously than an abbreviation when it's the
 * ONLY text in the tile (MonthChips.tsx's chips, by contrast, abbreviate
 * because they sit in a dense horizontal strip of 25). Also used for the
 * `aria-label` below, so the spoken name matches the printed one exactly. */
const MONTH_NAME_FORMATTER = new Intl.DateTimeFormat("en-US", { month: "long" });

export function YearView({ anchor, today, onPickMonth }: YearViewProps) {
  const year = anchor.getFullYear();
  const months = Array.from({ length: 12 }, (_, monthIndex) => new Date(year, monthIndex, 1));

  return (
    <div className="grid grid-cols-2 gap-3">
      {months.map((month) => (
        <button
          key={month.getMonth()}
          type="button"
          onClick={() => onPickMonth(month)}
          aria-label={`Open ${MONTH_NAME_FORMATTER.format(month)} ${year}`}
          className="flex min-h-11 flex-col gap-1 rounded-lg border border-line bg-surface p-2 text-left transition-colors active:bg-surface-2"
        >
          <span className="text-xs font-semibold text-fg">
            {MONTH_NAME_FORMATTER.format(month)}
          </span>
          {/* Day numbers only, per the contract — no events/tasks, and no
              per-day tap target (the whole tile above is the one target).
              aria-hidden: see this component's own doc comment for why 42
              separately-discoverable numbers per tile would be noise the
              button's own aria-label already resolves. */}
          <div className="grid grid-cols-7 gap-0.5" aria-hidden="true">
            {monthGridDays(month).map((day) => {
              const inMonth = isSameMonth(day, month);
              // The 42-cell grid `monthGridDays` returns spills up to 12
              // days into neighbouring months, so a bare isSameDay(day,
              // today) can circle today's date on a month it doesn't
              // belong to — guard on inMonth too.
              const isToday = isSameDay(day, today) && inMonth;
              return (
                <span
                  key={day.getTime()}
                  className={
                    isToday
                      ? "flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[7px] font-bold text-accent-fg"
                      : `flex h-4 w-4 items-center justify-center text-[7px] ${
                          inMonth ? "text-fg" : "text-muted"
                        }`
                  }
                >
                  {day.getDate()}
                </span>
              );
            })}
          </div>
        </button>
      ))}
    </div>
  );
}
