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
// Contract C9 split this file by concern once it crossed STRUCTURE.md's
// 650-line test-file cap. Per STRUCTURE.md's concern-split clause, this
// file keeps the module's primary concern — buildInitialScheduleState,
// applyChunkResult (including C6's refusal-vs-empty cases),
// reopenAfterEmptyStreak, applyRefresh, and buildScheduleRenderMonths —
// and so keeps the module's bare name. refreshChunkFor's own dedicated
// tests, the real-DST regressions, and the C5/C7 refresh-merge bugs live
// in the sibling file, scheduleWindowStateRefresh.test.ts, right next to
// this one.
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
  MAX_CONSECUTIVE_EMPTY_CHUNKS,
  refreshChunkFor,
  reopenAfterEmptyStreak,
  type ScheduleWindowState,
} from "./scheduleWindowState";
import { addDays } from "./mealPlanDates";
import { calendarDayDiff } from "./calendarDates";
import type { CalendarEventView, CalendarTaskView } from "./types";

function d(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(year, month, day, hour, minute);
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

// ---------------------------------------------------------------------------
// mission-15/C6 (B3) — a refusal (null) stops a direction immediately; a
// genuinely empty chunk ([]) ADVANCES the boundary and keeps going, up to a
// bounded streak of consecutive empties. This amends the original D2
// contract, which conflated the two by returning `[]` for both — verified
// live to permanently wall off real, further-out data behind one quiet
// 30-day chunk. See applyChunkResult's own header for the full mechanism.

test("applyChunkResult: a REFUSAL (null) does not advance the boundary and flips hasMore to false immediately", () => {
  const initial = buildInitialScheduleState(d(2026, 5, 15));
  const chunk = { start: d(2026, 4, 16), end: d(2026, 5, 15) };

  const next = applyChunkResult(initial, "backward", chunk, null, null);

  assert.equal(
    next.windowStart.getTime(),
    initial.windowStart.getTime(),
    "a refused range must not start looking loaded — the boundary must not move",
  );
  assert.equal(next.hasMoreBackward, false, "a refusal must never be retried");
  // The forward direction, and every other field, must be completely
  // unaffected by a backward chunk being refused.
  assert.equal(next.windowEnd.getTime(), initial.windowEnd.getTime());
  assert.equal(next.hasMoreForward, initial.hasMoreForward);
  assert.equal(next.entries.size, 0);
});

test("applyChunkResult: a refusal on just ONE of events/tasks is still treated as a refusal for the whole chunk", () => {
  const initial = buildInitialScheduleState(d(2026, 5, 15));
  const chunk = { start: d(2026, 5, 15), end: d(2026, 6, 14) };

  const eventsRefused = applyChunkResult(initial, "forward", chunk, null, []);
  assert.equal(eventsRefused.hasMoreForward, false);
  assert.equal(eventsRefused.windowEnd.getTime(), initial.windowEnd.getTime());

  const tasksRefused = applyChunkResult(initial, "forward", chunk, [], null);
  assert.equal(tasksRefused.hasMoreForward, false);
  assert.equal(tasksRefused.windowEnd.getTime(), initial.windowEnd.getTime());
});

test("applyChunkResult: a genuinely EMPTY result (no events, no tasks) still ADVANCES the boundary and keeps hasMore true", () => {
  const initial = buildInitialScheduleState(d(2026, 5, 15));
  const chunk = { start: d(2026, 4, 16), end: d(2026, 5, 15) };

  const next = applyChunkResult(initial, "backward", chunk, [], []);

  assert.equal(
    next.windowStart.getTime(),
    chunk.start.getTime(),
    "a confirmed-but-empty range IS checked territory — the boundary must advance",
  );
  assert.equal(next.hasMoreBackward, true, "one empty chunk must not stop scrolling — see B3");
  assert.equal(next.emptyStreakBackward, 1);
  // The forward direction, and every other field, must be completely
  // unaffected by a backward chunk coming back empty.
  assert.equal(next.windowEnd.getTime(), initial.windowEnd.getTime());
  assert.equal(next.hasMoreForward, initial.hasMoreForward);
});

test("applyChunkResult: an empty FORWARD result mirrors the backward case — advances windowEnd, keeps hasMoreForward true", () => {
  const initial = buildInitialScheduleState(d(2026, 5, 15));
  const chunk = { start: d(2026, 5, 15), end: d(2026, 6, 14) };

  const next = applyChunkResult(initial, "forward", chunk, [], []);

  assert.equal(next.windowEnd.getTime(), chunk.end.getTime());
  assert.equal(next.hasMoreForward, true);
  assert.equal(next.emptyStreakForward, 1);
  assert.equal(next.hasMoreBackward, initial.hasMoreBackward);
});

test("applyChunkResult: the real B3 scenario — a quiet chunk in between must not wall off real data further out", () => {
  // today Sep 4, a quiet "October", Thanksgiving beyond it in November.
  let state = buildInitialScheduleState(d(2026, 8, 4)); // Sep 4
  const quietChunk = { start: d(2026, 8, 4), end: d(2026, 9, 4) }; // Sep 4 - Oct 4, empty
  state = applyChunkResult(state, "forward", quietChunk, [], []);
  assert.equal(state.hasMoreForward, true, "a single quiet chunk must not stop forward scrolling");
  assert.equal(state.windowEnd.getTime(), quietChunk.end.getTime());

  const thanksgivingChunk = { start: d(2026, 9, 4), end: d(2026, 10, 4) }; // Oct 4 - Nov 4
  const thanksgiving = fakeEvent("thanksgiving", d(2026, 10, 26, 12, 0), d(2026, 10, 26, 13, 0));
  state = applyChunkResult(state, "forward", thanksgivingChunk, [thanksgiving], []);

  assert.ok(state.entries.has("thanksgiving"), "the real event beyond the quiet chunk must be reachable");
  assert.equal(state.emptyStreakForward, 0, "a non-empty chunk resets the streak");
});

test("applyChunkResult: MAX_CONSECUTIVE_EMPTY_CHUNKS consecutive empties eventually stop a direction for good", () => {
  let state = buildInitialScheduleState(d(2026, 5, 15));
  let cursor = state.windowEnd;

  for (let i = 0; i < MAX_CONSECUTIVE_EMPTY_CHUNKS; i++) {
    assert.equal(state.hasMoreForward, true, `must still be scrolling before empty chunk #${i + 1}`);
    const chunk = { start: cursor, end: addDays(cursor, 30) };
    state = applyChunkResult(state, "forward", chunk, [], []);
    cursor = chunk.end;
  }

  assert.equal(
    state.emptyStreakForward,
    MAX_CONSECUTIVE_EMPTY_CHUNKS,
    "sanity: every one of those chunks really was empty",
  );
  assert.equal(
    state.hasMoreForward,
    false,
    "hitting the cap must stop the direction the same way a refusal does",
  );

  // And it must actually STAY stopped — calling again (as a caller
  // ignoring hasMoreForward might) must not un-stop it.
  const oneMore = { start: cursor, end: addDays(cursor, 30) };
  const next = applyChunkResult(state, "forward", oneMore, [], []);
  assert.equal(next.hasMoreForward, false);
});

// ---------------------------------------------------------------------------
// mission-15/C8 (B3) — reopenAfterEmptyStreak: the "let a further scroll
// gesture extend it" half. A direction that stopped because it hit
// MAX_CONSECUTIVE_EMPTY_CHUNKS gets exactly one more chunk's worth of
// budget; a direction stopped by a genuine refusal, or not stopped at all,
// is untouched.

test("reopenAfterEmptyStreak: reopens a direction stopped by the empty cap, without resetting its streak", () => {
  const stopped = {
    ...buildInitialScheduleState(d(2026, 5, 15)),
    hasMoreBackward: false,
    emptyStreakBackward: MAX_CONSECUTIVE_EMPTY_CHUNKS,
  };
  const reopened = reopenAfterEmptyStreak(stopped, "backward");
  assert.equal(reopened.hasMoreBackward, true, "must reopen the stopped direction");
  assert.equal(
    reopened.emptyStreakBackward,
    MAX_CONSECUTIVE_EMPTY_CHUNKS,
    "the streak is NOT reset — one more empty chunk must re-stop immediately, not buy a whole new batch",
  );
});

test("reopenAfterEmptyStreak: mirrors for the forward direction", () => {
  const stopped = {
    ...buildInitialScheduleState(d(2026, 5, 15)),
    hasMoreForward: false,
    emptyStreakForward: MAX_CONSECUTIVE_EMPTY_CHUNKS,
  };
  const reopened = reopenAfterEmptyStreak(stopped, "forward");
  assert.equal(reopened.hasMoreForward, true);
  assert.equal(reopened.emptyStreakForward, MAX_CONSECUTIVE_EMPTY_CHUNKS);
});

test("reopenAfterEmptyStreak: a no-op on a direction stopped by a REFUSAL, not the empty cap — D2's 'never retry a refusal' rule", () => {
  const refused = {
    ...buildInitialScheduleState(d(2026, 5, 15)),
    hasMoreBackward: false,
    emptyStreakBackward: 0, // a refusal never advances the streak — see applyChunkResult's null branch
  };
  const next = reopenAfterEmptyStreak(refused, "backward");
  assert.equal(next, refused, "must return the exact same state object — a refusal must never be retried");
});

test("reopenAfterEmptyStreak: a no-op when the direction hasn't stopped at all", () => {
  const running = buildInitialScheduleState(d(2026, 5, 15));
  assert.equal(reopenAfterEmptyStreak(running, "backward"), running);
  assert.equal(reopenAfterEmptyStreak(running, "forward"), running);
});

test("reopenAfterEmptyStreak: end to end — reopening buys exactly ONE more chunk, then re-stops on the next empty one", () => {
  let state = buildInitialScheduleState(d(2026, 5, 15));
  let cursor = state.windowEnd;
  for (let i = 0; i < MAX_CONSECUTIVE_EMPTY_CHUNKS; i++) {
    const chunk = { start: cursor, end: addDays(cursor, 30) };
    state = applyChunkResult(state, "forward", chunk, [], []);
    cursor = chunk.end;
  }
  assert.equal(state.hasMoreForward, false, "sanity: stopped by the cap, same as the earlier test");

  state = reopenAfterEmptyStreak(state, "forward");
  assert.equal(state.hasMoreForward, true);

  const nextEmptyChunk = { start: cursor, end: addDays(cursor, 30) };
  state = applyChunkResult(state, "forward", nextEmptyChunk, [], []);
  assert.equal(state.hasMoreForward, false, "one more empty chunk after reopening must re-stop it immediately");
  cursor = nextEmptyChunk.end;

  // Reopen again, but this time a REAL event shows up — ordinary automatic
  // loading must resume from there, exactly as if it had never stopped.
  state = reopenAfterEmptyStreak(state, "forward");
  const realChunk = { start: cursor, end: addDays(cursor, 30) };
  const realEvent = fakeEvent("distant", addDays(cursor, 5), addDays(cursor, 6));
  state = applyChunkResult(state, "forward", realChunk, [realEvent], []);
  assert.equal(state.hasMoreForward, true, "a real chunk resets the streak and keeps the direction open");
  assert.equal(state.emptyStreakForward, 0);
  assert.ok(state.entries.has("distant"), "the distant event must actually be reachable this way");
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

test("applyRefresh: a REFUSAL (null) leaves state completely untouched — a refused re-check tells us nothing new", () => {
  const chunk = { start: d(2026, 5, 1), end: d(2026, 6, 1) };
  const seeded = applyChunkResult(
    buildInitialScheduleState(d(2026, 5, 15)),
    "forward",
    chunk,
    [fakeEvent("keep", d(2026, 5, 10), d(2026, 5, 11))],
    [],
  );

  const refreshed = applyRefresh(seeded, refreshChunkFor(d(2026, 5, 10)), null, null);
  assert.equal(refreshed, seeded, "a refusal must return the exact same state object, not merely an equal one");
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
    emptyStreakBackward: 0,
    emptyStreakForward: 0,
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
    emptyStreakBackward: 0,
    emptyStreakForward: 0,
  };
  const months = buildScheduleRenderMonths(state, d(2026, 5, 1));
  assert.equal(months.length, 1);
  assert.deepEqual(months[0].days[0].events, []);
  assert.deepEqual(months[0].days[0].tasks, []);
});

