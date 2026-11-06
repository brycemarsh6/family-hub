// Pins access.ts (decisions 78 and 79): who may see, edit and check a habit.

import { test } from "node:test";
import assert from "node:assert/strict";
import { canChangeChore, canEditChart, canEditHabit, canLogFor, canNudge, canSeeHabit, canSeeHabitReport, canSeeHabitStats, othersPrivateHidden, showsOnFamilyView, type NudgeHabit } from "./access";
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

test("canNudge: refuses a deactivated recipient but not an active one beside them", () => {
  const withInactive: NudgeHabit = { ...eachHabit, participantIds: ["kid", "parent", "gone"], deactivatedIds: ["gone"] };
  assert.equal(canNudge(kid, withInactive, "gone"), false);
  assert.equal(canNudge(kid, withInactive, "parent"), true);
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

test("canEditChart: yourself; a parent or admin for anyone; a kid only their own; never the tablet", () => {
  assert.equal(canEditChart(kid, "kid"), true);
  assert.equal(canEditChart(kid, "other"), false);
  assert.equal(canEditChart(other, "kid"), false);
  assert.equal(canEditChart(parent, "kid"), true);
  assert.equal(canEditChart(admin, "kid"), true);
  assert.equal(canEditChart(device, "kid"), false);
  assert.equal(canEditChart({ userId: "kid", role: "device" }, "kid"), false);
});

test("canSeeHabitReport: yourself; a parent or admin for anyone; a kid only their own; never the tablet", () => {
  assert.equal(canSeeHabitReport(kid, "kid"), true);
  assert.equal(canSeeHabitReport(kid, "other"), false);
  assert.equal(canSeeHabitReport(other, "kid"), false);
  assert.equal(canSeeHabitReport(parent, "kid"), true);
  assert.equal(canSeeHabitReport(admin, "kid"), true);
  assert.equal(canSeeHabitReport(device, "kid"), false);
  assert.equal(canSeeHabitReport({ userId: "kid", role: "device" }, "kid"), false);
});

test("canChangeChore: the person must hold the chore, see it and be editable by the actor", () => {
  const solo: HabitAccess = { isPrivate: false, participantIds: ["kid"] };
  assert.equal(canChangeChore(kid, solo, "kid"), true);
  assert.equal(canChangeChore(parent, solo, "kid"), true);
  assert.equal(canChangeChore(admin, solo, "kid"), true);
  assert.equal(canChangeChore(parent, solo, "other"), false, "not a participant");
  assert.equal(canChangeChore(other, solo, "kid"), false, "a kid cannot edit another's chart");
  assert.equal(canChangeChore(device, solo, "kid"), false);
  assert.equal(canChangeChore(parent, hidden, "kid"), false, "a private chore is invisible to a parent");
  assert.equal(canChangeChore(kid, hidden, "kid"), true);
});

test("canChangeChore: a chore shared by more than one person is a parent's or admin's to change (decision 125)", () => {
  assert.equal(canChangeChore(kid, shared, "kid"), false);
  assert.equal(canChangeChore(parent, shared, "kid"), true);
  assert.equal(canChangeChore(parent, shared, "parent"), true);
  assert.equal(canChangeChore(admin, shared, "kid"), true);
  assert.equal(canChangeChore(device, shared, "kid"), false);
});

test("canNudge: never about an hours habit (decision 197)", () => {
  assert.equal(canNudge(kid, { ...eachHabit, track: "hours" }, "parent"), false);
  assert.equal(canNudge(kid, { ...eachHabit, track: "checks" }, "parent"), true);
});

test("othersPrivateHidden: your own habits show in full, another person's only when not private", () => {
  assert.deepEqual(othersPrivateHidden(kid, "kid"), {});
  assert.deepEqual(othersPrivateHidden(kid, "other"), { isPrivate: false });
  assert.deepEqual(othersPrivateHidden(parent, "kid"), { isPrivate: false });
});

test("showsOnFamilyView: a private habit never shows, whoever looks", () => {
  assert.equal(showsOnFamilyView({ isPrivate: false }), true);
  assert.equal(showsOnFamilyView({ isPrivate: true }), false);
});
