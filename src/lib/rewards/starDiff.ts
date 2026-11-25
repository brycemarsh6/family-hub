// How far a tap has moved the star bank before the server answers (mission
// 79). Pure: it compares the server's rows with the optimistic ones and pays
// by the same `starsForLog` rule the check itself uses. No database.

import type { LateStars } from "../rewardVocabulary";
import { starsForLog } from "./stars";

/** The parts of a habit row the diff reads; `HabitRowView` and `FamilyRow` both fit. */
export type StarDiffRow = {
  id: string;
  stars?: number | null;
  carriedFrom: unknown | null;
  /** Whose copy this is. On the family page an Each habit has one copy per column, each built for that column's person. */
  viewerId?: string;
  participants: readonly { userId: string; done: boolean }[];
};

/**
 * Per person, the stars the shown rows have gained or lost against the server's:
 * each participant whose `done` flips is paid (or docked) what one check pays,
 * late when the row is carried over. A habit id counts once, since the family
 * page holds one habit in several places (a Together habit in the strip and
 * columns, an Each habit in each person's column).
 */
export function starDiff(server: readonly StarDiffRow[], shown: readonly StarDiffRow[], lateStars: LateStars): Record<string, number> {
  const shownById = new Map<string, StarDiffRow>();
  for (const row of shown) if (!shownById.has(row.id)) shownById.set(row.id, row);
  // Each copy of a habit is built for its own person, so whether a day is carried can differ by copy; the server decides late for the tapped person.
  const carriedBy = new Map<string, Map<string, boolean>>();
  for (const copy of server) {
    if (copy.viewerId === undefined) continue;
    const byViewer = carriedBy.get(copy.id) ?? new Map<string, boolean>();
    if (!byViewer.has(copy.viewerId)) byViewer.set(copy.viewerId, copy.carriedFrom != null);
    carriedBy.set(copy.id, byViewer);
  }
  const delta: Record<string, number> = {};
  const counted = new Set<string>();
  for (const before of server) {
    if (counted.has(before.id)) continue;
    counted.add(before.id);
    const after = shownById.get(before.id);
    if (!after) continue;
    const wasDone = new Map(before.participants.map((p) => [p.userId, p.done]));
    for (const member of after.participants) {
      const was = wasDone.get(member.userId) ?? false;
      if (member.done === was) continue;
      const late = carriedBy.get(before.id)?.get(member.userId) ?? before.carriedFrom != null;
      const pay = starsForLog(before.stars, late ? "late" : "done", lateStars) ?? 0;
      if (pay === 0) continue;
      delta[member.userId] = (delta[member.userId] ?? 0) + (member.done ? pay : -pay);
    }
  }
  return delta;
}

/** The bank each person is shown: the server's number plus what the taps since have paid (one rule for the Today list and the family page). */
export function shownBanks(banks: Readonly<Record<string, number>>, diff: Readonly<Record<string, number>>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of new Set([...Object.keys(banks), ...Object.keys(diff)])) out[id] = (banks[id] ?? 0) + (diff[id] ?? 0);
  return out;
}
