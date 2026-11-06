// Habits & Chores' one vocabulary: kinds, modes, schedules, sharing, log
// statuses, times of day, the icon allow-list and the weekday mask. Lives
// beside goalVocabulary.ts rather than in constants.ts (which is at its line
// cap). No React, no db, no lucide imports: icons are stored as plain Lucide
// names and mapped to components where they are drawn, so this file is
// importable from a Server Action, the pure engine and a client component.
// No Prisma enums: the database stores these as plain strings and the `to*`
// narrowers below repair anything unexpected.

export const HABIT_KINDS = ["habit", "chore"] as const;
export type HabitKind = (typeof HABIT_KINDS)[number];

/** Anything unknown is a "habit", the kind every Plans & Goals row already is. */
export function toHabitKind(raw: unknown): HabitKind {
  return HABIT_KINDS.find((kind) => kind === raw) ?? "habit";
}

export const HABIT_MODES = ["build", "quit"] as const;
export type HabitMode = (typeof HABIT_MODES)[number];

export function toHabitMode(raw: unknown): HabitMode {
  return HABIT_MODES.find((mode) => mode === raw) ?? "build";
}

export const HABIT_SCHEDULES = ["daily", "weekdays", "weekly", "biweekly", "monthly"] as const;
export type HabitSchedule = (typeof HABIT_SCHEDULES)[number];

/** The schedule names, as the habit editor shows them (the approved mock's words). */
export const HABIT_SCHEDULE_LABELS: Record<HabitSchedule, string> = {
  daily: "Every day",
  weekdays: "Certain days of the week",
  weekly: "A number of times a week",
  biweekly: "Every other week",
  monthly: "A number of times a month",
};

/** The same five, short enough for a list row's small line (Manage). */
export const HABIT_SCHEDULE_SHORT_LABELS: Record<HabitSchedule, string> = {
  daily: "Every day",
  weekdays: "Certain days",
  weekly: "Weekly",
  biweekly: "Every other week",
  monthly: "Monthly",
};

/** The longest a habit's name may be: the same as a goal's (`GOAL_TITLE_MAX`, pinned equal by a test). */
export const HABIT_TITLE_MAX = 120;

/** The most a weekly or monthly habit can ask for (a week has 7 days, a month at most 31). */
export const HABIT_TIMES_LIMITS = { weekly: 7, monthly: 31 } as const;

/** Anything unknown is "daily": a habit with a broken schedule still shows up. */
export function toHabitSchedule(raw: unknown): HabitSchedule {
  return HABIT_SCHEDULES.find((schedule) => schedule === raw) ?? "daily";
}

export const HABIT_SHARING = ["together", "each"] as const;
export type HabitSharing = (typeof HABIT_SHARING)[number];

/** Anything unknown is "each": one person's check never ticks for someone else. */
export function toHabitSharing(raw: unknown): HabitSharing {
  return HABIT_SHARING.find((sharing) => sharing === raw) ?? "each";
}

export const HABIT_LOG_STATUSES = ["done", "late", "skipped"] as const;
export type HabitLogStatus = (typeof HABIT_LOG_STATUSES)[number];

export function toHabitLogStatus(raw: unknown): HabitLogStatus {
  return HABIT_LOG_STATUSES.find((status) => status === raw) ?? "done";
}

export const TIMES_OF_DAY = ["morning", "afternoon", "evening"] as const;
export type TimeOfDay = (typeof TIMES_OF_DAY)[number];

/** Null means "anytime"; time of day only groups the list, it never makes anything late. */
export function toTimeOfDay(raw: unknown): TimeOfDay | null {
  return TIMES_OF_DAY.find((time) => time === raw) ?? null;
}

/** Time-of-day names, as every list and the editor show them. */
export const TIME_OF_DAY_LABELS: Record<TimeOfDay, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

/** What no time of day is called. */
export const ANYTIME_LABEL = "Anytime";

