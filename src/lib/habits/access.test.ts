// Pins access.ts (decisions 78 and 79): who may see, edit and check a habit.

import { test } from "node:test";
import assert from "node:assert/strict";
import { canEditHabit, canLogFor, canNudge, canSeeHabit, canSeeHabitStats, type NudgeHabit } from "./access";
import type { HabitAccess, HabitActor } from "./types";

const admin: HabitActor = { userId: "admin", role: "admin" };
const parent: HabitActor = { userId: "parent", role: "parent" };
const kid: HabitActor = { userId: "kid", role: "kid" };
const other: HabitActor = { userId: "other", role: "kid" };
const device: HabitActor = { userId: "tablet", role: "device" };

const shared: HabitAccess = { isPrivate: false, participantIds: ["kid", "parent"] };
const hidden: HabitAccess = { isPrivate: true, participantIds: ["kid"] };

test("canSeeHabit: a shared habit is seen by everyone, the tablet included", () => {
  for (const actor of [admin, parent, kid, other, device]) assert.equal(canSeeHabit(actor, shared), true, actor.role);
});

test("canSeeHabit: a private habit only by its participants, never by the tablet", () => {
  assert.equal(canSeeHabit(kid, hidden), true);
  assert.equal(canSeeHabit(other, hidden), false);
  assert.equal(canSeeHabit(admin, hidden), false);
  assert.equal(canSeeHabit(device, hidden), false);
  assert.equal(canSeeHabit({ userId: "kid", role: "device" }, hidden), false);
});

test("canEditHabit: never the tablet; a participant or a manager", () => {
  assert.equal(canEditHabit(device, shared), false);
  assert.equal(canEditHabit(kid, shared), true); // participant
  assert.equal(canEditHabit(other, shared), false); // neither
  assert.equal(canEditHabit(parent, shared), true);
  assert.equal(canEditHabit(admin, shared), true); // manager, not a participant
  assert.equal(canEditHabit(admin, hidden), false); // private stays private
  assert.equal(canEditHabit(kid, hidden), true);
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

test("canSeeHabitStats: a participant opens it, private or not", () => {
  assert.equal(canSeeHabitStats(kid, shared), true);
  assert.equal(canSeeHabitStats(kid, hidden), true);
});

test("canSeeHabitStats: a manager or the tablet opens a shared habit they are not on", () => {
  for (const actor of [admin, parent, device]) assert.equal(canSeeHabitStats(actor, shared), true, actor.role);
  assert.equal(canSeeHabitStats(parent, { isPrivate: false, participantIds: ["kid"] }), true);
});

test("canSeeHabitStats: a private habit's stats open only for its participant", () => {
  for (const actor of [admin, parent, other, device]) assert.equal(canSeeHabitStats(actor, hidden), false, actor.role);
  assert.equal(canSeeHabitStats({ userId: "kid", role: "device" }, hidden), false);
});

test("canSeeHabitStats: another kid who is not on a shared habit gets nothing", () => {
  assert.equal(canSeeHabitStats(other, shared), false);
});

const eachHabit: NudgeHabit = { isPrivate: false, participantIds: ["kid", "parent"], sharing: "each", archived: false };

test("canNudge: one participant may nudge another on a live Side by side habit", () => {
  assert.equal(canNudge(kid, eachHabit, "parent"), true);
  assert.equal(canNudge(parent, eachHabit, "kid"), true);
});

test("canNudge: never yourself, never a non-participant on either end", () => {
  assert.equal(canNudge(kid, eachHabit, "kid"), false);
  assert.equal(canNudge(kid, eachHabit, "other"), false); // the recipient is not on it
  assert.equal(canNudge(other, eachHabit, "kid"), false); // the sender is not on it
  assert.equal(canNudge(admin, eachHabit, "kid"), false); // a manager who is not a participant
});

test("canNudge: never the tablet, even as a participant's login", () => {
  assert.equal(canNudge(device, eachHabit, "kid"), false);
  assert.equal(canNudge({ userId: "kid", role: "device" }, eachHabit, "parent"), false);
});

test("canNudge: refuses a private, archived or Together habit", () => {
  assert.equal(canNudge(kid, { ...eachHabit, isPrivate: true }, "parent"), false);
  assert.equal(canNudge(kid, { ...eachHabit, archived: true }, "parent"), false);
  assert.equal(canNudge(kid, { ...eachHabit, sharing: "together" }, "parent"), false);
});
