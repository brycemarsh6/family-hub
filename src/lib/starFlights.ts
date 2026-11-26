// What a tap pays, for the star flight (mission 80). One rule, not a second
// one: the same diff the star bank's optimistic number uses. It lives at the
// top of `src/lib/` because it imports habitChanges.ts, which the rewards
// folder never does (docs/structure/rewards.md).

import { applyHabitChange, type HabitChange } from "./habitChanges";
import type { HabitRowState } from "./habitChanges";
import type { LateStars } from "./rewardVocabulary";
import { starDiff, type StarDiffRow } from "./rewards/starDiff";

/** Per person, the stars `change` pays (positive) or takes back (negative) on these rows. */
export function starPayments<T extends HabitRowState & StarDiffRow>(rows: readonly T[], change: HabitChange, lateStars: LateStars): Record<string, number> {
  return starDiff(rows, applyHabitChange([...rows], change), lateStars);
}

/** Every positive amount made negative, the rest dropped: what a failed check hands back to the flight to cancel its rings. */
export function takeBackPayments(payments: Record<string, number>): Record<string, number> {
  const back: Record<string, number> = {};
  for (const [userId, amount] of Object.entries(payments)) if (amount > 0) back[userId] = -amount;
  return back;
}
