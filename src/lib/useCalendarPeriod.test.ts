// Real unit tests (node:test, zero new dependencies) for the Calendar
// branch's period cursor — mission-9 (K2), contract C2a. Everything tested
// here is a pure function (`periodAnchor`, `stepPeriod`, `withView`,
// `resetToToday`); the React hook itself (`useCalendarPeriod`) is a thin
// `useState` wrapper with no arithmetic of its own — see that file's own
// header for why the split makes this headlessly testable at all. Run with
// `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  periodAnchor,
  stepPeriod,
  withView,
  resetToToday,
  type CalendarPeriod,
} from "./useCalendarPeriod";
import { isSameDay } from "./mealPlanDates";

function d(year: number, month: number, day: number): Date {
  return new Date(year, month, day);
}

function monthPeriod(monthOffset: number, monthDay: number): CalendarPeriod {
  return { view: "month", dayOffset: 0, monthOffset, monthDay };
}

function weekPeriod(dayOffset: number): CalendarPeriod {
  return { view: "week", dayOffset, monthOffset: 0, monthDay: 1 };
}

function dayPeriod(dayOffset: number): CalendarPeriod {
  return { view: "day", dayOffset, monthOffset: 0, monthDay: 1 };
}

/** Asserts Next∘Prev AND Prev∘Next both land back on `start`'s own anchor. */
function assertRoundTripsExactly(start: CalendarPeriod, today: Date, where: string) {
  const startAnchor = periodAnchor(start, today);
  for (const trip of [stepPeriod(stepPeriod(start, 1), -1), stepPeriod(stepPeriod(start, -1), 1)]) {
    assert.ok(
      isSameDay(periodAnchor(trip, today), startAnchor),
      `${where}: round trip landed on ${periodAnchor(trip, today).toDateString()}, expected ${startAnchor.toDateString()}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Property 1 — Prev∘Next (and Next∘Prev) is identity, every day of every
// month of 2026, including Jan 31 and the days adjacent to Feb 28/29. This
// is the exact property the pre-K2 `offsetDays` scalar could not hold (see
// this file's own header, and the red-then-green reproduction recorded in
// Stark's report for mission-9/C2a).

test("Prev∘Next (month view) is identity: every day of every month of 2026", () => {
  const today = d(2026, 0, 1); // "today" is Jan 1, 2026; monthOffset === month index
  for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(2026, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      assertRoundTripsExactly(monthPeriod(month, day), today, `month ${month + 1} day ${day}`);
    }
  }
});

test("Prev∘Next identity: the exact Jan 31 2026 case Captain demonstrated against the old offsetDays model", () => {
  const today = d(2026, 0, 1);
  const start = monthPeriod(0, 31); // "this month" (Jan), day 31
  const startAnchor = periodAnchor(start, today);
  assert.equal(startAnchor.getMonth(), 0);
  assert.equal(startAnchor.getDate(), 31);

  const next = stepPeriod(start, 1);
  const nextAnchor = periodAnchor(next, today);
  // Lands IN February (not skipped past it into March, the old bug) —
  // clamped to the real last day Feb 2026 has.
  assert.equal(nextAnchor.getMonth(), 1, "Next from Jan 31 must land in February, not skip it");
  assert.equal(nextAnchor.getDate(), 28);

  const back = stepPeriod(next, -1);
  const backAnchor = periodAnchor(back, today);
  assert.equal(backAnchor.getMonth(), 0);
  assert.equal(
    backAnchor.getDate(),
    31,
    "Prev from the clamped Feb 28 must land back on Jan 31 exactly, not Jan 28",
  );
});

test("Prev∘Next identity: the exact Mar 31 round trip Captain demonstrated (old model lost 3 days)", () => {
  const today = d(2026, 2, 1); // "today" is March 1, so monthOffset 0 == March
  const start = monthPeriod(0, 31); // Mar 31
  const prev = stepPeriod(start, -1);
  const prevAnchor = periodAnchor(prev, today);
  assert.equal(prevAnchor.getMonth(), 1); // February
  assert.equal(prevAnchor.getDate(), 28); // clamped, 2026 is not a leap year

  const roundTripped = stepPeriod(prev, 1);
  const finalAnchor = periodAnchor(roundTripped, today);
  assert.equal(finalAnchor.getMonth(), 2);
  assert.equal(finalAnchor.getDate(), 31, "must land back on Mar 31 exactly, not Mar 28");
});

test("Prev∘Next identity: days adjacent to the Feb 28/29 boundary (2026 is not a leap year)", () => {
  const today = d(2026, 0, 1);
  for (const day of [27, 28, 29, 30, 31]) {
    const start = monthPeriod(0, day); // Jan `day`
    const startAnchor = periodAnchor(start, today);
    const roundTripped = stepPeriod(stepPeriod(start, 1), -1);
    assert.ok(
      isSameDay(periodAnchor(roundTripped, today), startAnchor),
      `Jan ${day}: round trip through February landed on ` +
        `${periodAnchor(roundTripped, today).toDateString()}, expected ${startAnchor.toDateString()}`,
    );
  }
});

// ---------------------------------------------------------------------------
// Property 2 — Next ×12 visits 12 distinct consecutive months, none
// skipped, none repeated, from any starting month.

test("Next x12 visits 12 distinct consecutive months, none skipped, none repeated, from every starting month of 2026", () => {
  for (let startMonth = 0; startMonth < 12; startMonth++) {
    const today = d(2026, startMonth, 15);
    let period = monthPeriod(0, 15);
    const seen: string[] = [];
    for (let i = 0; i < 12; i++) {
      const anchor = periodAnchor(period, today);
      seen.push(`${anchor.getFullYear()}-${anchor.getMonth()}`);
      period = stepPeriod(period, 1);
    }
    for (let i = 1; i < seen.length; i++) {
      const [py, pm] = seen[i - 1].split("-").map(Number);
      const [cy, cm] = seen[i].split("-").map(Number);
      const diff = (cy - py) * 12 + (cm - pm);
      assert.equal(
        diff,
        1,
        `starting month ${startMonth}: index ${i - 1}->${i} expected consecutive months, got ${seen[i - 1]} -> ${seen[i]}`,
      );
    }
    assert.equal(new Set(seen).size, 12, `starting month ${startMonth}: expected 12 distinct months, saw ${seen.join(", ")}`);
  }
});

// ---------------------------------------------------------------------------
// Property 3 — switching view preserves the anchored day.

test("withView: Day -> Month -> Day preserves the anchored day", () => {
  const today = d(2026, 0, 1);
  const start = dayPeriod(45); // some day well into the future
  const startAnchor = periodAnchor(start, today);

  const monthView = withView(start, "month", today);
  const backToDay = withView(monthView, "day", today);
  assert.ok(isSameDay(periodAnchor(backToDay, today), startAnchor));
});

test("withView: Week -> Month -> Week preserves the anchored day", () => {
  const today = d(2026, 0, 1);
  const start = weekPeriod(-30);
  const startAnchor = periodAnchor(start, today);

  const monthView = withView(start, "month", today);
  const backToWeek = withView(monthView, "week", today);
  assert.ok(isSameDay(periodAnchor(backToWeek, today), startAnchor));
});

test("withView: Month -> Day opens the exact (even clamped) day Month was showing", () => {
  const today = d(2026, 0, 1); // "today" is Jan 1
  const start = monthPeriod(1, 31); // "next month" (Feb), day 31 — clamps
  const monthAnchor = periodAnchor(start, today);
  assert.equal(monthAnchor.getMonth(), 1);
  assert.equal(monthAnchor.getDate(), 28, "Feb 2026 has 28 days — this is the clamp, not a bug");

  const dayView = withView(start, "day", today);
  const dayAnchor = periodAnchor(dayView, today);
  assert.ok(
    isSameDay(monthAnchor, dayAnchor),
    "Day view must open exactly the day Month was rendering, clamped value included",
  );
});

test("withView: switching to the SAME view is a no-op (returns the identical object)", () => {
  const start = weekPeriod(14);
  const today = d(2026, 0, 1);
  assert.equal(withView(start, "week", today), start);
});

// ---------------------------------------------------------------------------
// Property 4 — Week and Day paging behave exactly as the pre-K2 scalar did:
// 7 days per Week step, 1 day per Day step, and the anchor is
// `addDays(today, dayOffset)` exactly.

test("stepPeriod: Week steps by exactly 7 days, Day steps by exactly 1 day", () => {
  let week = weekPeriod(0);
  week = stepPeriod(week, 1);
  assert.equal(week.dayOffset, 7);
  week = stepPeriod(week, 1);
  assert.equal(week.dayOffset, 14);
  week = stepPeriod(week, -1);
  assert.equal(week.dayOffset, 7);

  let day = dayPeriod(0);
  day = stepPeriod(day, 1);
  assert.equal(day.dayOffset, 1);
  day = stepPeriod(day, -1);
  assert.equal(day.dayOffset, 0);
  day = stepPeriod(day, -1);
  assert.equal(day.dayOffset, -1);
});

test("periodAnchor: Week/Day anchor is addDays(today, dayOffset) exactly, same as the pre-K2 offsetDays scalar", () => {
  const today = d(2026, 5, 15); // June 15, 2026
  const anchor = periodAnchor(weekPeriod(21), today);
  assert.equal(anchor.getFullYear(), 2026);
  assert.equal(anchor.getMonth(), 6); // July
  assert.equal(anchor.getDate(), 6); // June 15 + 21 days = July 6
});

test("month stepping across the real Nov 1 2026 US DST fall-back date is unaffected (calendar-component math, no milliseconds)", () => {
  const today = d(2026, 9, 15); // Oct 15, 2026
  const october = monthPeriod(0, 15);
  const november = stepPeriod(october, 1);
  const anchor = periodAnchor(november, today);
  assert.equal(anchor.getFullYear(), 2026);
  assert.equal(anchor.getMonth(), 10); // November
  assert.equal(anchor.getDate(), 15);
});

// ---------------------------------------------------------------------------
// resetToToday

test("resetToToday: zeroes both offsets, sets monthDay to today's own day, and keeps the view", () => {
  const today = d(2026, 2, 10); // March 10, 2026
  const reset = resetToToday("month", today);
  assert.deepEqual(reset, { view: "month", dayOffset: 0, monthOffset: 0, monthDay: 10 });
  assert.ok(isSameDay(periodAnchor(reset, today), today));

  const resetWeek = resetToToday("week", today);
  assert.equal(resetWeek.view, "week");
  assert.ok(isSameDay(periodAnchor(resetWeek, today), today));
});

// ---------------------------------------------------------------------------
// mission-11/C2 — the same three properties, extended to the view names the
// vocabulary gained (`schedule`, `threeDay`, `year`). Nothing renders them
// yet (`BUILT_VIEWS`, calendarViewVocabulary.ts), but the cursor arithmetic
// is real and is what CV3/CV4/CV5 build on.

function threeDayPeriod(dayOffset: number): CalendarPeriod {
  return { view: "threeDay", dayOffset, monthOffset: 0, monthDay: 1 };
}

function yearPeriod(monthOffset: number, monthDay: number): CalendarPeriod {
  return { view: "year", dayOffset: 0, monthOffset, monthDay };
}

test("stepPeriod: 3 Day steps 3 days, Year steps 12 months on monthOffset, Schedule does not step at all", () => {
  // 3 Day is what the old `view === "week" ? 7 : 1` catch-all got wrong.
  assert.equal(stepPeriod(threeDayPeriod(0), 1).dayOffset, 3);
  assert.equal(stepPeriod(threeDayPeriod(3), 1).dayOffset, 6);
  assert.equal(stepPeriod(threeDayPeriod(3), -1).dayOffset, 0);

  // Year rides monthOffset — no new offset field, and neither dayOffset
  // nor monthDay moves.
  assert.deepEqual(stepPeriod(yearPeriod(0, 15), 1), yearPeriod(12, 15));
  assert.deepEqual(stepPeriod(yearPeriod(12, 15), -1), yearPeriod(0, 15));

  // Schedule scrolls: no period to page between, so a step is an exact
  // no-op rather than the 1 day the catch-all would have given it.
  const schedule: CalendarPeriod = { view: "schedule", dayOffset: 4, monthOffset: 2, monthDay: 9 };
  assert.equal(stepPeriod(schedule, 1), schedule);
  assert.equal(stepPeriod(schedule, -1), schedule);
});

test("Prev∘Next (3 Day view) is identity, and the step is genuinely 3 days: every day of 2026", () => {
  const today = d(2026, 0, 1);
  for (let offset = 0; offset < 365; offset++) {
    assertRoundTripsExactly(threeDayPeriod(offset), today, `offset ${offset}`);
    const stepped = stepPeriod(threeDayPeriod(offset), 1);
    assert.ok(isSameDay(periodAnchor(stepped, today), periodAnchor(threeDayPeriod(offset + 3), today)));
  }
});

test("Prev∘Next (year view) is identity: every day of every month of 2026, Jan 31 and the Feb boundary included", () => {
  const today = d(2026, 0, 1); // monthOffset === month index
  for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(2026, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      assertRoundTripsExactly(yearPeriod(month, day), today, `month ${month + 1} day ${day}`);
    }
  }
});

test("Prev∘Next identity (year view): Feb 29 2028 — the leap day neither adjacent year has", () => {
  const today = d(2026, 0, 1);
  const start = yearPeriod(25, 29); // 25 months from Jan 2026 = Feb 2028
  const startAnchor = periodAnchor(start, today);
  assert.equal(startAnchor.toDateString(), "Tue Feb 29 2028", "2028 is a leap year — Feb 29 is real");
  const back = stepPeriod(start, -1);
  assert.equal(
    periodAnchor(back, today).toDateString(),
    "Sun Feb 28 2027",
    "Feb 2027 has 28 days — the clamp, not a bug",
  );
  assert.ok(
    isSameDay(periodAnchor(stepPeriod(back, 1), today), startAnchor),
    "must land back on Feb 29 2028 exactly — monthDay never forgot the 29th",
  );
});

test("Next x12 (year view) visits 12 distinct consecutive years, none skipped, none repeated", () => {
  const today = d(2026, 5, 15); // June 15, 2026
  let period = yearPeriod(0, 15);
  const seen: number[] = [];
  for (let i = 0; i < 12; i++) {
    const anchor = periodAnchor(period, today);
    seen.push(anchor.getFullYear());
    assert.equal(anchor.getMonth(), 5, `step ${i}: a year step must not drift the month`);
    period = stepPeriod(period, 1);
  }
  // deepEqual against the literal run proves distinct AND consecutive.
  assert.deepEqual(seen, [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035, 2036, 2037]);
});

test("withView: the anchored day survives a switch to — and back from — every view", () => {
  const today = d(2026, 0, 1);
  // Day-basis, week, and a month-basis start holding a CLAMPED anchor
  // (Month aiming at the 31st of a 28-day February).
  for (const start of [dayPeriod(45), weekPeriod(45), monthPeriod(1, 31)]) {
    const startAnchor = periodAnchor(start, today);
    for (const view of ["schedule", "day", "threeDay", "week", "month", "year"] as const) {
      const switched = withView(start, view, today);
      const back = withView(switched, start.view, today);
      const trail = `${start.view} -> ${view}`;
      assert.ok(isSameDay(periodAnchor(switched, today), startAnchor), `${trail} moved the anchor`);
      assert.ok(isSameDay(periodAnchor(back, today), startAnchor), `${trail} -> ${start.view} moved the anchor`);
    }
  }
  // A switch converts the cursor, never carrying the old step size over.
  const year = yearPeriod(14, 20); // March 2027
  const month = withView(year, "month", today);
  assert.equal(periodAnchor(stepPeriod(month, 1), today).getMonth(), 3);
  assert.equal(periodAnchor(stepPeriod(withView(month, "year", today), 1), today).getFullYear(), 2028);
});
