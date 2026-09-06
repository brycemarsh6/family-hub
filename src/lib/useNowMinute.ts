"use client";

import { useSyncExternalStore } from "react";

// The hour timeline's own "what time is it right now" — mission-17 (CV4),
// contract C2. Vision asked for this hoist during CV2's gate rounds: the
// now-line needs a live clock and nothing in this codebase provided one at
// minute granularity, so it lives here beside useToday.ts (same file,
// different granularity) rather than inside TimelineGrid.tsx itself.
//
// Same useSyncExternalStore shape as useToday.ts, for the same reason (see
// that file's own comment for the full explanation of why a browser-only
// value needs this hook rather than useState + useEffect: the server has no
// clock reading to hand the first client render, and useSyncExternalStore's
// third argument is what lets both agree on `null` instead of mismatching).
//
// Deliberately does NOT read minutesOfDay/HOUR_HEIGHT_PX or anything about
// the timeline's own layout — this hook hands back a plain instant (a
// Date | null, truncated to the minute) and leaves every layout decision
// (which day is "today" among the columns, where the rail minute sits) to
// the caller, via timelineLayout.ts's own `minutesOfDay`. That split is
// what makes this hook usable by anything that only cares about "the
// current minute" and nothing about hours-tall rails.
//
// TimelineGrid.tsx does NOT call this hook itself (see that file's own
// header) — it takes `now` as an ordinary prop, the same dependency-
// injection shape `today` already has (MonthGrid.tsx, DaySection.tsx: the
// CALLER resolves `today`/`now` and hands down a real value, only once
// resolved). This hook exists so a future caller (mission-17/C4, wiring
// TimelineGrid into CalendarViews.tsx) has something to call — deliberately
// unconsumed by this same contract, per the mission's own note ("not wired
// up in this contract").

/**
 * The current instant, truncated to the minute — a stable primitive
 * (milliseconds since epoch, floored to the nearest 60,000), not a fresh
 * `Date` every call. useSyncExternalStore compares snapshots, and a new
 * `Date` object every render would look like a change on every single
 * render even when the real-world minute hasn't moved — the same reasoning
 * useToday.ts's `getTodayTimestamp` gives for returning a timestamp rather
 * than `new Date()` directly.
 *
 * Exported (unlike useToday.ts's private `getTodayTimestamp`) because it is
 * the one piece of this file with real arithmetic worth testing headlessly
 * — see useNowMinute.test.ts. `useNowMinute` itself is a thin
 * useSyncExternalStore wrapper with no arithmetic of its own, the same
 * split useCalendarPeriod.ts's own header describes for its pure functions
 * versus its thin hook.
 *
 * Plain millisecond math, not calendar-component arithmetic — this is
 * deliberately NOT one of mealPlanDates.ts's "never do date math with
 * milliseconds" cases. That rule protects CALENDAR-DAY counts across a DST
 * change (a day is 23 or 25 hours, never 24, twice a year); a minute is
 * exactly 60 real seconds regardless of what the wall clock reads around
 * it, so flooring to the minute boundary in milliseconds is exact in every
 * timezone, DST or not.
 */
export function nowMinuteTimestamp(rawMs: number): number {
  return Math.floor(rawMs / 60_000) * 60_000;
}

function getSnapshot(): number {
  return nowMinuteTimestamp(Date.now());
}

function subscribe(callback: () => void) {
  // No native "the minute changed" event exists, so this polls — same
  // shape as useToday.ts's own `subscribe`. Polling every 60s (rather than
  // computing the exact delay to the next minute boundary) means the
  // now-line can lag the real minute by up to 60s, which is the same
  // "plenty responsive, negligible cost" tradeoff useToday.ts already made
  // for the coarser "which day is it" question.
  const interval = setInterval(callback, 60_000);
  return () => clearInterval(interval);
}

/** The device's current minute, as a `Date` truncated to :00 seconds.
 * `null` during SSR and the first client render (see this file's own
 * header) — a real caller should treat that as "not yet known," the same
 * convention `useToday()` already establishes. */
export function useNowMinute(): Date | null {
  const timestamp = useSyncExternalStore(subscribe, getSnapshot, () => null);
  return timestamp === null ? null : new Date(timestamp);
}
