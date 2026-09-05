// Real unit tests (node:test, zero new dependencies) for the refresh half
// of scheduleWindowState.ts. Split out of scheduleWindowState.test.ts
// under contract C9 once that file crossed STRUCTURE.md's 650-line
// test-file cap — see that file's own header for why these functions
// can't be unit-tested from useScheduleWindow.ts directly (it
// transitively imports fetchCalendarEvents/fetchTasks -> dal.ts -> db.ts,
// which carries "server-only" and throws the instant a plain `node:test`
// process imports it).
//
// Per STRUCTURE.md's concern-split clause, the file that keeps the
// module's primary concern keeps the bare module name: that's
// scheduleWindowState.test.ts, right next to this one, which still holds
// buildInitialScheduleState, applyChunkResult, reopenAfterEmptyStreak,
// applyRefresh, and buildScheduleRenderMonths' own dedicated tests. This
// file holds refreshChunkFor's own tests, the real-DST regressions, and
// the C5/C7 refresh-merge bugs — everything that exercises a targeted
// re-fetch of an already-loaded window rather than the initial scroll.
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

// ---------------------------------------------------------------------------
// mission-15/C7 — Vision's blocker B2: a task edited to a due date MORE
// THAN 7 DAYS away vanishes until the whole view remounts. A different
// mechanism from C5 above (that one was a REFRESH wrongly reading a
// still-valid task as server-deleted); this one is a refresh that's
// legitimately correct on its own — the OLD day's chunk genuinely no
// longer contains the task after the edit — but was the ONLY refresh ever
// fired. ScheduleView.tsx's `TaskDetailSheet` `onChanged` handler used to
// call `refreshDay` with just the stale `selectedTask.dueDate` it captured
// when the sheet was opened; nothing ever re-fetched the day the task
// actually moved TO, so its entry was dropped by `mergeWindow` (correctly,
// for that one query) and never re-added by anything else.
//
// C7's fix lives entirely in ScheduleView.tsx / TaskDetailSheet.tsx (no
// change to scheduleWindowState.ts) — it's the CALLING pattern that was
// wrong, not the pure merge logic mergeWindow/applyRefresh already
// implement correctly. Per this repo's own established practice for view-
// orchestration code with no meaning outside a real DOM (see
// useScheduleWindow.ts's and useCalendarNavigation.ts's own header
// comments — "verified live in the running app rather than a renderer-
// free unit test"), there's no seam here to unit-test the JSX handler
// itself. What CAN be pinned down, and is below: the state-layer boundary
// the fix depends on — that refreshing only the OLD day loses a task moved
// past the 14-day refresh span (red), that ALSO refreshing the NEW day
// restores it (green, and the exact two-call sequence the fixed
// `onChanged` now performs), that a move small enough to stay inside the
// old day's own refresh span survives on a single refresh (the control
// proving this is a >7-day BOUNDARY bug, not "editing is broken"), and
// that a second consecutive edit lands correctly too (proving the fix
// re-seats which day counts as "old" rather than special-casing the first
// move — see ScheduleView.tsx's own comment on why `selectedTask` is
// re-seated from the saved record on every successful edit).

/** Where (if anywhere) a task with this id renders after a merge — the
 * question every test below actually cares about, not just "is its entry
 * present" (an id could theoretically survive in `state.entries` yet
 * resolve to zero rendered days if `state.records` disagreed; going
 * through the real render path is what `buildScheduleRenderMonths`'s own
 * production caller — ScheduleView.tsx — actually sees). */
function findTaskDay(state: ScheduleWindowState, today: Date, taskId: string): Date | null {
  const months = buildScheduleRenderMonths(state, today);
  for (const month of months) {
    for (const row of month.days) {
      if (row.tasks.some((task) => task.id === taskId)) return row.day;
    }
  }
  return null;
}

test("mission-15/C7 (red): refreshing ONLY the old day after a >7-day move drops the task for good — the exact production bug", () => {
  const wideChunk = { start: d(2026, 7, 1), end: d(2026, 9, 30) }; // Aug 1 - Oct 30
  const dueSep10 = localDayToAllDayInstant(d(2026, 8, 10));
  const seeded = applyChunkResult(
    buildInitialScheduleState(d(2026, 8, 1)),
    "forward",
    wideChunk,
    [],
    [fakeTask("t-move", dueSep10)],
  );
  assert.ok(seeded.entries.has("t-move"), "sanity: loaded to start with");

  // The task is edited to Sep 25 — 15 days away, outside refreshChunkFor's
  // own 14-day span around the OLD due date ([Sep 3, Sep 17)). A real
  // fetchTasks(Sep 3, Sep 17) called AFTER the edit correctly returns []:
  // the task genuinely isn't due in that range anymore. That's exactly the
  // input the pre-fix `onChanged` produced by only ever refreshing the day
  // it had on hand when the sheet was opened.
  const buggyResult = applyRefresh(seeded, refreshChunkFor(d(2026, 8, 10)), [], []);

  assert.equal(buggyResult.entries.has("t-move"), false, "the entry is dropped — nothing else ever re-adds it");
  assert.equal(findTaskDay(buggyResult, d(2026, 8, 1), "t-move"), null, "renders on NO day at all — the vanish, reproduced");
});

