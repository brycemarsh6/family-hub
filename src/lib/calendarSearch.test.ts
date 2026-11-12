// Tests for the Calendar search rules (mission-75/C2). Pure: "now" and the
// zone are parameters. Run in both TZ=America/Denver and TZ=UTC.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  arrangeSearch,
  clampLimit,
  matchedPrefixLength,
  matchesSearch,
  searchWords,
  type SearchEventRow,
  type SearchTaskRow,
} from "./calendarSearch";

const ZONE = "America/Denver";
// Thu 12 Nov 2026, 1 PM in Denver (MST, UTC-7).
const NOW = new Date("2026-11-12T20:00:00Z");

function ev(id: string, title: string, startIso: string, endIso: string, more: Partial<SearchEventRow> = {}): SearchEventRow {
  return {
    id,
    title,
    location: null,
    notes: null,
    startAt: new Date(startIso),
    endAt: new Date(endIso),
    allDay: false,
    seriesId: null,
    ...more,
  };
}

function task(id: string, title: string, dueIso: string, details: string | null = null): SearchTaskRow {
  return { id, title, details, dueDate: new Date(dueIso) };
}

function run(text: string, events: SearchEventRow[], tasks: SearchTaskRow[] = [], more: { upcomingLimit?: number; pastLimit?: number } = {}) {
  return arrangeSearch({ text, events, tasks, now: NOW, zone: ZONE, ...more });
}

test("a typed word matches the start of a word in the title", () => {
  const words = searchWords("pia")!;
  assert.equal(matchesSearch(words, ["Piano lesson", null]), true);
  assert.equal(matchesSearch(words, ["Spiral", null]), false);
});

test("a singular word finds the plural, and the plural finds the singular", () => {
  const finds = (typed: string, field: string) => matchesSearch(searchWords(typed)!, [field, null]);
  assert.equal(finds("movie", "Movies at the park"), true);
  assert.equal(finds("movies", "Movie night"), true);
  assert.equal(finds("cookies", "Cookie swap"), true);
  assert.equal(finds("serie", "World Series"), true);
  assert.equal(finds("berry", "Berries"), true);
  assert.equal(finds("cat", "Dog walk"), false);
});

test("the highlight length comes from the written word", () => {
  assert.equal(matchedPrefixLength("Berries", ["berry"]), 4);
  assert.equal(matchedPrefixLength("Movies", ["movie"]), 5);
  assert.equal(matchedPrefixLength("Cookie", ["cookies"]), 6);
  assert.equal(matchedPrefixLength("Piano", ["pia"]), 3);
  assert.equal(matchedPrefixLength("Spiral", ["pia"]), 0);
});

test("matches location, notes and task details too", () => {
  const out = run(
    "garage",
    [ev("a", "Pickup", "2026-11-13T17:00:00Z", "2026-11-13T18:00:00Z", { location: "Garage" }), ev("b", "Chat", "2026-11-14T17:00:00Z", "2026-11-14T18:00:00Z", { notes: "meet in the garage" })],
    [task("t", "Tidy", "2026-11-15T00:00:00Z", "the garage shelves")],
  );
  assert.deepEqual(out.upcoming.flatMap((d) => d.eventIds), ["a", "b"]);
  assert.deepEqual(out.upcoming.flatMap((d) => d.taskIds), ["t"]);
});

test("every typed word must match, in any field", () => {
  const e = ev("a", "Piano lesson", "2026-11-13T17:00:00Z", "2026-11-13T18:00:00Z", { location: "Studio" });
  assert.equal(run("piano stu", [e]).upcoming.length, 1);
  assert.equal(run("piano zoo", [e]).upcoming.length, 0);
});

test("under 2 letters in all returns nothing", () => {
  const e = ev("a", "A big day", "2026-11-13T17:00:00Z", "2026-11-13T18:00:00Z");
  assert.equal(searchWords("a"), null);
  assert.equal(searchWords("  "), null);
  assert.deepEqual(run("a", [e]).upcoming, []);
  assert.equal(run("bi", [e]).upcoming.length, 1);
});

test("a series collapses to its earliest upcoming, flagged repeating", () => {
  const out = run("swim", [
    ev("old", "Swim", "2026-11-05T17:00:00Z", "2026-11-05T18:00:00Z", { seriesId: "S" }),
    ev("n2", "Swim", "2026-11-19T17:00:00Z", "2026-11-19T18:00:00Z", { seriesId: "S" }),
    ev("n1", "Swim", "2026-11-13T17:00:00Z", "2026-11-13T18:00:00Z", { seriesId: "S" }),
  ]);
  assert.deepEqual(out.upcoming.flatMap((d) => d.eventIds), ["n1"]);
  assert.deepEqual(out.past, []);
  assert.deepEqual(out.repeatingEventIds, ["n1"]);
});

test("a series with nothing upcoming collapses to its latest past", () => {
  const out = run("swim", [
    ev("p1", "Swim", "2026-10-01T17:00:00Z", "2026-10-01T18:00:00Z", { seriesId: "S" }),
    ev("p2", "Swim", "2026-11-05T17:00:00Z", "2026-11-05T18:00:00Z", { seriesId: "S" }),
  ]);
  assert.deepEqual(out.upcoming, []);
  assert.deepEqual(out.past.flatMap((d) => d.eventIds), ["p2"]);
  assert.deepEqual(out.repeatingEventIds, ["p2"]);
});

