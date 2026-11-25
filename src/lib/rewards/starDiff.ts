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
  const delta: Record<string, number> = {};
  const counted = new Set<string>();
  for (const before of server) {
    if (counted.has(before.id)) continue;
    counted.add(before.id);
    const after = shownById.get(before.id);
    if (!after) continue;
    const pay = starsForLog(before.stars, before.carriedFrom ? "late" : "done", lateStars) ?? 0;
    if (pay === 0) continue;
    const wasDone = new Map(before.participants.map((p) => [p.userId, p.done]));
    for (const member of after.participants) {
      const was = wasDone.get(member.userId) ?? false;
      if (member.done === was) continue;
      delta[member.userId] = (delta[member.userId] ?? 0) + (member.done ? pay : -pay);
    }
  }
  return delta;
}
