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
// complete uses a THIRD guard form neither of STRUCTURE.md's two documented
// ones covers: a verified user may mark a task done if they are either a
// manager, or a person the task is actually assigned to (a real TaskPerson
// row) — "kids can mark their own tasks complete" is the whole
// reward-points loop this phase exists to make room for. This is not
// self-authorized as a new house pattern: mission-13/C4 flags it for
// Captain to draft a STRUCTURE.md amendment and Bryce to approve, same as
// every other structural change in this repo.
//
// uncomplete does NOT share that guard — it's back to the plain
// MANAGER_ROLES form create/update/delete use. Per
// .avengers/plans/calendar-v2.md's decision #12 ("Kids can mark their OWN
// tasks complete — complete only. Parents create/edit/delete/un-complete."),
// a kid may only ever move a task forward to done, never undo a completion
// — theirs or a parent's. (mission-13/C4b — the first version of this file
// gave uncomplete the same membership guard as complete and flagged the
// tension instead of guessing; this is that tension resolved.)
//
// `rrule` is accepted as opaque, optional text and stored as-given — K4
// reads and expands it, nothing here does. TaskForm (CT1) has no control
// that sets it yet, matching EventForm's own rrule precedent in calendar.ts.
// There is no "Sync to" field — that's K6, once a calendar is linked.

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getVerifiedSession, getVerifiedUser, type VerifiedUser } from "@/lib/dal";
import { MANAGER_ROLES } from "@/lib/constants";
import { isMissingRowError } from "@/lib/prismaErrors";
import { localDayToAllDayInstant } from "@/lib/calendarDates";
import { startOfDay } from "@/lib/mealPlanDates";
import type { CalendarTaskView } from "@/lib/types";

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
 * Deliberately a separate copy rather than an import from calendar.ts:
 * a "use server" file may not export a non-action helper, so a shared
 * home for this would have to be a new server-only module in src/lib/,
 * not an import between action files. A third copy (K4, CT2, or K6)
 * makes it shared vocabulary and forces that extraction.
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
 * The membership guard behind completeTask only — see this file's header
 * comment for why it's a third guard form and who has to approve it landing
 * in STRUCTURE.md. A manager may act on any task; anyone else may act only
 * on a task they are genuinely a person on (a real TaskPerson row, read
 * fresh here — never inferred from anything client-supplied). Returns an
 * error message, or null when the caller is allowed to proceed.
 * uncompleteTask does NOT use this — it's MANAGER_ROLES-only, see the file
 * header.
 */
