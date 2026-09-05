// Real unit tests (node:test, zero new dependencies) for the Schedule
// view's pure state transforms — mission-15 (CV3), contract C3b. C3
// (useScheduleWindow.ts) wrote these functions and found they couldn't be
// tested from that file: useScheduleWindow.ts transitively imports
// fetchCalendarEvents/fetchTasks (src/app/actions/calendar.ts,
// src/app/actions/tasks.ts) -> dal.ts -> db.ts, which carries
// "server-only" and throws the instant a plain `node:test` process imports
// it. C3b split the pure half into scheduleWindowState.ts (zero imports of
// anything DB-touching), and this file is what exercises it — the same
// loginRateLimitPolicy.ts/loginRateLimit.ts split this project already
// uses for exactly this reason.
//
// Run with `npm test`, which pins TZ=America/Denver; the gauntlet re-runs
// this file directly under TZ=UTC and TZ=America/Los_Angeles to prove
// nothing here silently depends on the ambient zone. This file lives
// directly in src/lib/ — the only place (plus src/lib/voice/) the test
// glob (`package.json` + two CI steps, all three hand-enumerated) reaches;
// a new subdirectory would silently drop these tests from all three.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyChunkResult,
  applyRefresh,
  buildInitialScheduleState,
  buildScheduleRenderMonths,
  refreshChunkFor,
  type ScheduleWindowState,
} from "./scheduleWindowState";
import { addDays } from "./mealPlanDates";
import { calendarDayDiff, localDayToAllDayInstant } from "./calendarDates";
import type { CalendarEventView, CalendarTaskView } from "./types";

function d(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(year, month, day, hour, minute);
}

/** Same trick calendarDates.test.ts / scheduleWindow.test.ts use: Node
 * re-reads `process.env.TZ` for every local Date getter/constructor, so one
 * test can pin a simulated browser zone regardless of how the suite was
 * invoked. Safe here because scheduleWindowState.ts touches only Date
 * getters and mealPlanDates/calendarDates/scheduleWindow's own local-getter
 * helpers — no `Intl.DateTimeFormat`, which would freeze its zone at
 * construction. */
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

/** A minimal-but-complete CalendarEventView, every field a fixed
 * placeholder except id/startAt/endAt/allDay — this module never reads
 * title/notes/location/people/createdByName, so their exact values don't
 * matter, but the real type is used (not a cast) so a future required
 * field breaks this file at compile time instead of silently going
 * `undefined`. */
function fakeEvent(
  id: string,
  startAt: Date,
  endAt: Date,
  allDay = false,
): CalendarEventView {
  return {
    id,
    title: `event ${id}`,
    notes: null,
    location: null,
    startAt,
    endAt,
    allDay,
    people: [],
    createdByName: null,
  };
}

/** The same, for CalendarTaskView — a task has one due date, never a span. */
function fakeTask(id: string, dueDate: Date, completedAt: Date | null = null): CalendarTaskView {
  return {
    id,
    title: `task ${id}`,
    details: null,
    dueDate,
    completedAt,
    people: [],
    isMine: false,
  };
}

// ---------------------------------------------------------------------------
// buildInitialScheduleState

test("buildInitialScheduleState: a genuinely empty window pinned at initialDay's own local midnight", () => {
  const state = buildInitialScheduleState(d(2026, 5, 15, 13, 30));
  assert.equal(state.windowStart.getTime(), state.windowEnd.getTime(), "windowStart === windowEnd before anything is fetched");
  assert.equal(state.windowStart.getHours(), 0, "snapped to local midnight even from a mid-day instant");
  assert.equal(state.entries.size, 0);
  assert.equal(state.records.size, 0);
  assert.equal(state.hasMoreBackward, true);
  assert.equal(state.hasMoreForward, true);
});

// ---------------------------------------------------------------------------
// applyChunkResult

