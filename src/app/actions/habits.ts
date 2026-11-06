"use server";

// Habit actions that belong to no single page: the admin-only "Recompute
// streaks" button on /settings, and the habit editor's writes (create, update,
// archive, restore, delete, reorder). The checks on Today live in
// habitChecks.ts. Every action uses the null-returning guard
// (getVerifiedUser) and shows its refusal inline, since a thrown redirect
// would bounce the browser mid-click (STRUCTURE.md guard-form rule). Guard
// order is always: session, then the habit's row (so the policy has facts to
// read), then the policy (`access.ts`), then the fields. A missing habit and
// a refused one answer the same words, so a private habit's existence is not
// confirmed to someone who may not see it. Server Actions are public POST
// endpoints: nothing here trusts the page that rendered the button.

import { revalidatePath } from "next/cache";
import { getVerifiedUser, type VerifiedUser } from "@/lib/dal";
import { householdToday } from "@/lib/assistant/today";
import { canEditHabit } from "@/lib/habits/access";
import type { HabitFields } from "@/lib/habits/habitRows";
import {
  archiveHabit as archiveHabitRow,
  createHabit as createHabitRow,
  deleteHabit as deleteHabitRow,
  recomputeAllStreaks as rebuildAllStreaks,
  restoreHabit as restoreHabitRow,
  updateHabit as updateHabitRow,
} from "@/lib/habits/habitWrites";
import { householdParticipantIds, reorderHabits as reorderHabitRows } from "@/lib/habits/participantWrites";
import { dayOfWeek, parseDateParam } from "@/lib/householdDate";
import { toLifeArea } from "@/lib/goalVocabulary";
import {
  HABIT_ICONS,
  HABIT_TIMES_LIMITS,
  HABIT_TITLE_MAX,
  TIMES_OF_DAY,
  canBePrivate,
  canCarryOver,
  parseWeekdayMask,
  toHabitKind,
  toHabitMode,
  toHabitSchedule,
  toHabitSharing,
} from "@/lib/habitVocabulary";
import { loadHabitForAction } from "@/lib/habitsRead";
import { participantsAllowed } from "@/lib/habitsToday";

export type RecomputeResult = { error?: string; habits?: number };

/** What every habit action answers: an `error` to show inline, or success (with the new habit's `id` on create). */
export type HabitActionResult = { error?: string; id?: string };

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
};

const MAX_REORDER_IDS = 500;
const NOT_FOUND = "That habit isn't available.";
const NOT_SIGNED_IN = "Not signed in.";
const DEVICE_REFUSAL = "The tablet can't change habits.";

function revalidateHabits() {
  revalidatePath("/habits", "layout");
  revalidatePath("/plans", "layout");
}

/** Rebuild every cached streak from the check history. Admins only. */
export async function recomputeAllStreaks(): Promise<RecomputeResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: NOT_SIGNED_IN };
  if (user.role !== "admin") return { error: "Only an admin can recompute streaks." };

  try {
    const { habits } = await rebuildAllStreaks(householdToday(new Date())!);
    return { habits };
  } catch (err) {
    console.error("recomputeAllStreaks failed", err);
    return { error: "Couldn't recompute streaks. Try again." };
  }
}

type Checked = { fields: HabitFields & { title: string; schedule: string }; participantIds: string[]; everyone: boolean } | { error: string };

/**
 * Turns the form into columns, refusing anything the form could not have sent.
 * Pure apart from the household read. `alreadyOnHabit` is who the habit holds
 * today (an edit): they stay allowed even if no longer in the household.
 */
async function checkInput(input: HabitInput, alreadyOnHabit: readonly string[] = []): Promise<Checked> {
  if (typeof input !== "object" || input === null) return { error: "Couldn't save it. Try again." };
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) return { error: "Give it a name." };
  if (title.length > HABIT_TITLE_MAX) return { error: `Keep the name to ${HABIT_TITLE_MAX} letters or fewer.` };
  if (toHabitKind(input.kind) !== input.kind) return { error: "Pick habit or chore." };
  if (toHabitMode(input.mode) !== input.mode) return { error: "Pick build or quit." };
  if (toHabitSharing(input.sharing) !== input.sharing) return { error: "Pick who it is for." };
  if (toHabitSchedule(input.schedule) !== input.schedule) return { error: "Pick a schedule." };
  if (input.icon !== null && !(HABIT_ICONS as readonly unknown[]).includes(input.icon)) return { error: "Pick an icon from the list." };
  if (input.lifeArea !== null && toLifeArea(input.lifeArea) === null) return { error: "Pick a life area from the list." };
  if (input.timeOfDay !== null && !(TIMES_OF_DAY as readonly unknown[]).includes(input.timeOfDay)) return { error: "Pick a time of day from the list." };
  const schedule = toHabitSchedule(input.schedule);

  let weekdays: string | null = null;
  let times: number | null = null;
  let anchorWeek: ReturnType<typeof parseDateParam> = null;
  const days = input.weekdays === null ? null : parseWeekdayMask(input.weekdays);
  if (input.weekdays !== null && !days) return { error: "Pick the days again." };
  if (schedule === "weekdays") {
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
  const household = await householdParticipantIds();
  const everyone = input.everyone === true;
  const participantIds = everyone ? household : [...new Set(input.participantIds)];
  if (!participantsAllowed(participantIds, household, alreadyOnHabit)) return { error: "Pick who it is for." };
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
      carryOver: canCarryOver(schedule, days ?? []) && input.carryOver === true,
      sharing: toHabitSharing(input.sharing),
      isPrivate: input.isPrivate === true,
    },
    participantIds,
    everyone,
  };
}

