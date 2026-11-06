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

/** The words on the form's Track choice (decision 193): the label and the line under "Track" for the lit one. */
export const TRACK_LABELS: Record<HabitTrack, { label: string; hint: string }> = {
  checks: { label: "Checks", hint: "Tap once when done" },
  hours: { label: "Hours", hint: "Log time toward a weekly goal" },
};

/** The words on "Count days left as" (decisions 183, 193). */
export const PACE_LABELS: Record<PaceDays, { label: string; hint: string }> = {
  monsat: { label: "Mon to Sat", hint: "Skip Sundays" },
  every: { label: "Every day", hint: "Sun to Sat" },
};

/**
 * What the editor starts from for a habit's Manage item: an hours habit opens
 * as Hours with its own goal and pace, anything else as Checks. Takes the
 * item's `hours` as it is (null for a checks habit).
 */
export function hoursInitialOf(hours: { weeklyMinutes: number; paceDays: string } | null): { track: HabitTrack; weeklyMinutes: number | null; paceDays: string | null } {
  return hours ? { track: "hours", weeklyMinutes: hours.weeklyMinutes, paceDays: hours.paceDays } : { track: "checks", weeklyMinutes: null, paceDays: null };
}

/** The words of the log sheet (decision 191). */
export const LOG_SHEET_WORDS = {
  title: (habitTitle: string) => `Add time to ${habitTitle}`,
  day: { today: "Today", yesterday: "Yesterday", other: "Other day" },
  button: (amount: string) => `Add ${amount}`,
  saving: "Saving…",
  /** A day in last week: the sheet knows only this week's total. */
  lastWeek: (amount: string) => `This adds ${amount} to last week.`,
  afterThis: (text: string) => `After this: ${text}`,
} as const;
