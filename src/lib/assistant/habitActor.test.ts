import { test } from "node:test";
import assert from "node:assert/strict";
import { canEditHabit, canLogFor, canSeeHabit } from "@/lib/habits/access";
import { assistantHabitActor } from "./habitActor";

function withOwner<T>(value: string | undefined, run: () => T): T {
  const saved = process.env.ASSISTANT_OWNER_USER_ID;
  if (value === undefined) delete process.env.ASSISTANT_OWNER_USER_ID;
  else process.env.ASSISTANT_OWNER_USER_ID = value;
  try {
    return run();
  } finally {
    if (saved === undefined) delete process.env.ASSISTANT_OWNER_USER_ID;
    else process.env.ASSISTANT_OWNER_USER_ID = saved;
  }
}

const privateOfBryce = { isPrivate: true, participantIds: ["bryce"] };
const privateOfEmily = { isPrivate: true, participantIds: ["emily"] };
const shared = { isPrivate: false, participantIds: ["bryce", "emily"] };

test("assistantHabitActor: an admin carrying the owner's id", () => {
  assert.deepEqual(withOwner("bryce", assistantHabitActor), { userId: "bryce", role: "admin" });
});

test("with the owner set she sees his private habits and nobody else's", () => {
  withOwner("bryce", () => {
    const actor = assistantHabitActor();
    assert.ok(canSeeHabit(actor, privateOfBryce));
    assert.ok(!canSeeHabit(actor, privateOfEmily));
    assert.ok(canSeeHabit(actor, shared));
    assert.ok(canEditHabit(actor, privateOfBryce));
    assert.ok(!canEditHabit(actor, privateOfEmily));
  });
});

test("she may check for anyone on a habit she can see", () => {
  withOwner("bryce", () => {
    const actor = assistantHabitActor();
    assert.ok(canLogFor(actor, "emily", shared));
    assert.ok(!canLogFor(actor, "emily", privateOfEmily));
    assert.ok(!canLogFor(actor, "bryce", { isPrivate: false, participantIds: ["emily"] }));
  });
});

test("with the owner unset she sees only habits that are not private", () => {
  withOwner(undefined, () => {
    const actor = assistantHabitActor();
    assert.equal(actor.userId, "");
    assert.ok(!canSeeHabit(actor, privateOfBryce));
    assert.ok(!canSeeHabit(actor, privateOfEmily));
    assert.ok(canSeeHabit(actor, shared));
  });
});
