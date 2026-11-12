// Real unit tests (node:test) for the task undo rule, mission 74. No
// database involved: pure decisions over plain values.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TASK_UNDO_WINDOW_MS,
  TOO_LATE_TO_UNDO,
  NOT_ON_TASK,
  mayCompleteTask,
  uncompleteRefusal,
} from "./taskUndoRules";

const completedAt = new Date("2026-11-11T12:00:00Z");
const at = (ms: number) => new Date(completedAt.getTime() + ms);

test("TASK_UNDO_WINDOW_MS is 60 seconds", () => {
  assert.equal(TASK_UNDO_WINDOW_MS, 60_000);
});

test("uncompleteRefusal: parents and admins are allowed any time", () => {
  for (const role of ["admin", "parent"] as const) {
    assert.equal(
      uncompleteRefusal({ role, isOnTask: false, completedAt, now: at(30 * 86_400_000) }),
      null,
    );
  }
});

test("uncompleteRefusal: a task that is not complete is allowed for anyone", () => {
  for (const role of ["kid", "device"] as const) {
    assert.equal(
      uncompleteRefusal({ role, isOnTask: false, completedAt: null, now: at(0) }),
      null,
    );
  }
});

test("uncompleteRefusal: a kid on the task, exactly 60 000 ms, is allowed", () => {
  assert.equal(
    uncompleteRefusal({ role: "kid", isOnTask: true, completedAt, now: at(60_000) }),
    null,
  );
});

test("uncompleteRefusal: a kid on the task, 60 001 ms, is refused as too late", () => {
  assert.equal(
    uncompleteRefusal({ role: "kid", isOnTask: true, completedAt, now: at(60_001) }),
    TOO_LATE_TO_UNDO,
  );
});

test("uncompleteRefusal: a kid not on the task is refused inside the window", () => {
  assert.equal(
    uncompleteRefusal({ role: "kid", isOnTask: false, completedAt, now: at(1_000) }),
    NOT_ON_TASK,
  );
});

test("uncompleteRefusal: a kid not on the task is refused after the window", () => {
  assert.equal(
    uncompleteRefusal({ role: "kid", isOnTask: false, completedAt, now: at(120_000) }),
    NOT_ON_TASK,
  );
});

test("uncompleteRefusal: the tablet (not on any task) is allowed inside the window", () => {
  assert.equal(
    uncompleteRefusal({ role: "device", isOnTask: false, completedAt, now: at(60_000) }),
    null,
  );
});

test("uncompleteRefusal: the tablet is refused after the window", () => {
  assert.equal(
    uncompleteRefusal({ role: "device", isOnTask: false, completedAt, now: at(60_001) }),
    TOO_LATE_TO_UNDO,
  );
});

test("uncompleteRefusal: a completedAt in the future counts as inside the window", () => {
  assert.equal(
    uncompleteRefusal({ role: "kid", isOnTask: true, completedAt, now: at(-5_000) }),
    null,
  );
});

test("uncompleteRefusal: the refusal wording is the approved text", () => {
  assert.equal(TOO_LATE_TO_UNDO, "Too late to undo. Ask a parent to mark it not complete.");
  assert.equal(NOT_ON_TASK, "You're not assigned to that task.");
});

test("mayCompleteTask: truth table", () => {
  for (const canManage of [false, true]) {
    for (const isMine of [false, true]) {
      for (const isTablet of [false, true]) {
        assert.equal(
          mayCompleteTask({ canManage, isMine, isTablet }),
          canManage || isMine || isTablet,
        );
      }
    }
  }
  assert.equal(mayCompleteTask({ canManage: false, isMine: false, isTablet: false }), false);
});
