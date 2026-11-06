// Pins habitsFamilyColumns.ts: the wide Whole family column's groups.

import { test } from "node:test";
import assert from "node:assert/strict";
import type { FamilyRow } from "./habitsFamily";
import { emptyColumnText, familyCountText, groupColumnRows } from "./habitsFamilyColumns";
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