test("applyChunkResult: real rows advance the boundary by exactly one chunk, no day gained or lost", () => {
  const initial = buildInitialScheduleState(d(2026, 5, 15));
  const chunk = { start: d(2026, 4, 16), end: d(2026, 5, 15) }; // nextBackwardChunk's own shape
  const events = [fakeEvent("e1", d(2026, 4, 20, 9, 0), d(2026, 4, 20, 10, 0))];

  const next = applyChunkResult(initial, "backward", chunk, events, []);

  assert.equal(next.windowStart.getTime(), chunk.start.getTime(), "the boundary must advance to exactly the fetched chunk's start");
  assert.equal(next.windowEnd.getTime(), initial.windowEnd.getTime(), "the OTHER edge must be untouched by a backward chunk");
  assert.equal(calendarDayDiff(chunk.start, initial.windowStart), 30, "sanity: the chunk really is one CHUNK_DAYS-sized page");
  assert.equal(next.hasMoreBackward, true, "a non-empty result must not stop future backward loads");
  assert.equal(next.entries.size, 1);
  assert.ok(next.records.has("e1"));
});

test("applyChunkResult: the SAME real rows, applied forward, advance windowEnd and leave windowStart alone", () => {
  const initial = buildInitialScheduleState(d(2026, 5, 15));
  const chunk = { start: d(2026, 5, 15), end: d(2026, 6, 14) }; // nextForwardChunk's own shape
  const events = [fakeEvent("e1", d(2026, 5, 20, 9, 0), d(2026, 5, 20, 10, 0))];

  const next = applyChunkResult(initial, "forward", chunk, events, []);

  assert.equal(next.windowEnd.getTime(), chunk.end.getTime(), "the boundary must advance to exactly the fetched chunk's end");
  assert.equal(next.windowStart.getTime(), initial.windowStart.getTime(), "the OTHER edge must be untouched by a forward chunk");
  assert.equal(next.hasMoreForward, true);
});

test("applyChunkResult: an EMPTY result (no events, no tasks) does not advance the boundary and flips hasMore to false", () => {
  const initial = buildInitialScheduleState(d(2026, 5, 15));
  const chunk = { start: d(2026, 4, 16), end: d(2026, 5, 15) };

  const next = applyChunkResult(initial, "backward", chunk, [], []);

  assert.equal(
    next.windowStart.getTime(),
    initial.windowStart.getTime(),
    "an unconfirmed range must not start looking loaded — the boundary must not move",
  );
  assert.equal(next.hasMoreBackward, false, "an empty chunk means 'nothing more this way, ever'");
  // The forward direction, and every other field, must be completely
  // unaffected by a backward chunk coming back empty.
  assert.equal(next.windowEnd.getTime(), initial.windowEnd.getTime());
  assert.equal(next.hasMoreForward, initial.hasMoreForward);
});

test("applyChunkResult: an empty FORWARD result flips only hasMoreForward, mirroring the backward case", () => {
  const initial = buildInitialScheduleState(d(2026, 5, 15));
  const chunk = { start: d(2026, 5, 15), end: d(2026, 6, 14) };

  const next = applyChunkResult(initial, "forward", chunk, [], []);

  assert.equal(next.windowEnd.getTime(), initial.windowEnd.getTime());
  assert.equal(next.hasMoreForward, false);
  assert.equal(next.hasMoreBackward, initial.hasMoreBackward);
});

test("applyChunkResult: a server-side deletion drops from both entries and records on the next overlapping chunk", () => {
  const chunk = { start: d(2026, 5, 1), end: d(2026, 6, 1) };
  const seeded = applyChunkResult(
    buildInitialScheduleState(d(2026, 5, 15)),
    "forward",
    chunk,
    [fakeEvent("survivor", d(2026, 5, 5), d(2026, 5, 6)), fakeEvent("deleted", d(2026, 5, 10), d(2026, 5, 11))],
    [],
  );
  assert.equal(seeded.entries.size, 2);
  assert.equal(seeded.records.size, 2);

  // Re-fetching the exact same range, but "deleted" is gone now.
  const refetched = applyChunkResult(seeded, "forward", chunk, [fakeEvent("survivor", d(2026, 5, 5), d(2026, 5, 6))], []);
  assert.equal(refetched.entries.size, 1);
  assert.equal(refetched.records.size, 1, "a dropped entry's full record must be dropped too, or a stale card renders with nothing to refresh it");
  assert.ok(refetched.records.has("survivor"));
  assert.ok(!refetched.records.has("deleted"));
});