test("a task due today is upcoming, due yesterday is past", () => {
  const out = run("trash", [], [
    task("today", "Trash out", "2026-11-12T00:00:00Z"),
    task("yest", "Trash bins", "2026-11-11T00:00:00Z"),
  ]);
  assert.deepEqual(out.upcoming.flatMap((d) => d.taskIds), ["today"]);
  assert.deepEqual(out.past.flatMap((d) => d.taskIds), ["yest"]);
  assert.equal(out.upcoming[0].day, "2026-11-12");
});

test("an event in progress is upcoming; one that ended is past", () => {
  const out = run("meet", [
    ev("now", "Meet", "2026-11-12T19:00:00Z", "2026-11-12T21:00:00Z"),
    ev("done", "Meet", "2026-11-12T17:00:00Z", "2026-11-12T19:59:00Z"),
  ]);
  assert.deepEqual(out.upcoming.flatMap((d) => d.eventIds), ["now"]);
  assert.deepEqual(out.past.flatMap((d) => d.eventIds), ["done"]);
});

test("an all-day event today is upcoming even late in the evening", () => {
  const late = arrangeSearch({
    text: "fair",
    events: [ev("fair", "Fair", "2026-11-12T00:00:00Z", "2026-11-13T00:00:00Z", { allDay: true })],
    tasks: [],
    now: new Date("2026-11-13T03:00:00Z"), // 8 PM Denver on the 12th
    zone: ZONE,
  });
  assert.deepEqual(late.upcoming.flatMap((d) => d.eventIds), ["fair"]);
  assert.equal(late.upcoming[0].day, "2026-11-12");
});

test("a late-evening timed event lands on its Denver day", () => {
  const out = run("movie", [ev("m", "Movie", "2026-11-14T05:30:00Z", "2026-11-14T07:00:00Z")]);
  assert.equal(out.upcoming[0].day, "2026-11-13");
});

test("upcoming is nearest first, past newest first, events before tasks in a day", () => {
  const res = run(
    "walk",
    [
      ev("u2", "Walk", "2026-11-20T17:00:00Z", "2026-11-20T18:00:00Z"),
      ev("u1b", "Walk b", "2026-11-14T18:00:00Z", "2026-11-14T19:00:00Z"),
      ev("u1a", "Walk a", "2026-11-14T16:00:00Z", "2026-11-14T17:00:00Z"),
      ev("p1", "Walk", "2026-11-01T17:00:00Z", "2026-11-01T18:00:00Z"),
      ev("p2", "Walk", "2026-11-08T17:00:00Z", "2026-11-08T18:00:00Z"),
    ],
    [task("t1", "Walk dog", "2026-11-14T00:00:00Z")],
  );
  assert.deepEqual(res.upcoming.map((d) => d.day), ["2026-11-14", "2026-11-20"]);
  assert.deepEqual(res.upcoming[0].eventIds, ["u1a", "u1b"]);
  assert.deepEqual(res.upcoming[0].taskIds, ["t1"]);
  assert.deepEqual(res.past.flatMap((d) => d.eventIds), ["p2", "p1"]);
});

test("caps count items per side and set hasMore", () => {
  const events = Array.from({ length: 5 }, (_, i) =>
    ev(`u${i}`, "Walk", `2026-11-${14 + i}T17:00:00Z`, `2026-11-${14 + i}T18:00:00Z`),
  );
  const pastEvents = Array.from({ length: 3 }, (_, i) =>
    ev(`p${i}`, "Walk", `2026-11-0${1 + i}T17:00:00Z`, `2026-11-0${1 + i}T18:00:00Z`),
  );
  const out = run("walk", [...events, ...pastEvents], [], { upcomingLimit: 3, pastLimit: 3 });
  assert.equal(out.upcoming.flatMap((d) => d.eventIds).length, 3);
  assert.equal(out.hasMoreUpcoming, true);
  assert.equal(out.past.flatMap((d) => d.eventIds).length, 3);
  assert.equal(out.hasMorePast, false);
  const more = run("walk", [...events, ...pastEvents], [], { upcomingLimit: 5, pastLimit: 2 });
  assert.equal(more.hasMoreUpcoming, false);
  assert.equal(more.hasMorePast, true);
});

test("limits clamp between 1 and 500", () => {
  assert.equal(clampLimit(0), 1);
  assert.equal(clampLimit(-5), 1);
  assert.equal(clampLimit(25), 25);
  assert.equal(clampLimit(9999), 500);
});

test("accented letters fold: cafe, zoe and pinata find their accented words", () => {
  assert.equal(matchesSearch(searchWords("cafe")!, ["Café lunch"]), true);
  assert.equal(matchesSearch(searchWords("zoe")!, ["Zoë's recital"]), true);
  assert.equal(matchesSearch(searchWords("pinata")!, ["Piñata party"]), true);
  assert.equal(matchesSearch(searchWords("café")!, ["Cafe lunch"]), true);
});

test("the highlight length stays aligned for a precomposed accented word", () => {
  assert.equal(matchedPrefixLength("Café", ["caf"]), 3);
  assert.equal(matchedPrefixLength("Café", ["cafe"]), 4);
});

test("a stray piece of an accented word does not match: me is not in Crème brûlée", () => {
  assert.equal(matchesSearch(searchWords("me")!, ["Crème brûlée"]), false);
});
