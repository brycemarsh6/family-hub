// The pure star rules (mission 79): what one check pays, how the stepper
// walks the values, and the bank total. No database, no `server-only`.

import { STAR_STEPS, toStarValue, type LateStars } from "../rewardVocabulary";

/**
 * The stars one check pays, snapshotted onto its log row. A done check pays
 * the habit's value; a late one pays full, half (rounded up) or nothing by
 * the household's Late checks setting; a skip, a habit with no stars and any
 * other status pay null.
 */
export function starsForLog(habitStars: number | null | undefined, status: string, lateStars: LateStars): number | null {
  const value = toStarValue(habitStars);
  if (value === null) return null;
  if (status === "done") return value;
  if (status === "late") {
    if (lateStars === "none") return null;
    return lateStars === "half" ? Math.ceil(value / 2) : value;
  }
  return null;
}

/** The stars a row's chip shows: a carried row (a missed day, counted late) shows what the late tap pays, any other row its own value. */
export function rowStars(habitStars: number | null | undefined, carried: boolean, lateStars: LateStars): number | null {
  return carried ? starsForLog(habitStars, "late", lateStars) : (toStarValue(habitStars));
}

/** One stepper tap: null (None) below 1, up through `STAR_STEPS`, stopping at the last. A value off the list counts as None. */
export function nextStarStep(value: number | null, dir: "up" | "down"): number | null {
  const at = toStarValue(value);
  const index = at === null ? -1 : STAR_STEPS.indexOf(at);
  if (dir === "up") return STAR_STEPS[Math.min(index + 1, STAR_STEPS.length - 1)];
  return index <= 0 ? null : STAR_STEPS[index - 1];
}

/** The bank: the sum of the stars on some log rows (null pays nothing). */
export function sumStars(values: readonly (number | null | undefined)[]): number {
  let total = 0;
  for (const value of values) if (typeof value === "number" && Number.isFinite(value)) total += value;
  return total;
}