test("applyChunkResult: tasks are folded in alongside events, both resolvable back out of records", () => {
  const initial = buildInitialScheduleState(d(2026, 5, 15));
  const chunk = { start: d(2026, 5, 15), end: d(2026, 6, 14) };
  const events = [fakeEvent("e1", d(2026, 5, 20, 9, 0), d(2026, 5, 20, 10, 0))];
  const tasks = [fakeTask("t1", d(2026, 5, 22))];

  const next = applyChunkResult(initial, "forward", chunk, events, tasks);

  assert.equal(next.entries.size, 2);
  const eventRecord = next.records.get("e1");
  const taskRecord = next.records.get("t1");
  assert.equal(eventRecord?.kind, "event");
  assert.equal(taskRecord?.kind, "task");
});

test("applyChunkResult: never mutates the state object it was given", () => {
  const initial = buildInitialScheduleState(d(2026, 5, 15));
  const chunk = { start: d(2026, 5, 15), end: d(2026, 6, 14) };
  applyChunkResult(initial, "forward", chunk, [fakeEvent("e1", d(2026, 5, 20), d(2026, 5, 21))], []);
  assert.equal(initial.entries.size, 0, "applyChunkResult must return a NEW state, leaving its input untouched");
  assert.equal(initial.windowEnd.getTime(), d(2026, 5, 15).getTime());
});

// ---------------------------------------------------------------------------
// applyRefresh

test("applyRefresh: a re-merge removes an event deleted elsewhere, without touching the outer window or hasMore flags", () => {
  const outerChunk = { start: d(2026, 5, 1), end: d(2026, 7, 1) };
  const seeded = applyChunkResult(
    buildInitialScheduleState(d(2026, 5, 15)),
    "forward",
    outerChunk,
    [fakeEvent("keep", d(2026, 5, 10), d(2026, 5, 11)), fakeEvent("removed", d(2026, 5, 12), d(2026, 5, 13))],
    [],
  );
  assert.equal(seeded.entries.size, 2);

  const refreshChunk = refreshChunkFor(d(2026, 5, 12));
  const refreshed = applyRefresh(seeded, refreshChunk, [fakeEvent("keep", d(2026, 5, 10), d(2026, 5, 11))], []);

  assert.equal(refreshed.entries.size, 1, "the deleted event must drop out of the merged set");
  assert.ok(refreshed.entries.has("keep"));
  assert.ok(!refreshed.entries.has("removed"));
  assert.ok(!refreshed.records.has("removed"));

  // The whole point of applyRefresh vs. applyChunkResult: the OUTER window
  // bounds and hasMore flags must be completely untouched by a targeted
  // refresh, regardless of what the refresh chunk's own range is.
  assert.equal(refreshed.windowStart.getTime(), seeded.windowStart.getTime());
  assert.equal(refreshed.windowEnd.getTime(), seeded.windowEnd.getTime());
  assert.equal(refreshed.hasMoreBackward, seeded.hasMoreBackward);
  assert.equal(refreshed.hasMoreForward, seeded.hasMoreForward);
});

test("applyRefresh: an edited event's fields update in place", () => {
  const chunk = { start: d(2026, 5, 1), end: d(2026, 6, 1) };
  const original = fakeEvent("edited", d(2026, 5, 10, 9, 0), d(2026, 5, 10, 10, 0));
  const seeded = applyChunkResult(buildInitialScheduleState(d(2026, 5, 15)), "forward", chunk, [original], []);

  const edited = fakeEvent("edited", d(2026, 5, 10, 14, 0), d(2026, 5, 10, 15, 0));
  const refreshed = applyRefresh(seeded, refreshChunkFor(d(2026, 5, 10)), [edited], []);

  const record = refreshed.records.get("edited");
  assert.equal(record?.kind, "event");
  if (record?.kind === "event") {
    assert.equal(record.event.startAt.getHours(), 14, "the refreshed copy's fields must win over the stale one");
  }
});

// ---------------------------------------------------------------------------
// buildScheduleRenderMonths

test("buildScheduleRenderMonths: today is present even when the loaded window holds nothing", () => {
  const state: ScheduleWindowState = {
    windowStart: d(2026, 5, 1),
    windowEnd: d(2026, 5, 10),
    entries: new Map(),
    records: new Map(),
    hasMoreBackward: true,
    hasMoreForward: true,
  };
  const months = buildScheduleRenderMonths(state, d(2026, 5, 5));
  assert.equal(months.length, 1);
  assert.equal(months[0].days.length, 1);
  assert.equal(months[0].days[0].day.getDate(), 5);
  assert.deepEqual(months[0].days[0].events, []);
  assert.deepEqual(months[0].days[0].tasks, []);
});

