"use client";

// The Schedule view's planned habit days (decision 146), fetched alongside the
// paging window without touching its state machine (scheduleWindowState.ts):
// this hook watches the loaded `[windowStart, windowEnd)`, fetches only the
// days it has not covered yet, and folds the result into the rendered months.
// Like useScheduleWindow.ts it takes the fetcher as an argument, so src/lib
// never imports an action.

import { useEffect, useMemo, useRef, useState } from "react";
import { addDays } from "./mealPlanDates";
import { addHabitDaysToSchedule, type ScheduleRenderMonthWithHabits } from "./habits/scheduleHabitDays";
import type { ScheduleRenderMonth } from "./scheduleWindowState";
import type { CalendarHabitDayView } from "./types";

// Under the action's 124-day cap.
const CHUNK_DAYS = 100;

export type FetchHabitDays = (windowStart: Date, windowEnd: Date) => Promise<CalendarHabitDayView[] | null>;

type Covered = { start: number; end: number };

export function useScheduleHabitDays(
  months: ScheduleRenderMonth[],
  windowStart: Date,
  windowEnd: Date,
  fetchHabitDays: FetchHabitDays,
): ScheduleRenderMonthWithHabits[] {
  const [items, setItems] = useState<Map<string, CalendarHabitDayView>>(() => new Map());
  const covered = useRef<Covered | null>(null);
  const fetcherRef = useRef(fetchHabitDays);
  useEffect(() => {
    fetcherRef.current = fetchHabitDays;
  }, [fetchHabitDays]);
  const startTime = windowStart.getTime();
  const endTime = windowEnd.getTime();

  useEffect(() => {
    let cancelled = false;
    const start = new Date(startTime);
    const end = new Date(endTime);
    const have = covered.current;
    // Only the edges the window has grown by; a jump elsewhere starts over.
    const gaps: [Date, Date][] = [];
    if (have && startTime <= have.end && endTime >= have.start) {
      if (startTime < have.start) gaps.push([start, new Date(have.start)]);
      if (endTime > have.end) gaps.push([new Date(have.end), end]);
    } else {
      gaps.push([start, end]);
    }
    if (gaps.length === 0) return;
    const fresh = !(have && startTime <= have.end && endTime >= have.start);
    async function run() {
      const found: CalendarHabitDayView[] = [];
      let ok = true;
      for (const [from, to] of gaps) {
        for (let at = from; at.getTime() < to.getTime(); at = addDays(at, CHUNK_DAYS)) {
          const next = addDays(at, CHUNK_DAYS);
          const chunk = await fetcherRef.current(at, next.getTime() < to.getTime() ? next : to);
          if (chunk === null) ok = false;
          else found.push(...chunk);
        }
      }
      if (cancelled || !ok) return;
      covered.current = fresh || !have
        ? { start: startTime, end: endTime }
        : { start: Math.min(have.start, startTime), end: Math.max(have.end, endTime) };
      setItems((prev) => {
        const merged = fresh ? new Map<string, CalendarHabitDayView>() : new Map(prev);
        for (const item of found) merged.set(item.id, item);
        return merged;
      });
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [startTime, endTime]);

  return useMemo(
    () => addHabitDaysToSchedule(months, [...items.values()], new Date(startTime), new Date(endTime)),
    [months, items, startTime, endTime],
  );
}
