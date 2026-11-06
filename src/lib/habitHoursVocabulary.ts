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
  /** The pace ("about N a day") rounds up to the next multiple of this many minutes. */
  paceStep: 15,
  /** The amounts the log sheet's chips jump to (decision 182). */
  chips: [30, 60, 120],
} as const;

/** "hour" up to and including one hour ("1 hour", "½ hour"), else "hours". */
export function unitFor(minutes: number): "hour" | "hours" {
  return minutes > 0 && minutes <= 60 ? "hour" : "hours";
}

/**
 * The one check of a weekly goal and pace choice, for the habit form and the
 * plan sheet alike: whole hours from the smallest to the largest target, and a
 * known pace. Answers the stored minutes, or the words to show.
 */
export function checkHoursTarget(hoursRaw: unknown, paceRaw: unknown): { weeklyMinutes: number; paceDays: PaceDays } | { error: string } {
  const { targetMinHours, targetMaxHours } = HOURS_LIMITS;
  if (typeof hoursRaw !== "number" || !Number.isInteger(hoursRaw) || hoursRaw < targetMinHours || hoursRaw > targetMaxHours) {
    return { error: `Pick ${targetMinHours} to ${targetMaxHours} hours a week.` };
  }
  if (toPaceDays(paceRaw) !== paceRaw) return { error: "Pick which days to count." };
  return { weeklyMinutes: hoursRaw * 60, paceDays: toPaceDays(paceRaw) };
}

/** The phrases that join the numbers on a row (decisions 187 to 190), with their separators. */
export const HOURS_PHRASES = {
  left: "left",
  done: " · done",
  today: " · today",
  aboutADay: (amount: string) => ` · about ${amount} a day`,
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
  afterThis: (text: string) => `After this: ${text}`,
} as const;
