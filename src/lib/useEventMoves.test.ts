// Mission 70 (C4): the pure parts of useEventMoves.ts, the Undo bar's words
// and the optimistic move, and (F1) the await half of useOptimisticRun's
// `run` that its save now goes through: `onError` gets the server's reason. Dates are built from local parts and read back
// with local getters (the same clock the timeline draws), so these hold
// under TZ=America/Denver and TZ=UTC alike. Run with `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { applyMove, movedToText } from "./useEventMoves";
import { SAVE_FAILED, settleAction } from "./useOptimisticRun";
import type { CalendarEventView } from "./types";

test("movedToText names the weekday and the clock time", () => {
  // Wed 11 Nov 2026, 2:15 PM local.
  assert.equal(movedToText(new Date(2026, 10, 11, 14, 15)), "Moved to Wed 2:15 PM");
});

test("movedToText drops :00 like the rest of the calendar", () => {
  assert.equal(movedToText(new Date(2026, 10, 15, 9, 0)), "Moved to Sun 9 AM");
});

const event = (id: string, h: number): CalendarEventView => ({
  id,
  title: id,
  notes: null,
  location: null,
  startAt: new Date(2026, 10, 11, h),
  endAt: new Date(2026, 10, 11, h + 1),
  allDay: false,
  people: [],
  createdByName: null,
  syncs: [],
});

test("applyMove moves only the named event and leaves the list order", () => {
  const list = [event("a", 9), event("b", 12)];
  const startAt = new Date(2026, 10, 11, 14, 15);
  const endAt = new Date(2026, 10, 11, 15, 15);
  const moved = applyMove(list, { id: "a", startAt, endAt });
  assert.deepEqual(moved.map((e) => e.id), ["a", "b"]);
  assert.equal(moved[0].startAt, startAt);
  assert.equal(moved[0].endAt, endAt);
  assert.equal(moved[1], list[1]);
  assert.equal(list[0].startAt.getHours(), 9, "the server's list is not changed");
});

test("applyMove with an unknown id changes nothing", () => {
  const list = [event("a", 9)];
  const moved = applyMove(list, { id: "gone", startAt: new Date(), endAt: new Date() });
  assert.deepEqual(moved, list);
});

// What settleAction reported: the failure lines and how many successes.
async function settled(action: () => Promise<{ error?: string }>) {
  const failures: string[] = [];
  let successes = 0;
  await settleAction(action, (message) => failures.push(message), () => (successes += 1));
  return { failures, successes };
}

test("settleAction hands a refusal's own reason to the error callback, never onSuccess", async () => {
  const reason = "That move would end on another day.";
  assert.deepEqual(await settled(async () => ({ error: reason })), { failures: [reason], successes: 0 });
});

test("settleAction turns a call that never reached the server into SAVE_FAILED", async () => {
  const r = await settled(async () => {
    throw new TypeError("Failed to fetch");
  });
  assert.deepEqual(r, { failures: [SAVE_FAILED], successes: 0 });
});

test("settleAction runs onSuccess once and no error callback when the save lands", async () => {
  assert.deepEqual(await settled(async () => ({})), { failures: [], successes: 1 });
});
