"use client";

import { MonthGrid } from "./MonthGrid";
import { PagedSwipeArea } from "./PagedTrack";
import { YearView } from "./YearView";
import type { CalendarEventView, CalendarHabitDayView, CalendarTaskView } from "@/lib/types";

// Mission 69 (C3): Month and Year as three sliding pages, extracted from
// CalendarViews.tsx to keep it under its line cap. Neighbours are built from
// `anchor` (Month reads only its month, Year only its year), so the period
// cursor does not need to be exposed. Month neighbours get the same fetch
// window, so days outside it show the existing "not loaded" glyph.

const addMonths = (day: Date, n: number) => new Date(day.getFullYear(), day.getMonth() + n, 1);
const addYears = (day: Date, n: number) => new Date(day.getFullYear() + n, 0, 1);

type MonthProps = {
  anchor: Date;
  today: Date;
  events: CalendarEventView[];
  tasks: CalendarTaskView[];
  habitDays: CalendarHabitDayView[];
  windowStart: Date;
  windowEnd: Date;
  onOpenDay: (day: Date) => void;
  onTurn: (direction: 1 | -1) => void;
};

export function PagedMonth({ anchor, onTurn, ...grid }: MonthProps) {
  return (
    <PagedSwipeArea
      onTurn={onTurn}
      previous={<MonthGrid anchor={addMonths(anchor, -1)} {...grid} />}
      current={<MonthGrid anchor={anchor} {...grid} />}
      next={<MonthGrid anchor={addMonths(anchor, 1)} {...grid} />}
    />
  );
}

type YearProps = {
  anchor: Date;
  today: Date;
  onPickMonth: (firstOfMonth: Date) => void;
  onTurn: (direction: 1 | -1) => void;
};

export function PagedYear({ anchor, onTurn, ...year }: YearProps) {
  return (
    <PagedSwipeArea
      onTurn={onTurn}
      previous={<YearView anchor={addYears(anchor, -1)} {...year} />}
      current={<YearView anchor={anchor} {...year} />}
      next={<YearView anchor={addYears(anchor, 1)} {...year} />}
    />
  );
}
