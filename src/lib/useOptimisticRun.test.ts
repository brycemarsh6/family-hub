// Mission 70 (F1, moved here in F2): the await half of useOptimisticRun.ts's
// `run`, `settleAction`, which every optimistic save goes through: a refusal's
// own reason reaches the error callback (useEventMoves's `onError`), a call
// that never reached the server becomes SAVE_FAILED, and onSuccess runs only
// when the save lands. No React test tooling here, so `run` itself is covered
// through this seam. Run with `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { SAVE_FAILED, settleAction } from "./useOptimisticRun";

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
