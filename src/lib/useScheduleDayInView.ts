"use client";

// Which day is the Schedule list showing right now? Feeds the ring on the
// wide Schedule's mini month (mission-46/C3, decision 226). Same shape as
// useScheduleMonthTitle.ts: a pure kernel (`topmostVisibleDay`, tested in
// useScheduleDayInView.test.ts) plus a hook that does the DOM reads it can't.
//
// The hook always subscribes but skips the read while the mini month is not
// on screen: `shownRef`'s element has no width when its column is
// `display: none` (below 50rem), and then nothing is measured. That keeps the
// phone free of per-frame `getBoundingClientRect` calls without a
// `matchMedia` copy of a breakpoint that already lives in CSS.

import { useEffect, useRef, useState, type RefObject } from "react";

/** One rendered day row's top position, or `null` for a day with no node
 * (empty days render no row at all). `day` is the day's start-of-day time. */
export type DayTop = { day: number; top: number | null };

/**
 * The pure decision: of the loaded days (supplied in chronological/DOM
 * order), which is the topmost one in view? The LAST day whose top is at or
 * above `revealLineY` (the bottom edge of the pinned bars), the same rule as
 * `topmostClearedMonth`. Two things are load-bearing, as there:
 *
 * - **`continue`, never `break`, on a `top: null` entry.** A day with no node
 *   tells us nothing; skipping it must not stop the scan reaching a later day
 *   that has one.
 * - **`break` relies on DOM-order monotonicity.** A later row never starts
 *   higher than an earlier one, so once a row is below the line, the rest are
 *   too. This is an assumption about the caller's ordering.
 *
 * When no day has cleared the line (the very top of the list), the answer is
 * the first day that has a node: the reader is looking at it. `null` only
 * when no day has a node at all.
 */
export function topmostVisibleDay(dayTops: DayTop[], revealLineY: number): number | null {
  let current: number | null = null;
  let first: number | null = null;
  for (const { day, top } of dayTops) {
    if (top === null) continue;
    if (first === null) first = day;
    if (top > revealLineY) break;
    current = day;
  }
  return current ?? first;
}

/**
 * `dayRefs` is ScheduleView's own row map (keyed by start-of-day time).
 * Returns the day in view as a start-of-day time, seeded with `initialDay`
 * so the first paint matches the list's landing. State holds a number, so an
 * unchanged answer never re-renders (the render-loop lesson in
 * useScheduleMonthTitle.ts: never compare `Date` identity).
 */
export function useScheduleDayInView(
  dayRefs: RefObject<Map<number, HTMLElement>>,
  months: { days: { day: Date }[] }[],
  revealLineY: number,
  shownRef: RefObject<HTMLElement | null>,
  initialDay: Date,
): number {
  const [dayInView, setDayInView] = useState(
    () => new Date(initialDay.getFullYear(), initialDay.getMonth(), initialDay.getDate()).getTime(),
  );
  const dayInViewRef = useRef(dayInView);

  useEffect(() => {
    let framePending = false;

    function sync() {
      framePending = false;
      const shown = shownRef.current;
      if (!shown || shown.offsetWidth === 0) return;
      const dayTops: DayTop[] = [];
      for (const month of months) {
        for (const row of month.days) {
          const time = row.day.getTime();
          const node = dayRefs.current.get(time);
          dayTops.push({ day: time, top: node ? node.getBoundingClientRect().top : null });
        }
      }
      const current = topmostVisibleDay(dayTops, revealLineY);
      if (current !== null && current !== dayInViewRef.current) {
        dayInViewRef.current = current;
        setDayInView(current);
      }
    }

    function onScrollOrResize() {
      if (framePending) return;
      framePending = true;
      requestAnimationFrame(sync);
    }

    onScrollOrResize();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [months, revealLineY, dayRefs, shownRef]);

  return dayInView;
}
