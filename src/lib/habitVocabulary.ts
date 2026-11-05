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

export const HABIT_SCHEDULE_LABELS: Record<HabitSchedule, string> = {
  daily: "Every day",
  weekdays: "Certain days",
  weekly: "Weekly",
  biweekly: "Every other week",
  monthly: "Monthly",
};

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
] as const;

export type HabitIcon = (typeof HABIT_ICONS)[number];

/** Null (the kind's default icon) for anything not on the allow-list. */
export function toHabitIcon(raw: unknown): HabitIcon | null {
  return HABIT_ICONS.find((icon) => icon === raw) ?? null;
}

/** 0 = Sunday, the same as `dayOfWeek` in householdDate.ts. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

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
