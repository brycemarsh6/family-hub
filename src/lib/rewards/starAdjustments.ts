// Bonus and taken-away stars (mission 83): the stepper's walk and the input
// check. Pure: no database, no `server-only`, no clock.

import {
  ADJUST_AMOUNT_REFUSAL,
  ADJUST_DIRECTION_REFUSAL,
  ADJUST_NOTE_MAX,
  ADJUST_NOTE_REFUSAL,
  STAR_STEPS,
  toStarValue,
} from "../rewardVocabulary";

/** The give or take amount starts here. */
export const ADJUST_DEFAULT_STARS = 5;

export type AdjustDirection = "give" | "take";

/** One stepper tap along `STAR_STEPS`, stopping at both ends. An amount off the list snaps to the nearest step instead of walking. */
export function nextAdjustStep(amount: number, dir: "up" | "down"): number {
  const at = toStarValue(amount);
  if (at === null) {
    const target = typeof amount === "number" && Number.isFinite(amount) ? amount : ADJUST_DEFAULT_STARS;
    return STAR_STEPS.reduce((best, step) => (Math.abs(step - target) < Math.abs(best - target) ? step : best));
  }
  const index = STAR_STEPS.indexOf(at);
  return STAR_STEPS[dir === "up" ? Math.min(index + 1, STAR_STEPS.length - 1) : Math.max(index - 1, 0)];
}

/** Check the form's `{ direction, amount, note }`: the signed amount (never 0) and the trimmed note (null when empty), or the word to show. */
export function toAdjustmentInput(raw: unknown): { ok: true; value: { amount: number; note: string | null } } | { ok: false; error: string } {
  const input = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  if (input.direction !== "give" && input.direction !== "take") return { ok: false, error: ADJUST_DIRECTION_REFUSAL };
  const stars = toStarValue(input.amount);
  if (stars === null) return { ok: false, error: ADJUST_AMOUNT_REFUSAL };
  if (input.note !== undefined && input.note !== null && typeof input.note !== "string") return { ok: false, error: ADJUST_NOTE_REFUSAL };
  const note = typeof input.note === "string" ? input.note.trim() : "";
  if ([...note].length > ADJUST_NOTE_MAX) return { ok: false, error: ADJUST_NOTE_REFUSAL };
  return { ok: true, value: { amount: input.direction === "give" ? stars : -stars, note: note === "" ? null : note } };
}
