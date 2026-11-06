"use client";

// The Schedule view's planned habit days (decision 146), fetched alongside the
// paging window without touching its state machine (scheduleWindowState.ts):
// this hook watches the loaded `[windowStart, windowEnd)`, fetches only the
// days it has not covered yet, and folds the result into the rendered months.
// Like useScheduleWindow.ts it takes the fetcher as an argument, so src/lib
// never imports an action.

import { useEffect, useMemo, useRef, useState } from "react";
import { addDays } from "./mealPlanDates";
import { addHabitDaysToSchedule, coversWindow, type ScheduleRenderMonthWithHabits } from "./scheduleHabitDays";
import type { ScheduleRenderMonth } from "./scheduleWindowState";
import type { CalendarHabitDayView } from "./types";

// Under the action's 124-day cap.
const CHUNK_DAYS = 100;

export type FetchHabitDays = (windowStart: Date, windowEnd: Date) => Promise<CalendarHabitDayView[] | null>;

type Covered = { start: number; end: number };

export type ScheduleHabitDays = {
  months: ScheduleRenderMonthWithHabits[];
  /** True once the habit days for the whole loaded window have arrived. */
  habitDaysLoaded: boolean;
  /** True when the last fetch failed; the habit days are then missing from the rows. */
  habitDaysFailed: boolean;
};

export function useScheduleHabitDays(
  months: ScheduleRenderMonth[],
  windowStart: Date,
  windowEnd: Date,
  fetchHabitDays: FetchHabitDays,
): ScheduleHabitDays {
  const [items, setItems] = useState<Map<string, CalendarHabitDayView>>(() => new Map());
  // The ref drives the fetching; the state mirrors it so the view can say "loaded".
  const [coverage, setCoverage] = useState<Covered | null>(null);
  const [habitDaysFailed, setHabitDaysFailed] = useState(false);
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
      try {
        for (const [from, to] of gaps) {
          for (let at = from; at.getTime() < to.getTime(); at = addDays(at, CHUNK_DAYS)) {
            const next = addDays(at, CHUNK_DAYS);
            const chunk = await fetcherRef.current(at, next.getTime() < to.getTime() ? next : to);
            if (chunk === null) ok = false;
            else found.push(...chunk);
          }
        }
      } catch {
        // A thrown fetch is a failed one: show the error line rather than loading forever.
        ok = false;
      }
      if (cancelled) return;
      setHabitDaysFailed(!ok);
      if (!ok) return;
      covered.current = fresh || !have
        ? { start: startTime, end: endTime }
        : { start: Math.min(have.start, startTime), end: Math.max(have.end, endTime) };
      setCoverage(covered.current);
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

  const withHabits = useMemo(
    () => addHabitDaysToSchedule(months, [...items.values()], new Date(startTime), new Date(endTime)),
    [months, items, startTime, endTime],
  );
  // Loaded only once what we hold contains the whole window; growth or a jump is "not loaded" until its fetch lands.
  const habitDaysLoaded = coversWindow(coverage, startTime, endTime);
  return { months: withHabits, habitDaysLoaded, habitDaysFailed };
}