async function assertCanCompleteTask(
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

  const guardError = await assertCanCompleteTask(user, id);
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

/** The inverse of completeTask — but NOT the same guard. Undoing a
 * completion is a parent-only action (calendar-v2.md decision #12: kids
 * get "complete only"), so this uses the plain MANAGER_ROLES form
 * create/update/delete already use, not assertCanCompleteTask's membership
 * check. */
export async function uncompleteTask(id: string): Promise<TaskActionResult> {
  const user = await getVerifiedUser();
  if (!user || !MANAGER_ROLES.includes(user.role)) {
    return { error: "Only parents can do that." };
  }

  try {
    await db.task.update({ where: { id }, data: { completedAt: null } });
  } catch (error) {
    if (isMissingRowError(error)) return { error: "That task no longer exists." };
    throw error;
  }

  refreshCalendarViews();
  return {};
}

/**
 * A day span, in milliseconds — used only for the scan cap below, never for
 * constructing a calendar-meaningful Date. Same constant, same reasoning, as
 * actions/calendar.ts's own MS_PER_DAY — kept as a separate copy rather than
 * an import between two "use server" files, same reason validatedPeople
 * above is its own copy (see that function's comment).
 */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * How far apart `windowStart`/`windowEnd` may be — the exact same
 * MAX_FETCH_SPAN_DAYS value and reasoning as actions/calendar.ts's
 * fetchCalendarEvents (mission-15/D2: this is a PUBLIC POST endpoint, so an
 * unbounded span would let anyone force a full-table scan). Not exported,
 * for the same reason as actions/calendar.ts's own copy: every top-level
 * export of a "use server" file must be an async function, and exporting a
 * plain constant broke that file's entire module resolution at build time
 * once already (see that file's own comment) — `tsc`/`eslint` stayed clean
 * and only `npm run build` caught it.
 */
const MAX_FETCH_SPAN_DAYS = 124;

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

/**
 * The Task sibling to fetchCalendarEvents (actions/calendar.ts) —
 * mission-15/C3's Schedule view needs both, and that contract's own
 * boundary keeps them in their existing separate files rather than
 * inventing a single cross-file query, the same split page.tsx's own
 * Promise.all already draws between events and tasks. Same guard shape:
 * null-returning getVerifiedSession() (reading the calendar needs no role —
 * MANAGER_ROLES only gates writing one), Date-instance/NaN validation,
 * `end > start`, and this file's own MAX_FETCH_SPAN_DAYS cap.
 *
 * **mission-15/C6 (B3) amends the original contract here too, the same way
 * and for the same reason as fetchCalendarEvents's own header.** Every
 * refusal above now returns `null`, never `[]` — a genuinely empty range
 * (the query legitimately found no tasks due in it) still returns `[]`.
 * `useScheduleWindow`'s `applyChunkResult` (scheduleWindowState.ts) stops
 * scrolling that direction on `null` (a refusal must never be retried) but
 * ADVANCES the window and keeps going on `[]` — a quiet stretch with no
 * tasks due must not permanently wall off everything further out. See
 * fetchCalendarEvents's own comment for the live bug this fixes.
 *
 * THE QUERY ITSELF DELIBERATELY IS NOT A PLAIN `dueDate: { gte: windowStart,
 * lt: windowEnd }` the way page.tsx's inline task query is — that query is
 * safe there only because page.tsx's window carries generous padding
 * (calendarPaging.ts's own `WINDOW_TZ_SKEW_PAD_DAYS`) for an unrelated
 * reason (the server's own clock skew), which happens to also swallow the
 * skew described below as a side effect. Schedule's window carries no such
 * padding (mission-15/D3 — it's built from real browser-local midnights, so
 * there's nothing to guess), and CHUNK_DAYS tiles windows edge-to-edge every
 * 30 days, which makes an edge day far more likely to be hit than it ever
 * is on page.tsx's ±60-day span.
 *
 * The edge case, worked through: Task.dueDate is stored at UTC MIDNIGHT of
 * its calendar day (Task's own schema comment), while `windowStart`/
 * `windowEnd` here are browser-LOCAL midnights. For this household's real
 * timezone (Mountain, UTC-6/-7 — west of UTC), a browser-local midnight is
 * SEVERAL HOURS LATER, as an absolute instant, than UTC midnight of that
 * same calendar day (local midnight = UTC midnight + the zone's positive
 * offset). So a task due exactly on `windowStart`'s own calendar day has a
 * `dueDate` instant that is EARLIER than `windowStart` — a plain
 * `gte: windowStart` query would silently drop it, precisely on the one day
 * most likely to matter (the very first day of a freshly-loaded chunk).
 * Confirmed live against this exact household's zone before writing the fix
 * below — see this contract's own evidence.
 *
 * The fix: re-express `windowStart`/`windowEnd` in Task.dueDate's OWN
 * storage convention (`localDayToAllDayInstant` — the exact function
 * Task.dueDate is always written through) before querying, rather than
 * padding the query and re-filtering. `startOfDay` reads `windowStart`'s
 * calendar day using THIS PROCESS's own local getters; that's safe here
 * specifically because converting an instant that is Mountain-local
 * midnight into ANY server runtime at or east of Mountain (this repo's dev
 * machine, and Vercel's UTC production runtime) lands on the SAME calendar
 * day — the shift is only a few hours, never enough to cross a day
 * boundary in that direction. (This is the same reasoning
 * `allDayInstantToLocalDay`'s own file already leans on for the household's
 * one real, established timezone — not a claim of correctness for every
 * timezone on Earth, which this codebase has never promised — see
 * constants.ts's own note that `HOUSEHOLD_TIME_ZONE` has zero consumers by
 * design.) The result is an exact, no-padding query whose bounds are
 * expressed in the exact same units `dueDate` is stored in, so there is no
 * skew left to compensate for at all.
 */
export async function fetchTasks(
  windowStart: Date,
  windowEnd: Date,
): Promise<CalendarTaskView[] | null> {
  const session = await getVerifiedSession();
  if (!session) return null;

  // A Server Action is a public POST endpoint — anything can be sent here,
  // so the `Date` type annotations above are a claim to verify, not a
  // guarantee to trust. Same checks, same order, as fetchCalendarEvents —
  // every one of these is a REFUSAL (null), never a legitimate empty
  // result.
  if (!isValidDate(windowStart) || !isValidDate(windowEnd)) return null;
  if (windowEnd.getTime() <= windowStart.getTime()) return null;
  if (windowEnd.getTime() - windowStart.getTime() > MAX_FETCH_SPAN_DAYS * MS_PER_DAY) {
    return null;
  }

  const dueDateWindowStart = localDayToAllDayInstant(startOfDay(windowStart));
  const dueDateWindowEnd = localDayToAllDayInstant(startOfDay(windowEnd));

  const tasks = await db.task.findMany({
    where: { dueDate: { gte: dueDateWindowStart, lt: dueDateWindowEnd } },
    orderBy: { dueDate: "asc" },
    select: {
      id: true,
      title: true,
      details: true,
      dueDate: true,
      completedAt: true,
      people: {
        select: {
          user: { select: { id: true, displayName: true, avatarColor: true } },
        },
      },
    },
  });

  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    details: task.details,
    dueDate: task.dueDate,
    completedAt: task.completedAt,
    people: task.people.map((person) => ({
      userId: person.user.id,
      displayName: person.user.displayName,
      avatarColor: person.user.avatarColor,
    })),
    // Same source and reasoning as page.tsx's own CalendarTaskView mapping
    // (D3, mission-14's Banner brief): computed from the verified session
    // against real TaskPerson rows already joined above, never from a role
    // or user object. Decides only whether a mark-complete control is
    // DRAWN — completeTask's own membership guard is the real gate.
    isMine: task.people.some((person) => person.user.id === session.userId),
  }));
}