test("buildScheduleRenderMonths: splits at a month boundary and resolves ids back to full events and tasks separately", () => {
  const chunk = { start: d(2026, 5, 28), end: d(2026, 6, 3) }; // Jun 28 - Jul 3
  const juneEvent = fakeEvent("june-event", d(2026, 5, 29, 9, 0), d(2026, 5, 29, 10, 0));
  const julyTask = fakeTask("july-task", d(2026, 6, 1));
  const state = applyChunkResult(buildInitialScheduleState(d(2026, 5, 28)), "forward", chunk, [juneEvent], [julyTask]);

  const months = buildScheduleRenderMonths(state, d(2026, 0, 1)); // today far outside, on purpose

  assert.equal(months.length, 2);
  assert.equal(months[0].monthStart.getMonth(), 5);
  assert.equal(months[0].days.length, 1);
  assert.equal(months[0].days[0].events.length, 1);
  assert.equal(months[0].days[0].events[0].id, "june-event");
  assert.equal(months[0].days[0].tasks.length, 0);

  assert.equal(months[1].monthStart.getMonth(), 6);
  assert.equal(months[1].days.length, 1);
  assert.equal(months[1].days[0].tasks.length, 1);
  assert.equal(months[1].days[0].tasks[0].id, "july-task");
  assert.equal(months[1].days[0].events.length, 0);
});

test("buildScheduleRenderMonths: an entry id with no matching record is skipped rather than crashing", () => {
  const state: ScheduleWindowState = {
    windowStart: d(2026, 5, 1),
    windowEnd: d(2026, 5, 3),
    entries: new Map([["ghost", { id: "ghost", startAt: d(2026, 5, 1), endAt: d(2026, 5, 2), allDay: true }]]),
    records: new Map(), // deliberately missing "ghost"
    hasMoreBackward: false,
    hasMoreForward: false,
  };
  const months = buildScheduleRenderMonths(state, d(2026, 5, 1));
  assert.equal(months.length, 1);
  assert.deepEqual(months[0].days[0].events, []);
  assert.deepEqual(months[0].days[0].tasks, []);
});

// ---------------------------------------------------------------------------
// refreshChunkFor

test("refreshChunkFor: the chunk actually contains the day asked for", () => {
  const day = d(2026, 5, 15);
  const chunk = refreshChunkFor(day);
  assert.ok(chunk.start.getTime() <= day.getTime(), "the chunk must start at or before the requested day");
  assert.ok(chunk.end.getTime() > day.getTime(), "the chunk's exclusive end must be after the requested day");
  assert.equal(calendarDayDiff(chunk.start, chunk.end), 14);
});

test("refreshChunkFor: snaps to local midnight even from a mid-day instant", () => {
  const chunk = refreshChunkFor(d(2026, 5, 15, 22, 45));
  assert.equal(chunk.start.getHours(), 0);
  assert.equal(chunk.end.getHours(), 0);
});

// ---------------------------------------------------------------------------
// DST — the real 2026 transitions, not synthetic stand-ins

const observesFallBack = () =>
  d(2026, 10, 1, 0, 0).getTimezoneOffset() !== d(2026, 10, 1, 12, 0).getTimezoneOffset();

test(
  "applyChunkResult across the real Nov 1 2026 fall-back: the boundary still advances by exactly one calendar day per chunk day, no gap or duplicate",
  { skip: observesFallBack() ? false : "ambient zone has no fall-back transition" },
  () => {
    const initial = buildInitialScheduleState(d(2026, 9, 20)); // Oct 20
    const chunk = { start: d(2026, 9, 20), end: addDays(d(2026, 9, 20), 30) }; // spans Nov 1
    const next = applyChunkResult(initial, "forward", chunk, [fakeEvent("dst-event", d(2026, 10, 2), d(2026, 10, 3))], []);
    assert.equal(next.windowEnd.getTime(), chunk.end.getTime());
    assert.equal(calendarDayDiff(chunk.start, chunk.end), 30, "the fall-back week must not silently drift the chunk to 29 or 31 days");
  },
);

