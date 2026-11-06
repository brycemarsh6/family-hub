import { dayOfWeek, formatCalendarDate, addCalendarDays, type CalendarDate } from "./householdDate";
import { logsForUser, specFromRow, type StoredScheduleFields } from "./habits/habitRows";
import { isPromptDay, promptChips } from "./habits/planPrompts";
import { dayInVacation } from "./habits/schedule";
import { windowProgress } from "./habits/progress";
import { habitStartDay } from "./habits/carryOver";
import type { HabitActor, HabitLogDay, Vacation } from "./habits/types";
import { SHORT_DAY_NAMES } from "./mealPlanDates";
import { planChipLabel } from "./habitVocabulary";
import { toHabitTrack } from "./habitHoursVocabulary";

// The "Pick a day" cards (decisions 38, 39, 142, 143): which of the viewer's
// open habits ask for a day today, and the chips each offers. Plain data (days
// as "YYYY-MM-DD") so it crosses into the browser. No db, no React.

/** What a prompt reads of a habit (a `TodayHabitInput` or a Prisma row fits). */
export type PromptHabitInput = StoredScheduleFields & {
  id: string;
  title: string;
  icon: string | null;
  kind: string;
  createdAt: Date;
  /** "hours" habits never ask for a day (decision 197). */
  track?: string;
};

/** One chip: the day to plan and the words on the button. */
export type PromptChipView = { day: string; label: string };

/** One habit asking for a day. */
export type TodayPrompt = {
  habitId: string;
  title: string;
  icon: string | null;
  kind: "habit" | "chore";
  chips: PromptChipView[];
  /** True when "Other day" shows (more days left than the chips cover). */
  showOther: boolean;
  /** The earliest and latest day "Other day" may take, "YYYY-MM-DD". */
  otherFrom: string;
  otherTo: string;
};

/** The first day "Other day" may take: just past the chips (they cover today and the next two days). */
const OTHER_DAY_OFFSET = 3;

/**
 * The habits that prompt today, in the order given. `plannedByHabit` holds the
 * viewer's own planned days (today or later) per habit. A habit prompts when
 * it is open, not yet at its target this period and `isPromptDay` says so.
 * `vacations` are the viewer's own: none on a vacation day.
 */
export function buildTodayPrompts(
  viewer: HabitActor,
  live: readonly PromptHabitInput[],
  logsByHabit: ReadonlyMap<string, HabitLogDay[]>,
  plannedByHabit: ReadonlyMap<string, readonly CalendarDate[]>,
  today: CalendarDate,
  vacations: readonly Vacation[] = [],
): TodayPrompt[] {
  // Nobody is asked to plan while on vacation (excused all day).
  if (dayInVacation(today, vacations)) return [];
  const prompts: TodayPrompt[] = [];
  for (const habit of live) {
    if (toHabitTrack(habit.track) === "hours") continue;
    const spec = specFromRow(habit);
    if (!spec) continue;
    const progress = windowProgress(spec, logsForUser(logsByHabit.get(habit.id) ?? [], viewer.userId), today, habitStartDay(habit.createdAt));
    if (!isPromptDay(spec, today, plannedByHabit.get(habit.id) ?? [], progress.count >= progress.target)) continue;
    const { chips, showOther, lastDay } = promptChips(spec, today);
    prompts.push({
      habitId: habit.id,
      title: habit.title,
      icon: habit.icon,
      kind: habit.kind === "chore" ? "chore" : "habit",
      chips: chips.map((chip) => ({ day: formatCalendarDate(chip.day), label: planChipLabel({ isToday: chip.isToday, weekday: dayOfWeek(chip.day) }, SHORT_DAY_NAMES) })),
      showOther,
      otherFrom: formatCalendarDate(addCalendarDays(today, OTHER_DAY_OFFSET)),
      otherTo: formatCalendarDate(lastDay),
    });
  }
  return prompts;
}
