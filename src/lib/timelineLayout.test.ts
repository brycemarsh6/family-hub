// Real unit tests (node:test, zero new dependencies) for the hour-timeline's
// pure layout helpers (timelineLayout.ts) — mission-12 (CV2), contract C2,
// covering the BLOCK GEOMETRY + DST half: minutesOfDay, blockGeometry, and
// the DST policy's transition/guarantee cases. Column packing and the
// all-day/timed partition (assignColumns, belongsInAllDayRow,
// partitionForTimeline, and the composition case against
// monthLayout.assignLanes) live in the sibling timelineLayoutPacking.test.ts,
// apart from a single cross-check assertion in each direction — split by
// concern (never by number, per STRUCTURE.md), mission-12's C4, because this
// file was at 376 of the 350-line soft cap.
//
// Run with `npm test`, which pins TZ=America/Denver; the gauntlet re-runs
// this file directly under TZ=UTC to prove nothing here silently depends on
// the ambient zone.
//
// That second invocation is why the DST cases are shaped the way they are: a
// fall-back or spring-forward assertion built from local calendar components
// passes VACUOUSLY under UTC, which has neither transition, and proves
// nothing (mission-9's lesson — DST tests vacuous in CI for their whole
// life). So the zone-dependent cases skip unless the ambient zone actually
// observes the transition, and one extra case pins America/Denver via
// `withTimeZone` so the collapse rule keeps genuine coverage under UTC too.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MINUTES_PER_DAY,
  MIN_BLOCK_MINUTES,
  minutesOfDay,
  blockGeometry,
  partitionForTimeline,
  type TimelineEvent,
} from "./timelineLayout";
import { daysEventCovers } from "./calendarDates";
import { addDays } from "./mealPlanDates";

function d(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(year, month, day, hour, minute);
}

/** A timed event; `id` doubles as the deterministic tiebreak everywhere. */
function ev(id: string, startAt: Date, endAt: Date, allDay = false): TimelineEvent {
  return { id, startAt, endAt, allDay };
}

/** Same trick calendarDates.test.ts uses: Node re-reads `process.env.TZ` for
 * every local Date getter/constructor, so one test can pin a simulated
 * browser zone regardless of how the suite was invoked. Safe here because
 * timelineLayout.ts touches only Date getters — no `Intl.DateTimeFormat`,
 * which would freeze its zone at construction. */
