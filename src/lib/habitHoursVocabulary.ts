// The words and limits of an hours habit (mission 37): how a habit is
// tracked, which days the daily pace counts, and the entry and target
// limits. No imports, so any lib file may take words from it without risking
// a cycle (the same rule as habitVocabulary.ts).

export const HABIT_TRACKS = ["checks", "hours"] as const;
export type HabitTrack = (typeof HABIT_TRACKS)[number];

/** Anything unknown is "checks", the way every habit worked before hours. */
export function toHabitTrack(raw: unknown): HabitTrack {
  return HABIT_TRACKS.find((track) => track === raw) ?? "checks";
}

/** Which days "about N a day" counts: Monday to Saturday, or every day. */
export const PACE_DAYS = ["monsat", "every"] as const;
export type PaceDays = (typeof PACE_DAYS)[number];

/** Anything unknown is "monsat", the default (Bryce, 2026-11-06). */
export function toPaceDays(raw: unknown): PaceDays {
  return PACE_DAYS.find((days) => days === raw) ?? "monsat";
}

/** Entries are whole minutes; the target is whole hours. */
export const HOURS_LIMITS = {
  entryStep: 30,
  entryMin: 30,
  entryMax: 720,
  entryDefault: 60,
  targetMinHours: 1,
  targetMaxHours: 80,
  targetDefaultHours: 5,
} as const;