/** Who a habit is for, as the editor's strip offers it. "me" is one person; the other two are `HabitSharing`. */
export type HabitWho = "me" | HabitSharing;

/** The words for who a habit belongs to. "Mine" and "Everyone" are never saved: they are read from the people on it. */
export const HABIT_WHO_LABELS = { mine: "Mine", everyone: "Everyone", together: "Together", each: "Side by side" } as const;

/** One person: "Mine". More: "Everyone" when made with that button, else "Together" or "Side by side". */
export function habitWhoLabel(habit: { people: number; everyone: boolean; sharing: string }): string {
  if (habit.people <= 1) return HABIT_WHO_LABELS.mine;
  if (habit.everyone) return HABIT_WHO_LABELS.everyone;
  return HABIT_WHO_LABELS[toHabitSharing(habit.sharing)];
}

/** The refusal when Together or Side by side has fewer than two people (the form and the server say the same words). */
export const SHARED_NEEDS_TWO_MESSAGE = "Pick at least two people, or choose Just me.";

/** The editor's Who strip: its button words and the line under it. */
export const HABIT_WHO_CHOICES: readonly { key: HabitWho; label: string; hint: string }[] = [
  { key: "me", label: "Just me", hint: "One person: you" },
  { key: "together", label: HABIT_WHO_LABELS.together, hint: "Together: one check counts for everyone" },
  { key: "each", label: HABIT_WHO_LABELS.each, hint: "Side by side: everyone checks their own" },
];

/** A check counts as done when it was done, on time or late; a skip does not. */
export function isCheckStatus(status: string): boolean {
  return status === "done" || status === "late";
}

/** Carry-over only means something for a habit with set days: every day, certain days, or alternate weeks with days picked. */
export function canCarryOver(schedule: HabitSchedule, days: readonly Weekday[]): boolean {
  return schedule === "daily" || schedule === "weekdays" || (schedule === "biweekly" && days.length > 0);
}

/** What a streak counts, by the habit's schedule (decision 94): days, weeks or months. */
export const STREAK_UNITS = ["days", "weeks", "months"] as const;
export type StreakUnit = (typeof STREAK_UNITS)[number];

/** A streak shows only at this many or more (decision 98). */
export const STREAK_MIN_SHOWN = 2;

/** "12 days", "3 weeks", "2 months"; null below `STREAK_MIN_SHOWN` (decision 98). */
export function streakLabel(count: number, unit: StreakUnit): string | null {
  return count >= STREAK_MIN_SHOWN ? `${count} ${unit}` : null;
}

/** The side-by-side table's streak cell: always a count, singular at 1 ("0 days", "1 day", "3 weeks"; decision 111). */
export function streakCountLabel(count: number, unit: StreakUnit): string {
  return `${count} ${count === 1 ? unit.slice(0, -1) : unit}`;
}

/** The stats page's rate cell when no day has been due yet (decision 111). */
export const RATE_NONE_LABEL = "None yet";

/** The status in a nudge row, after the person's name (decision 110). */
export const NUDGE_STATUS_LABEL = "Not done yet today";

/** The meta line of a row skipped today (decision 101). */
export const SKIPPED_TODAY_LABEL = "Skipped today";

/** What the dashed marker says to a screen reader on a chore skipped for the whole week (decision 117). */
export const SKIPPED_THIS_WEEK_LABEL = "Skipped this week";

/** Only a habit for one person can be private. */
export function canBePrivate(peopleCount: number): boolean {
  return peopleCount === 1;
}

/** The starter set of Lucide icon names a habit may pick (outline icons only). */
export const HABIT_ICONS = [
  "Dumbbell",
  "Bike",
  "Footprints",
  "Droplets",
  "Apple",
  "Pill",
  "Bed",
  "Sun",
  "Moon",
  "BookOpen",
  "PenLine",
  "Brain",
  "Music",
  "Heart",
  "Smile",
  "Phone",
  "Leaf",
  "Flower2",
  "PawPrint",
  "Brush",
  "SprayCan",
  "Shirt",
  "WashingMachine",
  "Trash2",
  "CookingPot",
  "Car",
  "Salad",
  "Coffee",
  "GlassWater",
  "Utensils",
  "CigaretteOff",
  "AlarmClock",
  "Timer",
  "Church",
  "HandHeart",
  "Sparkles",
  "PiggyBank",
  "Briefcase",
  "GraduationCap",
  "ShoppingCart",
] as const;