/** Whether this signed-in person could still edit the habit once it holds exactly `participantIds`. */
function mayEditResult(user: VerifiedUser, isPrivate: boolean, participantIds: readonly string[]): boolean {
  return canEditHabit({ userId: user.userId, role: user.role }, { isPrivate, participantIds });
}

/** Make a habit or chore. Guards: session, the tablet refused, fields, then you may edit what you'd make. */
export async function createHabit(input: HabitInput): Promise<HabitActionResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: NOT_SIGNED_IN };
  if (user.isDevice) return { error: DEVICE_REFUSAL };
  const checked = await checkInput(input);
  if ("error" in checked) return checked;
  if (!mayEditResult(user, checked.fields.isPrivate ?? false, checked.participantIds)) {
    return { error: "Include yourself, or ask a parent." };
  }
  try {
    const habit = await createHabitRow({
      fields: { ...checked.fields, createdById: user.userId },
      participantIds: checked.participantIds,
      everyone: checked.everyone,
    });
    revalidateHabits();
    return { id: habit.id };
  } catch (err) {
    console.error("createHabit failed", err);
    return { error: "Couldn't save it. Try again." };
  }
}

/** Save the editor. Guards: session, the habit's row, edit policy on it, fields, then edit policy on the result. */
export async function updateHabit(habitId: string, input: HabitInput): Promise<HabitActionResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: NOT_SIGNED_IN };
  if (typeof habitId !== "string") return { error: NOT_FOUND };
  const habit = await loadHabitForAction(habitId);
  if (!habit || !mayEditResult(user, habit.isPrivate, habit.participantIds)) return { error: NOT_FOUND };
  const checked = await checkInput(input, habit.participantIds);
  if ("error" in checked) return checked;
  if (!mayEditResult(user, checked.fields.isPrivate ?? false, checked.participantIds)) {
    return { error: "Include yourself, or ask a parent." };
  }
  try {
    const { fields, participantIds, everyone } = checked;
    const updated = await updateHabitRow(habitId, fields, householdToday(new Date())!, undefined, { participantIds, everyone });
    if (!updated) return { error: NOT_FOUND };
    revalidateHabits();
    return { id: habitId };
  } catch (err) {
    console.error("updateHabit failed", err);
    return { error: "Couldn't save it. Try again." };
  }
}

/** The shared guard for archive, restore and delete: session, row, edit policy. */
async function guardedEdit(habitId: string): Promise<{ error: string } | null> {
  const user = await getVerifiedUser();
  if (!user) return { error: NOT_SIGNED_IN };
  if (typeof habitId !== "string") return { error: NOT_FOUND };
  const habit = await loadHabitForAction(habitId);
  if (!habit || !mayEditResult(user, habit.isPrivate, habit.participantIds)) return { error: NOT_FOUND };
  return null;
}

/** Archive keeps its history and can be brought back. */
export async function archiveHabit(habitId: string): Promise<HabitActionResult> {
  const refused = await guardedEdit(habitId);
  if (refused) return refused;
  try {
    if (!(await archiveHabitRow(habitId, new Date()))) return { error: NOT_FOUND };
    revalidateHabits();
    return { id: habitId };
  } catch (err) {
    console.error("archiveHabit failed", err);
    return { error: "Couldn't archive it. Try again." };
  }
}

/** Bring an archived habit back. */
export async function restoreHabit(habitId: string): Promise<HabitActionResult> {
  const refused = await guardedEdit(habitId);
  if (refused) return refused;
  try {
    if (!(await restoreHabitRow(habitId))) return { error: NOT_FOUND };
    revalidateHabits();
    return { id: habitId };
  } catch (err) {
    console.error("restoreHabit failed", err);
    return { error: "Couldn't restore it. Try again." };
  }
}

/** Delete for good (one tap, no confirmation: the project rule), along with its history and plan items. */
export async function deleteHabit(habitId: string): Promise<HabitActionResult> {
  const refused = await guardedEdit(habitId);
  if (refused) return refused;
  try {
    const { deleted } = await deleteHabitRow(habitId);
    if (!deleted) return { error: NOT_FOUND };
    revalidateHabits();
    return { id: habitId };
  } catch (err) {
    console.error("deleteHabit failed", err);
    return { error: "Couldn't delete it. Try again." };
  }
}

/**
 * Save the order of the signed-in person's own list. Guards: session, the
 * tablet refused (it holds no list), the ids as claims. The writer only ever
 * touches this person's own participant rows and ignores ids they are not in,
 * so there is no per-row policy to read.
 */
export async function reorderHabits(ids: string[]): Promise<HabitActionResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: NOT_SIGNED_IN };
  if (user.isDevice) return { error: DEVICE_REFUSAL };
  if (!Array.isArray(ids) || ids.length > MAX_REORDER_IDS || ids.some((id) => typeof id !== "string")) {
    return { error: "Couldn't save the order." };
  }
  try {
    await reorderHabitRows(user.userId, ids);
    revalidateHabits();
    return {};
  } catch (err) {
    console.error("reorderHabits failed", err);
    return { error: "Couldn't save the order. Try again." };
  }
}