test("mission-15/C7 (green): also refreshing the NEW day — the fixed sequence — restores the task at its true position", () => {
  const wideChunk = { start: d(2026, 7, 1), end: d(2026, 9, 30) };
  const dueSep10 = localDayToAllDayInstant(d(2026, 8, 10));
  const seeded = applyChunkResult(
    buildInitialScheduleState(d(2026, 8, 1)),
    "forward",
    wideChunk,
    [],
    [fakeTask("t-move", dueSep10)],
  );

  // ScheduleView.tsx's fixed `onChanged`: refresh the OLD day first (the
  // real post-edit fetch for that now-stale range: empty), then — since
  // the new day differs from the old — the NEW day too, with the task's
  // real current data.
  const dueSep25 = localDayToAllDayInstant(d(2026, 8, 25));
  const afterOldRefresh = applyRefresh(seeded, refreshChunkFor(d(2026, 8, 10)), [], []);
  const afterNewRefresh = applyRefresh(afterOldRefresh, refreshChunkFor(d(2026, 8, 25)), [], [fakeTask("t-move", dueSep25)]);

  const renderedDay = findTaskDay(afterNewRefresh, d(2026, 8, 1), "t-move");
  assert.ok(renderedDay, "must render on SOME day after both refreshes");
  assert.equal(renderedDay?.getMonth(), 8, "September");
  assert.equal(renderedDay?.getDate(), 25, "at its NEW due date, not the old one");
});

test("mission-15/C7 control: a 3-day move stays INSIDE refreshChunkFor's own 14-day span, so a single old-day refresh is already correct — proves the fix targets the >7-day BOUNDARY, not editing in general", () => {
  const wideChunk = { start: d(2026, 7, 1), end: d(2026, 9, 30) };
  const dueSep10 = localDayToAllDayInstant(d(2026, 8, 10));
  const seeded = applyChunkResult(
    buildInitialScheduleState(d(2026, 8, 1)),
    "forward",
    wideChunk,
    [],
    [fakeTask("t-small-move", dueSep10)],
  );

  // Sep 13 (+3 days) is still inside [Sep 3, Sep 17) — the OLD day's own
  // refresh span — so a real fetchTasks(Sep 3, Sep 17) after this edit
  // correctly returns the task with its new date. A single old-day
  // refresh, exactly what the pre-fix code always did, is already enough.
  const dueSep13 = localDayToAllDayInstant(d(2026, 8, 13));
  const afterOldRefresh = applyRefresh(seeded, refreshChunkFor(d(2026, 8, 10)), [], [fakeTask("t-small-move", dueSep13)]);

  const renderedDay = findTaskDay(afterOldRefresh, d(2026, 8, 1), "t-small-move");
  assert.ok(renderedDay, "must still render somewhere");
  assert.equal(renderedDay?.getDate(), 13, "at its new (nearby) date, via the single refresh alone");
});

test('mission-15/C7: a SECOND consecutive edit (Sep 25 -> Oct 20) also lands correctly, proving the fix re-seats its notion of "old day" rather than special-casing the first move', () => {
  const wideChunk = { start: d(2026, 7, 1), end: d(2026, 9, 30) };
  const dueSep10 = localDayToAllDayInstant(d(2026, 8, 10));
  const seeded = applyChunkResult(
    buildInitialScheduleState(d(2026, 8, 1)),
    "forward",
    wideChunk,
    [],
    [fakeTask("t-double-move", dueSep10)],
  );

  // Edit 1: Sep 10 -> Sep 25, the fixed two-refresh sequence (as above).
  const dueSep25 = localDayToAllDayInstant(d(2026, 8, 25));
  const afterEdit1Old = applyRefresh(seeded, refreshChunkFor(d(2026, 8, 10)), [], []);
  const afterEdit1 = applyRefresh(
    afterEdit1Old,
    refreshChunkFor(d(2026, 8, 25)),
    [],
    [fakeTask("t-double-move", dueSep25)],
  );
  assert.equal(findTaskDay(afterEdit1, d(2026, 8, 1), "t-double-move")?.getDate(), 25, "sanity: edit 1 landed at Sep 25 first");

  // Edit 2: Sep 25 -> Oct 20. The "old day" for THIS refresh must be Sep
  // 25 — the RE-SEATED value ScheduleView.tsx now tracks in `selectedTask`
  // after edit 1 — not the original Sep 10 the sheet opened with. Using
  // the true current old day (Sep 25) is what correctly empties that
  // position; using the stale original would refresh the wrong range.
  const dueOct20 = localDayToAllDayInstant(d(2026, 9, 20));
  const afterEdit2Old = applyRefresh(afterEdit1, refreshChunkFor(d(2026, 8, 25)), [], []);
  const afterEdit2 = applyRefresh(
    afterEdit2Old,
    refreshChunkFor(d(2026, 9, 20)),
    [],
    [fakeTask("t-double-move", dueOct20)],
  );

  const months = buildScheduleRenderMonths(afterEdit2, d(2026, 8, 1));
  const rowsWithTask = months.flatMap((m) => m.days).filter((row) => row.tasks.some((t) => t.id === "t-double-move"));
  assert.equal(rowsWithTask.length, 1, "must render on exactly ONE day, not zero and not two");
  assert.equal(rowsWithTask[0].day.getMonth(), 9, "October");
  assert.equal(rowsWithTask[0].day.getDate(), 20);
});
