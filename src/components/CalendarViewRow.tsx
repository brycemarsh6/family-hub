"use client";

import { CALENDAR_VIEW_OPTIONS, type CalendarPeriodView } from "@/lib/calendarViewVocabulary";
import { CALENDAR_VIEW_ROW_CLASSES } from "@/lib/gridClasses";

/**
 * The Calendar's view switcher as one row of the six views, shown instead of
 * the View circle once the top bar is wide enough (iPad). Whether it shows is
 * decided by a container query on the bar's own width, in rem
 * (`CALENDAR_VIEW_ROW_CLASSES`), so a bigger Text size makes the bar narrower
 * in rem and the circle takes over again by itself. The names come from
 * `CALENDAR_VIEW_OPTIONS`, the same list the picker sheet reads.
 */
export function CalendarViewRow({
  view,
  onSelectView,
}: {
  view: CalendarPeriodView;
  onSelectView: (view: CalendarPeriodView) => void;
}) {
  return (
    <div role="group" aria-label="View" className={CALENDAR_VIEW_ROW_CLASSES}>
      {CALENDAR_VIEW_OPTIONS.map((option) => {
        const selected = option.value === view;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelectView(option.value)}
            aria-pressed={selected}
            className={`flex h-11 items-center whitespace-nowrap rounded-full px-3.5 text-sm transition-colors ${
              selected ? "bg-fg font-semibold text-bg" : "font-medium text-muted active:bg-line"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
