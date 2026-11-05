// Pins access.ts (decisions 78 and 79): who may see, edit and check a habit.

import { test } from "node:test";
import assert from "node:assert/strict";
import { canEdit, canLogFor, canSee } from "./access";
import type { HabitAccess, HabitActor } from "./types";

const admin: HabitActor = { userId: "admin", role: "admin" };
const parent: HabitActor = { userId: "parent", role: "parent" };
const kid: HabitActor = { userId: "kid", role: "kid" };
const other: HabitActor = { userId: "other", role: "kid" };
const device: HabitActor = { userId: "tablet", role: "device" };

const shared: HabitAccess = { isPrivate: false, participantIds: ["kid", "parent"] };
const hidden: HabitAccess = { isPrivate: true, participantIds: ["kid"] };

test("canSee: a shared habit is seen by everyone, the tablet included", () => {
  for (const actor of [admin, parent, kid, other, device]) assert.equal(canSee(actor, shared), true, actor.role);
});

test("canSee: a private habit only by its participants, never by the tablet", () => {
  assert.equal(canSee(kid, hidden), true);
  assert.equal(canSee(other, hidden), false);
  assert.equal(canSee(admin, hidden), false);
  assert.equal(canSee(device, hidden), false);
  assert.equal(canSee({ userId: "kid", role: "device" }, hidden), false);
});

test("canEdit: never the tablet; a participant or a manager", () => {
  assert.equal(canEdit(device, shared), false);
  assert.equal(canEdit(kid, shared), true); // participant
  assert.equal(canEdit(other, shared), false); // neither
  assert.equal(canEdit(parent, shared), true);
  assert.equal(canEdit(admin, shared), true); // manager, not a participant
  assert.equal(canEdit(admin, hidden), false); // private stays private
  assert.equal(canEdit(kid, hidden), true);
});

test("canLogFor: yourself, when you are a participant", () => {
  assert.equal(canLogFor(kid, "kid", shared), true);
  assert.equal(canLogFor(other, "other", shared), false); // not a participant
});

test("canLogFor: the tablet for any participant, a manager for any participant, a kid not for others", () => {
  assert.equal(canLogFor(device, "kid", shared), true);
  assert.equal(canLogFor(device, "parent", shared), true);
  assert.equal(canLogFor(parent, "kid", shared), true);
  assert.equal(canLogFor(admin, "kid", shared), true);
  assert.equal(canLogFor(kid, "parent", shared), false);
});

test("canLogFor: forUserId must be a participant, even for a manager or the tablet", () => {
  assert.equal(canLogFor(admin, "other", shared), false);
  assert.equal(canLogFor(device, "other", shared), false);
});

test("canLogFor: the tablet cannot check a private habit", () => {
  assert.equal(canLogFor(device, "kid", hidden), false);
  assert.equal(canLogFor(kid, "kid", hidden), true);
  assert.equal(canLogFor(admin, "kid", hidden), false);
});