export type HabitIcon = (typeof HABIT_ICONS)[number];

/** Null (the kind's default icon) for anything not on the allow-list. */
export function toHabitIcon(raw: unknown): HabitIcon | null {
  return HABIT_ICONS.find((icon) => icon === raw) ?? null;
}

/** 0 = Sunday, the same as `dayOfWeek` in householdDate.ts. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Whether `value` is a weekday number, 0 (Sunday) to 6 (Saturday). The one copy of this check. */
export function isWeekday(value: unknown): value is Weekday {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 6;
}

/** "0100100" (Sunday first) to the weekdays it names; null unless exactly seven 0/1 characters. */
export function parseWeekdayMask(raw: unknown): Weekday[] | null {
  if (typeof raw !== "string" || !/^[01]{7}$/.test(raw)) return null;
  const days: Weekday[] = [];
  for (let i = 0; i < 7; i++) if (raw[i] === "1") days.push(i as Weekday);
  return days;
}

/** The mask for a set of weekdays; order and repeats in `days` do not matter. */
export function printWeekdayMask(days: readonly Weekday[]): string {
  return Array.from({ length: 7 }, (_, i) => (days.includes(i as Weekday) ? "1" : "0")).join("");
}

// ---- Chores PR D (decisions 115 to 124) ----

/** A row due on a vacation day, and the family view's line under the name (decision 115). */
export const ON_VACATION_LABEL = "On vacation";

/** The vacation card's first line on Today (decision 115); `through` is the last day, already written ("Nov 12"). */
export function vacationThroughLabel(through: string): string {
  return `You're on vacation through ${through}`;
}

/** The same card on the vacation's last day. */
export const VACATION_TODAY_LABEL = "You're on vacation today";

/** Saving a vacation that overlaps one the person already has (decision 123). */
export const VACATION_OVERLAP_MESSAGE = "These days overlap a vacation you already have.";

/** The Sunday shout-out: on Today, and on the person's family card (decision 122). */
export const CHORES_LAST_WEEK_CARD = "You finished every chore last week. Way to go!";
export const CHORES_LAST_WEEK_FAMILY = "Finished every chore last week";

/** The chart's tags (decision 117); `dayName` is the short weekday ("Thu"). */
export const CHORE_TAG_LABELS = {
  movedTo: (dayName: string) => `Moved to ${dayName}`,
  thisWeekOnly: "This week only",
  skipped: SKIPPED_THIS_WEEK_LABEL,
} as const;

/** The words for a chart tag (decision 117); `dayNames` are the short weekday names, Sunday first. */
export function choreTagLabel(tag: { kind: "moved-away"; toWeekday: Weekday } | { kind: "moved-here" } | { kind: "skipped" }, dayNames: readonly string[]): string {
  if (tag.kind === "moved-away") return CHORE_TAG_LABELS.movedTo(dayNames[tag.toWeekday]);
  return tag.kind === "moved-here" ? CHORE_TAG_LABELS.thisWeekOnly : CHORE_TAG_LABELS.skipped;
}

/** The chart's page words (decisions 116, 117, 124). */
export const CHORE_CHART_LABELS = {
  title: "Chore chart",
  manageHint: "Each person's default week",
  defaultWeek: "Default week",
  thisWeek: "This week",
  moveTo: "Move to",
  skipThisWeek: "Skip this week",
  backToDefault: "Back to the default",
  /** A kid's sheet on a chore shared with someone else (decision 125). */
  askParent: "Ask a parent to change a shared chore.",
  /** The page subtitle: "Emily's week". */
  personWeek: (name: string) => `${name}'s week`,
} as const;

