// The habit form's validation, moved out of `actions/habits.ts` (mission 47,
// C1) so the Server Actions and the Assistant API refuse the same things in the
// same words. Pure: no `server-only`, no database. The one read the old
// `checkInput` did (who is in the household) is now the caller's to pass in.

import { toLifeArea } from "./goalVocabulary";
import { HABIT_TRACKS, checkHoursTarget, toHabitTrack, toPaceDays } from "./habitHoursVocabulary";
import {
  HABIT_ICONS,
  HABIT_TIMES_LIMITS,
  HABIT_TITLE_MAX,
  SHARED_NEEDS_TWO_MESSAGE,
  TIMES_OF_DAY,
  canBePrivate,
  canCarryOver,
  parseWeekdayMask,
  toHabitKind,
  toHabitMode,
  toHabitSchedule,
  toHabitSharing,
} from "./habitVocabulary";
import { participantsAllowed, sharedNeedsMorePeople } from "./habitsToday";
import { dayOfWeek, parseDateParam } from "./householdDate";
import type { HabitFields } from "./habits/habitRows";

/** What a person is told when the habit they would leave behind is one they could no longer edit. */
export const INCLUDE_YOURSELF = "Include yourself, or ask a parent.";

/** The editor's whole form, as the page sends it. `anchorWeek` is a `YYYY-MM-DD` Sunday. */
export type HabitInput = {
  title: string;
  kind: string;
  mode: string;
  icon: string | null;
  lifeArea: string | null;
  timeOfDay: string | null;
  schedule: string;
  weekdays: string | null;
  times: number | null;
  anchorWeek: string | null;
  carryOver: boolean;
  sharing: string;
  isPrivate: boolean;
  participantIds: string[];
  /** The Everyone button was used: the habit follows the whole family (decision 87). */
  everyone: boolean;
  /** "checks" or "hours". An hours habit ignores the schedule fields and is stored as one weekly habit (decisions 193, 194). */
  track: string;
  /** Hours only: the week's goal in whole hours. */
  weeklyHours: number | null;
  /** Hours only: "monsat" or "every". */
  paceDays: string | null;
};

export type CheckedHabitInput =
  | { fields: HabitFields & { title: string; schedule: string }; participantIds: string[]; everyone: boolean }
  | { error: string };

/**
 * Turns the form into columns, refusing anything the form could not have sent.
 * `household` is everyone who can hold a habit today. `alreadyOnHabit` is who
 * the habit holds today (an edit): they stay allowed even if no longer in the
 * household.
 */
export function checkHabitInput(input: HabitInput, household: readonly string[], alreadyOnHabit: readonly string[] = []): CheckedHabitInput {
  if (typeof input !== "object" || input === null) return { error: "Couldn't save it. Try again." };
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) return { error: "Give it a name." };
  if (title.length > HABIT_TITLE_MAX) return { error: `Keep the name to ${HABIT_TITLE_MAX} letters or fewer.` };
  if (toHabitKind(input.kind) !== input.kind) return { error: "Pick habit or chore." };
  if (toHabitMode(input.mode) !== input.mode) return { error: "Pick build or quit." };
  if (toHabitSharing(input.sharing) !== input.sharing) return { error: "Pick who it is for." };
  if (!(HABIT_TRACKS as readonly unknown[]).includes(input.track)) return { error: "Pick checks or hours." };
  const hours = toHabitTrack(input.track) === "hours";
  if (!hours && toHabitSchedule(input.schedule) !== input.schedule) return { error: "Pick a schedule." };
  if (input.icon !== null && !(HABIT_ICONS as readonly unknown[]).includes(input.icon)) return { error: "Pick an icon from the list." };
  if (input.lifeArea !== null && toLifeArea(input.lifeArea) === null) return { error: "Pick a life area from the list." };
  if (input.timeOfDay !== null && !(TIMES_OF_DAY as readonly unknown[]).includes(input.timeOfDay)) return { error: "Pick a time of day from the list." };
  const schedule = hours ? "weekly" : toHabitSchedule(input.schedule);

  let weeklyMinutes: number | undefined;
  if (hours) {
    if (input.kind !== "habit") return { error: "Hours are for habits, not chores." };
    if (input.sharing === "together") return { error: "Hours habits are for one person each, not Together." };
    if (input.carryOver === true) return { error: "Hours habits don't carry over." };
    const target = checkHoursTarget(input.weeklyHours, input.paceDays);
    if ("error" in target) return { error: target.error };
    weeklyMinutes = target.weeklyMinutes;
  }

  let weekdays: string | null = null;
  let times: number | null = null;
  let anchorWeek: ReturnType<typeof parseDateParam> = null;
  const days = input.weekdays === null || hours ? null : parseWeekdayMask(input.weekdays);
  if (input.weekdays !== null && !hours && !days) return { error: "Pick the days again." };
  if (hours) {
    times = 1;
  } else if (schedule === "weekdays") {
    if (!days || days.length === 0) return { error: "Pick at least one day." };
    weekdays = input.weekdays;
  } else if (schedule === "weekly" || schedule === "monthly") {
    const max = HABIT_TIMES_LIMITS[schedule];
    if (typeof input.times !== "number" || !Number.isInteger(input.times) || input.times < 1 || input.times > max) {
      return { error: `Pick 1 to ${max} times.` };
    }
    times = input.times;
  } else if (schedule === "biweekly") {
    anchorWeek = typeof input.anchorWeek === "string" ? parseDateParam(input.anchorWeek) : null;
    if (!anchorWeek || dayOfWeek(anchorWeek) !== 0) return { error: "Pick which week it starts." };
    weekdays = days && days.length > 0 ? input.weekdays : null;
  }

  if (!Array.isArray(input.participantIds) || input.participantIds.some((id) => typeof id !== "string")) {
    return { error: "Pick who it is for." };
  }
  const everyone = input.everyone === true;
  const participantIds = everyone ? [...household] : [...new Set(input.participantIds)];
  if (!participantsAllowed(participantIds, household, alreadyOnHabit)) return { error: "Pick who it is for." };
  if (sharedNeedsMorePeople(input.sharing === "together", participantIds.length)) return { error: SHARED_NEEDS_TWO_MESSAGE };
  if (input.isPrivate && !canBePrivate(participantIds.length)) return { error: "Only a habit for one person can be private." };

  // Carry-over only means something for a habit with set days.
  return {
    fields: {
      title,
      kind: toHabitKind(input.kind),
      mode: toHabitMode(input.mode),
      icon: input.icon,
      lifeArea: input.lifeArea,
      timeOfDay: input.timeOfDay,
      schedule,
      weekdays,
      times,
      anchorWeek,
      carryOver: !hours && canCarryOver(schedule, days ?? []) && input.carryOver === true,
      sharing: toHabitSharing(input.sharing),
      isPrivate: input.isPrivate === true,
      track: toHabitTrack(input.track),
      ...(hours ? { weeklyMinutes, paceDays: toPaceDays(input.paceDays) } : {}),
    },
    participantIds,
    everyone,
  };
}
