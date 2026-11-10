"use client";

// The wide Schedule's month beside the list (mission-46/C3, decisions 226 to
// 228). Presentational: ScheduleView hands it the day in view and what to do
// on a tap. The arrows only browse (a local offset); they never scroll the
// list. The offset resets whenever the day in view moves to another month:
// ScheduleView keys this component by that month, so it remounts (a stored
// month key could not tell "returned to the month it was set in" from "never
// left").

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { isTodayCell, monthGridDays } from "@/lib/monthLayout";
import {
  FULL_DAY_NAMES,
  FULL_MONTH_NAMES,
  SHORT_DAY_NAMES,
  formatMonthTitle,
  isSameDay,
  isSameMonth,
} from "@/lib/mealPlanDates";

type ScheduleMiniMonthProps = {
  /** The day the list is showing now; its month is the one shown. */
  dayInView: Date;
  today: Date;
  onPickDay: (day: Date) => void;
};

export function ScheduleMiniMonth({ dayInView, today, onPickDay }: ScheduleMiniMonthProps) {
  const [offset, setOffset] = useState(0);
  const shownMonth = new Date(dayInView.getFullYear(), dayInView.getMonth() + offset, 1);

  function step(direction: 1 | -1) {
    setOffset((current) => current + direction);
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Previous month"
          className="flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors active:bg-surface-2"
        >
          <ChevronLeft size={22} aria-hidden="true" />
        </button>
        <h3 className="text-lg font-semibold">{formatMonthTitle(shownMonth)}</h3>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Next month"
          className="flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors active:bg-surface-2"
        >
          <ChevronRight size={22} aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted" aria-hidden="true">
        {SHORT_DAY_NAMES.map((name) => (
          <span key={name}>{name[0]}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[0.9375rem]">
        {monthGridDays(shownMonth).map((day) => {
          // Days outside the shown month are blank (the mock), not dimmed
          // numbers; the cell stays so the columns keep their places. The
          // circle is 48px where the column allows it and shrinks with the
          // 384px card beside the Sidebar rather than overflowing it.
          if (!isSameMonth(day, shownMonth)) return <span key={day.getTime()} />;
          const isToday = isTodayCell(day, shownMonth, today);
          const isInView = !isToday && isSameDay(day, dayInView);
          const label = `Jump to ${FULL_DAY_NAMES[day.getDay()]}, ${FULL_MONTH_NAMES[day.getMonth()]} ${day.getDate()}`;
          return (
            <button
              key={day.getTime()}
              type="button"
              onClick={() => onPickDay(day)}
              aria-label={isInView ? `${label} (showing)` : label}
              aria-current={isToday ? "date" : undefined}
              className={`flex aspect-square w-full max-w-12 items-center justify-center justify-self-center rounded-full transition-colors active:bg-surface-2 ${
                isToday
                  ? "bg-accent font-semibold text-accent-fg"
                  : isInView
                    ? "font-semibold ring-2 ring-accent"
                    : ""
              }`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>

      <p className="text-center text-[0.8125rem] text-muted">Tap a day to jump the list</p>
    </div>
  );
}
