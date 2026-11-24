// The words and limits of star rewards (mission 79): the values a habit can
// pay, what a late check pays, and the refusal text. No imports, so any lib
// file may take words from it without risking a cycle (the same rule as
// habitVocabulary.ts).

/** The star values a habit or chore can pay, in the order the stepper walks them. Not having stars is null. */
export const STAR_STEPS = [1, 2, 3, 4, 5, 10, 15, 20, 25, 50] as const;
export type StarStep = (typeof STAR_STEPS)[number];

/** Anything not on the list, including 0, is null: no stars. */
export function toStarValue(raw: unknown): StarStep | null {
  return STAR_STEPS.find((step) => step === raw) ?? null;
}

export const STAR_REFUSAL = "Pick a star value from the list.";

/** What a late check pays: all the stars, half (rounded up), or none. */
export const LATE_STARS = ["full", "half", "none"] as const;
export type LateStars = (typeof LATE_STARS)[number];

export const LATE_STARS_LABELS: Record<LateStars, string> = {
  full: "Full stars",
  half: "Half stars",
  none: "No stars",
};

/** Anything unknown is "full", the default. */
export function toLateStars(raw: unknown): LateStars {
  return LATE_STARS.find((choice) => choice === raw) ?? "full";
}