test("DST (America/Denver pinned, so this runs under TZ=UTC too): the boundary and today-inclusion logic hold across the real Nov 1 2026 fall-back", () => {
  withTimeZone("America/Denver", () => {
    const initial = buildInitialScheduleState(d(2026, 9, 20)); // Oct 20
    const chunk = { start: d(2026, 9, 20), end: addDays(d(2026, 9, 20), 30) }; // spans Nov 1
    const next = applyChunkResult(initial, "forward", chunk, [fakeEvent("dst-event", d(2026, 10, 2), d(2026, 10, 3))], []);
    assert.equal(next.windowEnd.getTime(), chunk.end.getTime());
    assert.equal(calendarDayDiff(chunk.start, chunk.end), 30);

    // "today" landing exactly on the DST date itself must still be included
    // even though it holds nothing — the empty-window case, replayed on the
    // real transition day.
    const months = buildScheduleRenderMonths(next, d(2026, 10, 1));
    const allDays = months.flatMap((m) => m.days);
    assert.ok(allDays.some((row) => row.day.getMonth() === 10 && row.day.getDate() === 1), "Nov 1 must appear even though it's the fall-back date itself");
  });
});

// ---------------------------------------------------------------------------
// mission-15/C5 — the real vanish bug: a task due right at a re-queried
// window's edge used to be dropped by mergeWindow, reading its own correct
// exclusion from a narrower fetch as a server-side deletion. See
// taskToScheduleEvent's own header comment (scheduleWindowState.ts) for the
// full mechanism. `d()` above builds a LOCAL midnight, which is NOT the real
// Task.dueDate storage convention — every fake task below is built with
// `localDayToAllDayInstant`, the exact function every real Task.dueDate is
// written through, so this reproduces the real bug shape rather than an
// approximation of it.

/**
 * Reproduces the exact production trigger: a task is loaded via a wide
 * chunk (the initial scroll), then a narrower window — refreshChunkFor's
 * own real shape, triggered by completing or editing a DIFFERENT, nearby
 * task or event — is re-fetched and legitimately does NOT include this
 * task's own due day (it sits exactly on the narrower window's exclusive
 * edge). `fetchTasks` would correctly return `[]` for that narrower query
 * (actions/tasks.ts's own comment); passing `[]` here is that exact
 * response, replayed. A correct implementation must leave the task alone —
 * a REFRESH of a range that never claimed to cover this task's day must
 * not be read as proof the task was deleted.
 */
function assertTaskSurvivesEdgeRefresh(tz: string) {
  withTimeZone(tz, () => {
    // Window [Aug 28, Sep 11) local — the exact repro window mission-15/C5
    // was diagnosed against. A generous chunk seeds it first.
    const wideChunk = { start: d(2026, 7, 1), end: d(2026, 9, 30) }; // Aug 1 - Oct 30
    const dueSep11 = localDayToAllDayInstant(d(2026, 8, 11)); // real Task.dueDate convention
    const task = fakeTask("t-edge", dueSep11);

    const seeded = applyChunkResult(buildInitialScheduleState(d(2026, 8, 1)), "forward", wideChunk, [], [task]);
    assert.ok(seeded.entries.has("t-edge"), `sanity (${tz}): the task is loaded to start with`);

    // The narrow refresh: [Aug 28, Sep 11) — the task's own due day, Sep
    // 11, is the window's exclusive edge, so it correctly returns no tasks.
    const narrowChunk = { start: d(2026, 7, 28), end: d(2026, 8, 11) };
    const refreshed = applyRefresh(seeded, narrowChunk, [], []);

    assert.ok(
      refreshed.entries.has("t-edge"),
      `(${tz}) a task due on a refreshed window's own exclusive edge must survive — it was never claimed to be inside that window, so its absence from the fetch is not a deletion`,
    );
    assert.ok(refreshed.records.has("t-edge"), `(${tz}) its full record must survive alongside the entry`);
  });
}

test("mission-15/C5: a task due at a re-queried window's edge does not silently vanish (America/Denver — the real household zone, and the zone this bug was found in)", () => {
  assertTaskSurvivesEdgeRefresh("America/Denver");
});

test("mission-15/C5: the same scenario, re-run across every zone the contract requires — America/Los_Angeles, UTC, and Asia/Tokyo (east of UTC, the one zone this fix does not promise correct RENDER-day placement for, but must still never vanish)", () => {
  for (const tz of ["America/Los_Angeles", "UTC", "Asia/Tokyo"]) {
    assertTaskSurvivesEdgeRefresh(tz);
  }
});
