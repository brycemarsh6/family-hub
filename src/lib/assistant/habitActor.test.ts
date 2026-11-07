import { test } from "node:test";
import assert from "node:assert/strict";
import { canEditHabit, canLogFor, canSeeHabit } from "@/lib/habits/access";
import { habitActorFor } from "./habitActor";

const privateOfBryce = { isPrivate: true, participantIds: ["bryce"] };
const privateOfEmily = { isPrivate: true, participantIds: ["emily"] };
const shared = { isPrivate: false, participantIds: ["bryce", "emily"] };

test("habitActorFor: an admin carrying the owner's id", () => {
  assert.deepEqual(habitActorFor("bryce"), { userId: "bryce", role: "admin" });
});

test("with the owner set she sees his private habits and nobody else's", () => {
  const actor = habitActorFor("bryce");
  assert.ok(canSeeHabit(actor, privateOfBryce));
  assert.ok(!canSeeHabit(actor, privateOfEmily));
  assert.ok(canSeeHabit(actor, shared));
  assert.ok(canEditHabit(actor, privateOfBryce));
  assert.ok(!canEditHabit(actor, privateOfEmily));
});

test("she may check for anyone on a habit she can see", () => {
  const actor = habitActorFor("bryce");
  assert.ok(canLogFor(actor, "emily", shared));
  assert.ok(!canLogFor(actor, "emily", privateOfEmily));
  assert.ok(!canLogFor(actor, "bryce", { isPrivate: false, participantIds: ["emily"] }));
});

test("with the owner unset she sees only habits that are not private", () => {
  const actor = habitActorFor(undefined);
  assert.equal(actor.userId, "");
  assert.ok(!canSeeHabit(actor, privateOfBryce));
  assert.ok(!canSeeHabit(actor, privateOfEmily));
  assert.ok(canSeeHabit(actor, shared));
});
