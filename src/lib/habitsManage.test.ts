// Pins habitsManage.ts (person, chips, addresses) and habitsToday.ts's
// Manage lists (`buildManageLists`): whose list shows, in whose order, and
// which private habits stay out. Plain dates and instants, so the results are
// the same in every time zone.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { HabitActor } from "./habits/types";
import { choreChartHref, editHabitHref, manageHref, managePersonChips, newHabitHref, personParam, resolveManagePerson } from "./habitsManage";
import { buildManageLists, buildTodayPage, type TodayHabitInput } from "./habitsToday";

const parent: HabitActor = { userId: "mom", role: "parent" };
const kid: HabitActor = { userId: "ledger", role: "kid" };
const tablet: HabitActor = { userId: "tablet", role: "device" };
const people = [
  { id: "dad", displayName: "Bryce Marsh", avatarColor: "blue" },
  { id: "mom", displayName: "Mom Marsh", avatarColor: "red" },
  { id: "ledger", displayName: "Ledger", avatarColor: "green" },
];
const old = new Date("2026-01-01T12:00:00Z");

function habit(id: string, who: Record<string, number>, extra: Partial<TodayHabitInput> = {}): TodayHabitInput {
  return {
    id, title: id, icon: null, kind: "habit", mode: "build", timeOfDay: null, lifeArea: null, sharing: "each", isPrivate: false,
    everyone: false, carryOver: false, createdAt: old, archivedAt: null, schedule: "daily", weekdays: null, times: null, anchorWeek: null,
    participants: Object.entries(who).map(([userId, sortOrder]) => ({ userId, sortOrder, joinedAt: old, user: { displayName: userId, avatarColor: "blue", deactivatedAt: null } })),
    ...extra,
  };
}

test("resolveManagePerson: the asked-for person when allowed, else the viewer", () => {
  assert.equal(resolveManagePerson(parent, "ledger", people), "ledger");
  assert.equal(resolveManagePerson(parent, undefined, people), "mom");
  assert.equal(resolveManagePerson(parent, "stranger", people), "mom"); // not a household person
  assert.equal(resolveManagePerson(kid, "dad", people), "ledger"); // a kid cannot open another's
  assert.equal(resolveManagePerson(kid, "ledger", people), "ledger");
  assert.equal(resolveManagePerson(tablet, "ledger", people), "tablet");
});

test("personParam: null for yourself, else the id", () => {
  assert.equal(personParam("mom", "mom"), null);
  assert.equal(personParam("ledger", "mom"), "ledger");
});

test("the address builders add ?person= only for someone else, URL-encoded", () => {
  assert.equal(manageHref(null), "/habits/manage");
  assert.equal(manageHref("ledger"), "/habits/manage?person=ledger");
  assert.equal(newHabitHref(null), "/habits/new");
  assert.equal(newHabitHref("a b"), "/habits/new?person=a%20b");
  assert.equal(editHabitHref("h1", null), "/habits/h1/edit");
  assert.equal(editHabitHref("h1", "ledger"), "/habits/h1/edit?person=ledger");
  assert.equal(choreChartHref(null), "/habits/chart");
  assert.equal(choreChartHref("ledger"), "/habits/chart?person=ledger");
});

test("managePersonChips: the viewer first, then household order; a kid and a household of one get none", () => {
  const chips = managePersonChips(parent, people, "ledger")!;
  assert.deepEqual(chips.map((c) => [c.id, c.name, c.selected]), [["mom", "Mom", false], ["dad", "Bryce", false], ["ledger", "Ledger", true]]);
  assert.equal(managePersonChips(kid, people, "ledger"), null);
  assert.equal(managePersonChips(tablet, people, "tablet"), null);
  assert.equal(managePersonChips(parent, [people[1]], "mom"), null);
});

test("buildManageLists: a parent sees a kid's habits in the kid's order", () => {
  const habits = [habit("a", { ledger: 2, mom: 0 }), habit("b", { ledger: 0, mom: 1 }), habit("c", { ledger: 1 }), habit("mine", { mom: 2 })];
  assert.deepEqual(buildManageLists(parent, "ledger", habits).manage.map((m) => m.id), ["b", "c", "a"]);
  assert.deepEqual(buildManageLists(parent, "mom", habits).manage.map((m) => m.id), ["a", "b", "mine"]);
});

test("buildManageLists: a kid's private habit the parent is not on stays out; one they share shows", () => {
  const habits = [
    habit("secret", { ledger: 0 }, { isPrivate: true }),
    habit("shared-private", { ledger: 1, mom: 0 }, { isPrivate: true }),
    habit("plain", { ledger: 2 }),
  ];
  assert.deepEqual(buildManageLists(parent, "ledger", habits).manage.map((m) => m.id), ["shared-private", "plain"]);
  assert.deepEqual(buildManageLists(kid, "ledger", habits).manage.map((m) => m.id), ["secret", "shared-private", "plain"]);
});

test("buildManageLists: archived habits come newest archived first and are not in the live list", () => {
  const habits = [
    habit("live", { ledger: 0 }),
    habit("older", { ledger: 1 }, { archivedAt: new Date("2026-02-01T00:00:00Z") }),
    habit("newer", { ledger: 2 }, { archivedAt: new Date("2026-03-01T00:00:00Z") }),
  ];
  const lists = buildManageLists(parent, "ledger", habits);
  assert.deepEqual(lists.manage.map((m) => m.id), ["live"]);
  assert.deepEqual(lists.archived.map((m) => m.id), ["newer", "older"]);
});

test("buildTodayPage: its manage and archived lists are buildManageLists for the viewer", () => {
  const habits = [habit("a", { mom: 1 }), habit("b", { mom: 0 }), habit("gone", { mom: 2 }, { archivedAt: old })];
  const page = buildTodayPage(parent, habits, new Map(), { year: 2026, month: 11, day: 5 });
  const lists = buildManageLists(parent, "mom", habits);
  assert.deepEqual(page.manage, lists.manage);
  assert.deepEqual(page.archived, lists.archived);
});
