"use server";

// Server Actions for calendar Tasks (Calendar v2, phase CT1 — see
// .avengers/plans/calendar-v2.md). Same rule as every other actions file: a
// Server Action is a real public POST endpoint, reachable directly, so
// every one of these opens with a guard.
//
// create/update/delete are gated to MANAGER_ROLES, the same "parents
// manage, kids participate" line calendar.ts and mealPlans.ts already draw,
// using the exact NULL-RETURNING guard shape calendar.ts's own actions use
// (getVerifiedUser() + MANAGER_ROLES read from constants.ts): these actions
// are reachable from shipped UI (TaskForm) that renders a failure inline, so
// a thrown redirect() would bounce a signed-in kid's browser mid-request
// instead of just refusing the write. See STRUCTURE.md's guard-form rule.
//
// complete/uncomplete use a THIRD guard form neither of STRUCTURE.md's two
// documented ones covers: a verified user may toggle a task's completion if
// they are either a manager, or a person the task is actually assigned to
// (a real TaskPerson row) — "kids can mark their own tasks complete" is the
// whole reward-points loop this phase exists to make room for. This is not
// self-authorized as a new house pattern: mission-13/C4 flags it for
// Captain to draft a STRUCTURE.md amendment and Bryce to approve, same as
// every other structural change in this repo.
//
// `rrule` is accepted as opaque, optional text and stored as-given — K4
// reads and expands it, nothing here does. TaskForm (CT1) has no control
// that sets it yet, matching EventForm's own rrule precedent in calendar.ts.
// There is no "Sync to" field — that's K6, once a calendar is linked.

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getVerifiedUser, type VerifiedUser } from "@/lib/dal";
import { MANAGER_ROLES } from "@/lib/constants";
import { isMissingRowError } from "@/lib/prismaErrors";

function refreshCalendarViews() {
  revalidatePath("/calendar");
}

export type TaskActionResult = { error?: string };

/** The one shape create and update both take — a plain object, not
 * FormData, matching CalendarEventInput's own reasoning in calendar.ts:
 * TaskForm composes a real Date client-side (the due-date input, converted
 * through calendarDates.ts's localDayToAllDayInstant) before calling
 * either action. */
export type TaskInput = {
  title: string;
  details?: string | null;
  /** A UTC-midnight instant — a Task's due date is all-day by construction
   * (see Task.dueDate's own schema comment). Always build this with
   * localDayToAllDayInstant, never a bare `new Date(y, m, d)`, or the row
   * reintroduces the exact bug CT1 exists to close. */
  dueDate: Date;
  /** rrule is K1/CT1-opaque: stored verbatim, never parsed or expanded
   * here. No UI sets it yet. */
  rrule?: string | null;
  /** Every person this task is for. At least one is required — same rule
   * CalendarEventInput.userIds enforces, and for the same reason: there is
   * no "nobody's" task, and a kid can only complete a task they are
   * actually a person on. */
  userIds: string[];
};

/**
 * Re-validates a proposed people list against the database rather than
 * trusting client-supplied ids — the same discipline calendar.ts's own
 * validatedPeople and addIngredientsToGroceries's pantryItemId check use.
 * Deliberately a separate copy rather than an import from calendar.ts: this
 * contract's boundary does not include that file, and STRUCTURE.md already
 * sanctions this exact kind of per-action-file duplication (see its
 * "Revalidation is per-action-file, private, and duplicated on purpose"
 * rule — the same reasoning applies to a small validation helper that has
 * no reason to become shared vocabulary).
 */
async function validatedPeople(userIds: string[]): Promise<string | null> {
  const unique = Array.from(new Set(userIds));
  if (unique.length === 0) return "Add at least one person.";

  const real = await db.user.findMany({
    where: { id: { in: unique }, deactivatedAt: null },
    select: { id: true },
  });
  if (real.length !== unique.length) {
    return "One of those people isn't available anymore.";
  }
  return null;
}

/** Shared field validation for both create and update — title and people.
 * No time-range check the way calendar.ts's validateEventInput has one:
 * a task has exactly one due date, nothing to compare it against. Returns
 * an error message, or null when the input is good. */
async function validateTaskInput(input: TaskInput): Promise<string | null> {
  if (!input.title.trim()) return "Give the task a title.";
  return validatedPeople(input.userIds);
}

export type CreateTaskResult = TaskActionResult & { id?: string };

/**
 * Create a task and its people rows in one nested write, so a task is
 * never briefly saved with nobody on it — same shape as
 * createCalendarEvent. `createdById` is always the verified caller, never
 * client-supplied.
 */
