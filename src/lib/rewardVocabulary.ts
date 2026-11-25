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

/** The stepper's field on the habit form. */
export const STARS_FIELD_LABEL = "Stars";
export const STARS_FIELD_HINT = "Paid into the star bank each time it's checked off";

/** "1 star", "-1 star", "10 stars" (a minus is a take-back). */
export function starCountText(n: number): string {
  return n === 1 || n === -1 ? `${n} star` : `${n} stars`;
}

/** What sits between the stepper's buttons: "None" for no stars, else the count. */
export function starStepText(value: number | null): string {
  return value === null ? "None" : starCountText(value);
}

/** The Rewards section in Settings and its Late checks choice. */
export const REWARDS_SETTINGS_TITLE = "Rewards";
export const LATE_STARS_TITLE = "Late checks";
export const LATE_STARS_HELP = "A late check is a carried-over item checked off the next day. Half rounds up.";
export const LATE_STARS_REFUSAL = "Only parents and admins can change this.";
export const LATE_STARS_OFF_LIST = "That choice isn't on the list.";

/** The Celebrations switch (mission 80): on a login's Settings and on the Wall tablet page. */
export const CELEBRATIONS_WORDS = {
  title: "Celebrations",
  sub: "Flying stars and the all-done confetti",
  saveError: "Couldn't save your celebrations setting. Check your connection and try again.",
  notAllowed: "Only parents, admins and the wall tablet can change this.",
  deviceRefused: "A shared device changes this on Wall tablet settings.",
} as const;
