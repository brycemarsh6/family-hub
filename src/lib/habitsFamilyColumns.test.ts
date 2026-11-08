// Pins habitsFamilyColumns.ts: the wide Whole family column's groups.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { FamilyRow } from "./habitsFamily";
import type { HabitRowView } from "./habitsToday";
import { emptyColumnText, familyCountText, fitsEveryone, groupColumnRows, groupRowsByTime } from "./habitsFamilyColumns";
import { familyRowTag } from "./habitVocabulary";

const row = (id: string, timeOfDay: FamilyRow["timeOfDay"], kind: FamilyRow["kind"] = "habit", extra: Partial<FamilyRow> = {}) =>
  ({ id, timeOfDay, kind, lifeArea: null, onVacation: false, doneToday: false, skippedToday: false, skippedThisWeek: false, ...extra }) as FamilyRow;
const column = (rows: FamilyRow[], togetherIds: string[] = [], onVacation = false) => ({ rows, togetherIds, onVacation });
const ids = (groups: ReturnType<typeof groupColumnRows>) => groups.map((g) => [g.key, g.items.map((i) => i.row.id)]);

test("groups come out Morning, Afternoon, Evening, then Anytime", () => {
  const groups = groupColumnRows(column([row("a", null), row("b", "evening"), row("c", "morning"), row("d", "afternoon")]), []);
  assert.deepEqual(ids(groups), [["morning", ["c"]], ["afternoon", ["d"]], ["evening", ["b"]], ["anytime", ["a"]]]);
});

test("empty groups are dropped, and no rows means no groups", () => {
  assert.deepEqual(ids(groupColumnRows(column([row("a", "evening")]), [])), [["evening", ["a"]]]);
  assert.deepEqual(groupColumnRows(column([]), []), []);
});

test("Together rows join only the people on them, once each, with a Together tag", () => {
  const together = [row("t1", "morning"), row("t2", "morning"), row("t1", "morning")];
  const groups = groupColumnRows(column([row("own", "morning")], ["t1"]), together);
  assert.deepEqual(ids(groups), [["morning", ["own", "t1"]]]);
  assert.deepEqual(groups[0].items.map((i) => i.tag), [null, "Together"]);
  assert.deepEqual(groupColumnRows(column([], []), together), []);
});

test("chore rows carry a Chore tag; a Together chore carries both", () => {
  const groups = groupColumnRows(column([row("c", null, "chore")], ["tc"]), [row("tc", null, "chore")]);
  assert.deepEqual(groups[0].items.map((i) => i.tag), ["Chore", "Together · Chore"]);
});

test("a vacationing person sees their Together rows marked, and the filter keeps only matching rows", () => {
  const together = [row("t", "morning")];
  const groups = groupColumnRows(column([row("a", "evening")], ["t"], true), together);
  assert.equal(groups[0].items[0].row.onVacation, true);
  assert.equal(together[0].onVacation, false);
  assert.deepEqual(ids(groupColumnRows(column([row("a", "evening"), row("b", null)]), [], (r) => r.timeOfDay === "evening")), [["evening", ["a"]]]);
});

test("each item says whether it is a Together row, from togetherIds and not from the tag text", () => {
  const groups = groupColumnRows(column([row("own", "morning")], ["t"]), [row("t", "morning")]);
  assert.deepEqual(groups[0].items.map((i) => i.together), [false, true]);
});

test("familyRowTag: Together, Chore, both, or none", () => {
  assert.equal(familyRowTag(false, false), null);
  assert.equal(familyRowTag(true, false), "Together");
  assert.equal(familyRowTag(false, true), "Chore");
  assert.equal(familyRowTag(true, true), "Together · Chore");
});

test("emptyColumnText: nothing due at all says so; a filter that hid every row says Nothing here today", () => {
  assert.equal(emptyColumnText(column([]), []), "Nothing due today.");
  assert.equal(emptyColumnText(column([], ["t"]), [row("x", null)]), "Nothing due today.");
  assert.equal(emptyColumnText(column([row("a", "evening")]), []), "Nothing here today.");
  assert.equal(emptyColumnText(column([], ["t"]), [row("t", null)]), "Nothing here today.");
});

test("familyCountText: the count, with On vacation after it or alone when nothing counts", () => {
  const done = row("d", null, "habit", { doneToday: true });
  const open = row("o", null);
  const base = { rows: [done, open], togetherIds: [] as string[], onVacation: false, totalCount: 2 };
  assert.equal(familyCountText(base, []), "1 of 2 done");
  assert.equal(familyCountText({ ...base, onVacation: true }, []), "1 of 2 done · On vacation");
  assert.equal(familyCountText({ ...base, rows: [], onVacation: true, totalCount: 0 }, []), "On vacation");
});

const mine = (id: string, timeOfDay: HabitRowView["timeOfDay"], kind: HabitRowView["kind"] = "habit") => ({ id, timeOfDay, kind }) as HabitRowView;
const timeIds = (groups: ReturnType<typeof groupRowsByTime>) => groups.map((g) => [g.key, g.items.map((i) => i.row.id)]);

test("groupRowsByTime: Morning, Afternoon, Evening, Anytime, empty groups kept", () => {
  const groups = groupRowsByTime([mine("a", null), mine("b", "evening"), mine("c", "morning")]);
  assert.deepEqual(timeIds(groups), [["morning", ["c"]], ["afternoon", []], ["evening", ["b"]], ["anytime", ["a"]]]);
  assert.deepEqual(timeIds(groupRowsByTime([])), [["morning", []], ["afternoon", []], ["evening", []], ["anytime", []]]);
});

test("groupRowsByTime: a chore sits in its time column with the Chore tag", () => {
  const groups = groupRowsByTime([mine("h", "morning"), mine("c", "morning", "chore")]);
  assert.deepEqual(groups[0].items.map((i) => i.tag), [null, "Chore"]);
});

test("groupRowsByTime: keep filters rows and leaves the column in place", () => {
  const groups = groupRowsByTime([mine("a", "morning"), mine("b", "evening")], (r) => r.timeOfDay === "evening");
  assert.deepEqual(timeIds(groups), [["morning", []], ["afternoon", []], ["evening", ["b"]], ["anytime", []]]);
});

test("fitsEveryone: 220px columns and 12px gaps; nobody to fit is false", () => {
  assert.equal(fitsEveryone(1148, 5), true);
  assert.equal(fitsEveryone(892, 5), false);
  assert.equal(fitsEveryone(788, 3), true);
  assert.equal(fitsEveryone(788, 4), false);
  assert.equal(fitsEveryone(1000, 0), false);
  assert.equal(fitsEveryone(1148, 5), true);
  assert.equal(fitsEveryone(1147, 5), false);
});

test("grouping: both groupers use one time order (Morning, Afternoon, Evening, Anytime)", () => {
  const keys = (groups: { key: string }[]) => groups.map((group) => group.key);
  assert.deepEqual(keys(groupRowsByTime([])), ["morning", "afternoon", "evening", "anytime"]);
  assert.deepEqual(keys(groupColumnRows({ rows: [{ id: "a", timeOfDay: "evening" }, { id: "b", timeOfDay: null }, { id: "c", timeOfDay: "morning" }] as FamilyRow[], togetherIds: [], onVacation: false }, [])), ["morning", "evening", "anytime"]);
});