export async function createTask(input: TaskInput): Promise<CreateTaskResult> {
  const user = await getVerifiedUser();
  if (!user || !MANAGER_ROLES.includes(user.role)) {
    return { error: "Only parents can do that." };
  }

  const validationError = await validateTaskInput(input);
  if (validationError) return { error: validationError };

  const uniqueUserIds = Array.from(new Set(input.userIds));

  const created = await db.task.create({
    data: {
      title: input.title.trim(),
      details: input.details?.trim() || null,
      dueDate: input.dueDate,
      rrule: input.rrule?.trim() || null,
      createdById: user.userId,
      people: { create: uniqueUserIds.map((userId) => ({ userId })) },
    },
    select: { id: true },
  });

  refreshCalendarViews();
  return { id: created.id };
}

/**
 * Update a task's fields and replace its people list wholesale — deleted
 * and recreated rather than diffed, same simplicity call
 * updateCalendarEvent makes at this household's scale, inside one
 * transaction so a reader never sees a task with zero people mid-write.
 */
export async function updateTask(
  id: string,
  input: TaskInput,
): Promise<TaskActionResult> {
  const user = await getVerifiedUser();
  if (!user || !MANAGER_ROLES.includes(user.role)) {
    return { error: "Only parents can do that." };
  }

  const validationError = await validateTaskInput(input);
  if (validationError) return { error: validationError };

  const uniqueUserIds = Array.from(new Set(input.userIds));

  try {
    await db.$transaction([
      db.task.update({
        where: { id },
        data: {
          title: input.title.trim(),
          details: input.details?.trim() || null,
          dueDate: input.dueDate,
          rrule: input.rrule?.trim() || null,
        },
      }),
      db.taskPerson.deleteMany({ where: { taskId: id } }),
      db.taskPerson.createMany({
        data: uniqueUserIds.map((userId) => ({ taskId: id, userId })),
      }),
    ]);
  } catch (error) {
    // Deleted on another phone while this one still had it open.
    if (isMissingRowError(error)) return { error: "That task no longer exists." };
    throw error;
  }

  refreshCalendarViews();
  return {};
}

/**
 * Single tap, no confirmation dialog — same delete rule as every other item
 * in the app. People rows cascade with the task (schema-level).
 * Already-gone is treated as success, same idempotence deleteCalendarEvent
 * gets from catching P2025 rather than reading first.
 */
export async function deleteTask(id: string): Promise<TaskActionResult> {
  const user = await getVerifiedUser();
  if (!user || !MANAGER_ROLES.includes(user.role)) {
    return { error: "Only parents can do that." };
  }

  try {
    await db.task.delete({ where: { id } });
  } catch (error) {
    if (!isMissingRowError(error)) throw error;
  }

  refreshCalendarViews();
  return {};
}

/**
 * The membership guard behind complete/uncomplete — see this file's header
 * comment for why it's a third guard form and who has to approve it landing
 * in STRUCTURE.md. A manager may act on any task; anyone else may act only
 * on a task they are genuinely a person on (a real TaskPerson row, read
 * fresh here — never inferred from anything client-supplied). Returns an
 * error message, or null when the caller is allowed to proceed.
 */
async function assertCanToggleTask(
  user: VerifiedUser,
  taskId: string,
): Promise<string | null> {
  if (MANAGER_ROLES.includes(user.role)) return null;

  const membership = await db.taskPerson.findUnique({
    where: { taskId_userId: { taskId, userId: user.userId } },
    select: { id: true },
  });
  return membership ? null : "You're not assigned to that task.";
}

/**
 * Mark a task done. Unlike create/update/delete, this is reachable by any
 * verified user — including a kid — as long as they're one of the task's
 * people. That's the point: a kid can complete their own chore without
 * being able to touch anyone else's.
 */
export async function completeTask(id: string): Promise<TaskActionResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: "Sign in to do that." };

  const guardError = await assertCanToggleTask(user, id);
  if (guardError) return { error: guardError };

  try {
    await db.task.update({ where: { id }, data: { completedAt: new Date() } });
  } catch (error) {
    if (isMissingRowError(error)) return { error: "That task no longer exists." };
    throw error;
  }

  refreshCalendarViews();
  return {};
}

/** The inverse of completeTask — same membership guard, same reasoning:
 * a kid can un-complete their own task (a mis-tap) without touching anyone
 * else's. */
export async function uncompleteTask(id: string): Promise<TaskActionResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: "Sign in to do that." };

  const guardError = await assertCanToggleTask(user, id);
  if (guardError) return { error: guardError };

  try {
    await db.task.update({ where: { id }, data: { completedAt: null } });
  } catch (error) {
    if (isMissingRowError(error)) return { error: "That task no longer exists." };
    throw error;
  }

  refreshCalendarViews();
  return {};
}