function withTimeZone<T>(tz: string, run: () => T): T {
  const previous = process.env.TZ;
  process.env.TZ = tz;
  try {
    return run();
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
}

// Nov 1 2026 (US fall back) and Mar 8 2026 (US spring forward) — the real
// dates, not synthetic stand-ins, per this project's standing DST discipline.
const observesFallBack = () =>
  d(2026, 10, 1, 0, 0).getTimezoneOffset() !== d(2026, 10, 1, 12, 0).getTimezoneOffset();
const observesSpringForward = () =>
  d(2026, 2, 8, 0, 0).getTimezoneOffset() !== d(2026, 2, 8, 12, 0).getTimezoneOffset();

// ---------------------------------------------------------------------------
// minutesOfDay

test("minutesOfDay: local wall-clock minutes since local midnight", () => {
  assert.equal(minutesOfDay(d(2026, 8, 3, 0, 0)), 0);
  assert.equal(minutesOfDay(d(2026, 8, 3, 9, 30)), 570);
  assert.equal(minutesOfDay(d(2026, 8, 3, 23, 59)), 1439);
});

// ---------------------------------------------------------------------------
// blockGeometry

test("blockGeometry: an ordinary mid-day event is unclipped", () => {
  const day = d(2026, 8, 3);
  const geometry = blockGeometry(day, ev("a", d(2026, 8, 3, 9, 0), d(2026, 8, 3, 10, 30)));
  assert.deepEqual(geometry, { topMinutes: 540, heightMinutes: 90, clippedStart: false, clippedEnd: false });
});

test("blockGeometry: an event that does not touch the day at all returns null", () => {
  const day = d(2026, 8, 3);
  assert.equal(blockGeometry(day, ev("a", d(2026, 8, 2, 9, 0), d(2026, 8, 2, 10, 0))), null);
  assert.equal(blockGeometry(day, ev("b", d(2026, 8, 4, 9, 0), d(2026, 8, 4, 10, 0))), null);
});

test("blockGeometry: Fri 10 PM -> Sat 2 AM is clipped at the END on Friday", () => {
  const friday = d(2026, 8, 4); // Fri Sep 4 2026
  const geometry = blockGeometry(friday, ev("a", d(2026, 8, 4, 22, 0), d(2026, 8, 5, 2, 0)));
  assert.deepEqual(geometry, { topMinutes: 1320, heightMinutes: 120, clippedStart: false, clippedEnd: true });
});

test("blockGeometry: the same event is clipped at the START on Saturday", () => {
  const saturday = d(2026, 8, 5);
  const geometry = blockGeometry(saturday, ev("a", d(2026, 8, 4, 22, 0), d(2026, 8, 5, 2, 0)));
  assert.deepEqual(geometry, { topMinutes: 0, heightMinutes: 120, clippedStart: true, clippedEnd: false });
});

test("blockGeometry: an end landing EXACTLY on the day's own midnight is not clipped", () => {
  const day = d(2026, 8, 3);
  const geometry = blockGeometry(day, ev("a", d(2026, 8, 3, 20, 0), d(2026, 8, 4, 0, 0)));
  assert.deepEqual(geometry, { topMinutes: 1200, heightMinutes: 240, clippedStart: false, clippedEnd: false });
});

test("blockGeometry: that same exact-midnight end draws NOTHING on the following day — the rule eventDaySpan already encodes", () => {
  const event = ev("a", d(2026, 8, 3, 20, 0), d(2026, 8, 4, 0, 0));
  const nextDay = d(2026, 8, 4);
  assert.equal(blockGeometry(nextDay, event), null);
  // And calendarDates agrees, which is the whole point: two libraries that
  // disagree about the same event is how "8 PM - midnight" silently became a
  // two-day span the first time (mission-8's V1 fix).
  const covered = daysEventCovers(event.startAt, event.endAt, event.allDay, [d(2026, 8, 3), nextDay]);
  assert.equal(covered.length, 1);
});

test("blockGeometry: a 5-minute event still gets MIN_BLOCK_MINUTES so it stays tappable", () => {
  const geometry = blockGeometry(d(2026, 8, 3), ev("a", d(2026, 8, 3, 9, 0), d(2026, 8, 3, 9, 5)));
  assert.equal(geometry?.topMinutes, 540);
  assert.equal(geometry?.heightMinutes, MIN_BLOCK_MINUTES);
});

test("blockGeometry: a late-evening block is pulled UP so top + height never exceeds the rail", () => {
  const geometry = blockGeometry(d(2026, 8, 3), ev("a", d(2026, 8, 3, 23, 50), d(2026, 8, 3, 23, 55)));
  assert.equal(geometry?.heightMinutes, MIN_BLOCK_MINUTES);
  assert.equal(geometry?.topMinutes, MINUTES_PER_DAY - MIN_BLOCK_MINUTES);
  assert.equal((geometry?.topMinutes ?? 0) + (geometry?.heightMinutes ?? 0), MINUTES_PER_DAY);
});

test("blockGeometry: a degenerate row (end before start) never yields a negative height", () => {
  const geometry = blockGeometry(d(2026, 8, 3), ev("a", d(2026, 8, 3, 14, 0), d(2026, 8, 3, 13, 0)));
  assert.ok(geometry !== null);
  assert.ok(geometry.heightMinutes > 0, "height must stay positive");
  assert.ok(geometry.topMinutes >= 0);
});

test("REGRESSION: a zero-length event at exactly local midnight draws on its own day, and all three functions agree", () => {
  // `validateEventInput` (actions/calendar.ts) rejects only `endAt < startAt`,
  // so `end === start` is writable through the sanctioned path. Before
  // mission-12/C3 this drew NOWHERE — `end > dayStart` is false on its own day
  // — while `daysEventCovers` still listed it: present in the list views,
  // absent from the timeline. The one shape the two libraries disagreed on.
  const midnight = d(2026, 8, 3, 0, 0);
  const event = ev("a", midnight, midnight);
  const days = [d(2026, 8, 2), d(2026, 8, 3), d(2026, 8, 4)];

  assert.deepEqual(blockGeometry(d(2026, 8, 3), event), {
    topMinutes: 0,
    heightMinutes: MIN_BLOCK_MINUTES,
    clippedStart: false,
    clippedEnd: false,
  });
  assert.equal(blockGeometry(d(2026, 8, 2), event), null, "it must not leak onto the day before");
  assert.equal(blockGeometry(d(2026, 8, 4), event), null, "nor onto the day after");
  assert.equal(daysEventCovers(event.startAt, event.endAt, event.allDay, days).length, 1);
  assert.deepEqual(partitionForTimeline(days, [event]), { allDayRow: [], timed: [event] });
});

// ---------------------------------------------------------------------------
// DST — the stated policy: a FIXED 24-row wall-clock rail (Google/Apple do the
// same). The repeated hour collapses, the missing hour is an empty row, and
// the guarantee is no NaN, no negative height, no crash.

test("DST fall-back (Nov 1 2026): the repeated 1 AM collapses — a 3-hour event draws 2 hours tall", { skip: observesFallBack() ? false : "ambient zone has no fall-back transition" }, () => {
  const start = d(2026, 10, 1, 0, 30); // 00:30 MDT
  const end = d(2026, 10, 1, 2, 30); // 02:30 MST — three real hours later
  assert.equal(end.getTime() - start.getTime(), 3 * 60 * 60 * 1000, "the fixture must really span 3 hours");
  const geometry = blockGeometry(d(2026, 10, 1), ev("a", start, end));
  assert.equal(geometry?.topMinutes, 30);
  assert.equal(geometry?.heightMinutes, 120, "wall-clock projection: 00:30 to 02:30 is 120 rail minutes");
});

test("DST fall-back (Nov 1 2026): the rail is still exactly 1440 minutes on a 25-hour day", { skip: observesFallBack() ? false : "ambient zone has no fall-back transition" }, () => {
  const day = d(2026, 10, 1);
  const nextDay = addDays(day, 1);
  assert.equal(nextDay.getTime() - day.getTime(), 25 * 60 * 60 * 1000, "Nov 1 2026 really is 25 hours long here");
  const geometry = blockGeometry(day, ev("a", day, nextDay));
  assert.deepEqual(geometry, { topMinutes: 0, heightMinutes: MINUTES_PER_DAY, clippedStart: false, clippedEnd: false });
});

test("DST spring-forward (Mar 8 2026): the missing 2 AM stretches a 1-hour event to 2 rail hours, and 2 AM stays an empty row", { skip: observesSpringForward() ? false : "ambient zone has no spring-forward transition" }, () => {
  const start = d(2026, 2, 8, 1, 30); // 01:30 MST
  const end = d(2026, 2, 8, 3, 30); // 03:30 MDT — one real hour later
  assert.equal(end.getTime() - start.getTime(), 1 * 60 * 60 * 1000, "the fixture must really span 1 hour");
  const geometry = blockGeometry(d(2026, 2, 8), ev("a", start, end));
  assert.equal(geometry?.topMinutes, 90);
  assert.equal(geometry?.heightMinutes, 120, "the rail keeps a 2 AM row nothing can be scheduled into");
});

test("DST spring-forward (Mar 8 2026): the rail is still exactly 1440 minutes on a 23-hour day", { skip: observesSpringForward() ? false : "ambient zone has no spring-forward transition" }, () => {
  const day = d(2026, 2, 8);
  const nextDay = addDays(day, 1);
  assert.equal(nextDay.getTime() - day.getTime(), 23 * 60 * 60 * 1000, "Mar 8 2026 really is 23 hours long here");
  const geometry = blockGeometry(day, ev("a", day, nextDay));
  assert.equal(geometry?.heightMinutes, MINUTES_PER_DAY);
});

test("DST (America/Denver pinned, so this runs under TZ=UTC too): the fall-back collapse is deliberate, not ambient luck", () => {
  withTimeZone("America/Denver", () => {
    const start = new Date(2026, 10, 1, 0, 30);
    const end = new Date(2026, 10, 1, 2, 30);
    // THE PIN'S OWN PROOF, and the reason it is inside `withTimeZone`: under
    // an ambient UTC this same fixture is 2 real hours, and a 120-minute
    // height assertion passes vacuously. Without this line the test cannot
    // detect its own pin failing (mission-12/C3, Vision — it corrected a
    // claim in the mission record that this case was already non-vacuous).
    assert.equal(end.getTime() - start.getTime(), 3 * 60 * 60 * 1000, "the pin must hold: 00:30 to 02:30 is 3 REAL hours only under a zone that falls back");
    const geometry = blockGeometry(new Date(2026, 10, 1), ev("a", start, end));
    assert.equal(geometry?.heightMinutes, 120);
  });
});

test("DST guarantee: no NaN, no negative height, nothing off the rail, on either transition day", () => {
  for (const day of [d(2026, 10, 1), d(2026, 2, 8)]) {
    for (let hour = 0; hour < 24; hour++) {
      const geometry = blockGeometry(day, ev("a", d(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0), d(day.getFullYear(), day.getMonth(), day.getDate(), hour + 2, 0)));
      if (geometry === null) continue;
      assert.ok(Number.isFinite(geometry.topMinutes), `hour ${hour}: top must be finite`);
      assert.ok(Number.isFinite(geometry.heightMinutes), `hour ${hour}: height must be finite`);
      assert.ok(geometry.heightMinutes > 0, `hour ${hour}: height must be positive`);
      assert.ok(geometry.topMinutes >= 0, `hour ${hour}: top must not be negative`);
      assert.ok(
        geometry.topMinutes + geometry.heightMinutes <= MINUTES_PER_DAY,
        `hour ${hour}: block must stay on the rail`,
      );
    }
  }
});
