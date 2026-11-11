"use client";

import { MonthGrid } from "./MonthGrid";
import { PagedSwipeArea } from "./PagedTrack";
import { YearView } from "./YearView";
import { PAGE_BLEED_CLASSES } from "@/lib/gridClasses";
import { neighbourAnchor } from "@/lib/useCalendarPeriod";
import type { CalendarEventView, CalendarHabitDayView, CalendarTaskView } from "@/lib/types";

// Mission 69 (C3): Month and Year as three sliding pages, extracted from
// CalendarViews.tsx to keep it under its line cap. Neighbours come from
// `neighbourAnchor` (the period cursor's own step size). Month neighbours get the same fetch
// window, so days outside it show the existing "not loaded" glyph.

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
      pageKey={anchor.getTime()}
      className={PAGE_BLEED_CLASSES}
      previous={<MonthGrid anchor={neighbourAnchor("month", anchor, -1)} {...grid} />}
      current={<MonthGrid anchor={anchor} {...grid} />}
      next={<MonthGrid anchor={neighbourAnchor("month", anchor, 1)} {...grid} />}
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
      pageKey={anchor.getTime()}
      previous={<YearView anchor={neighbourAnchor("year", anchor, -1)} {...year} />}
      current={<YearView anchor={anchor} {...year} />}
      next={<YearView anchor={neighbourAnchor("year", anchor, 1)} {...year} />}
    />
  );
}