// ---- Dashboard tiles (decisions 132, 133) ----

/** The Habits tile's header label when the person picked habits. */
export const HABITS_TILE_PICKED_LABEL = "The ones you picked";
/** Something was due today and everything is done or skipped. */
export const HABITS_TILE_ALL_DONE = "All done for today";
export const HABITS_TILE_NOTHING_DUE = "Nothing due today";
export const CHORES_TILE_EMPTY = "No chores today";
/** Most habits the Habits tile shows when nothing is picked. */
export const HABITS_TILE_DEFAULT_LIMIT = 3;

// ---- Dashboard picker (decision 137) ----

export const HABITS_PICKER_TITLE = "Habits on your dashboard";
/** Shown when nothing is picked. */
export const HABITS_PICKER_NOTHING_PICKED = "Nothing picked yet. The tile shows up to three habits due today.";
/** The person has no habits to pick from. */
export const HABITS_PICKER_NONE = "No habits yet.";

// ---- Plan the day (decisions 36 to 47, 141 to 146) ----

/** A row planned for a later day this period: `when` is a short weekday ("Sat") or a date ("Nov 21"). */
export function plannedForLabel(when: string): string {
  return `Planned for ${when}`;
}
/** The Habits & Chores meta for a row planned for today, after the who label (decision 145). */
export const PLANNED_FOR_TODAY_LABEL = plannedForLabel("today");
/** The dashboard card of habits planned for today. */
export const PLANNED_TODAY_TITLE = "Planned today";
/** The prompt card's heading. */
export const PLAN_PROMPT_TITLE = "Pick a day";
/** The prompt card's question about one habit. */
export const PLAN_PROMPT_QUESTION = "What day will you do it?";
/** The prompt card's question when two or more habits ask. */
export const PLAN_PROMPT_QUESTION_MANY = "What day will you do each one?";
/** The chip that opens a date input limited to the rest of the period. */
export const PLAN_OTHER_DAY_LABEL = "Other day";
/** A chip: "Today" for the first, else the short weekday name (`dayNames` Sunday first). */
export function planChipLabel(chip: { isToday: boolean; weekday: number }, dayNames: readonly string[]): string {
  return chip.isToday ? "Today" : dayNames[chip.weekday];
}

// ---- The Report (decisions 163 to 171) ----

/** The Report's page words. The tab names double as the three views. */
export const REPORT_LABELS = {
  title: "Report",
  linkHint: "Every item by week, month and year",
  tabs: { week: "Week", month: "Month", year: "Year" },
  /** The filter's first chip, and the two kinds when both are shown (decision 169). */
  filterAll: "All",
  filterHabits: "Habits",
  filterChores: "Chores",
  /** The pager's pill on a past period (decisions 166, 167). */
  thisWeek: "This week",
  thisMonth: "This month",
  /** The Year view's chooser (decision 168). */
  whichItem: "Which item?",
  /** Empty state (decision 171). */
  emptyEmoji: "📊",
  emptyTitle: "Nothing to report yet",
  emptyHint: "Add a habit or chore in Manage and it shows up here.",
  emptyHintFor: (name: string) => `${name} has no habits or chores yet.`,
} as const;

/** "5 of 6": done of due so far, or done of a target (decisions 166, 167). */
export function reportCountOf(done: number, of: number): string {
  return `${done} of ${of}`;
}

/** "1 this week", "9 this month": the count for an item with no daily target (decisions 166, 167). */
export function reportCountThis(done: number, period: "week" | "month"): string {
  return `${done} this ${period}`;
}

/** The Year view's line under the grids: "84 done · 6 missed · 3 skipped" (decision 168). */
export function reportYearTotals(totals: { done: number; missed: number; skipped: number }): string {
  return `${totals.done} done · ${totals.missed} missed · ${totals.skipped} skipped`;
}
