"use server";

// Server Actions for the plan items under a goal (mission 27): habits, steps
// and reminders. Same rules as goals.ts: every export is a public POST
// endpoint and opens with its own guard, and who may do what comes from
// canSee / canEdit / canLog in src/lib/goals.ts, judged on the item's parent
// goal. Two kinds of action: create, update and delete change the plan, so a
// shared device is refused; logging a habit tap or ticking a step is what the
// wall tablet is for, so those use canLog, which lets a device act on a
// Together goal. Hidden and forbidden answer with the same words.

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getVerifiedUser, type VerifiedUser } from "@/lib/dal";
import { householdToday } from "@/lib/assistant/today";
import {
  canEdit,
  canLog,
  canSee,
  countInWindow,
  logWindow,
  validatePlanItemInput,
  type PlanItemRow,
} from "@/lib/goals";
import { toGoalVisibility, toHabitPeriod, toPlanKind } from "@/lib/goalVocabulary";
import { utcMidnightInstant } from "@/lib/householdDate";
import { Prisma } from "@/generated/prisma/client";
import { isMissingRowError } from "@/lib/prismaErrors";

export type PlanItemActionResult = { error?: string };
export type CreatePlanItemResult = PlanItemActionResult & { id?: string };

const NOT_SIGNED_IN = "Not signed in.";
const DEVICE_REFUSED = "A shared device can't change goals.";
const NOT_ALLOWED = "You can't change that goal.";
const GONE = "That plan no longer exists.";

/** P2003: the goal or item was deleted on another phone between the check and the write. */
function isMissingParentError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003";
}

function refreshPlansViews() {
  revalidatePath("/plans", "layout");
}

type Access = "edit" | "log";

type GoalPolicyRow = { ownerId: string | null; visibility: string };

/** The one place a goal row is judged: edit refuses devices (canEdit), log lets a device on Together goals (canLog). */
function allowed(goal: GoalPolicyRow, user: VerifiedUser, access: Access): boolean {
  const policy = { ownerId: goal.ownerId, visibility: toGoalVisibility(goal.visibility) };
  return canSee(policy, user) && (access === "edit" ? canEdit(policy, user) : canLog(policy, user));
}

type LoadedItem =
  | { user: VerifiedUser; item: PlanItemRow }
  | { error: string; missing?: boolean };

/** Signed in, device rule for edits, then the item and its parent goal judged by `access`. */
async function loadItem(id: string, access: Access): Promise<LoadedItem> {
  const user = await getVerifiedUser();
  if (!user) return { error: NOT_SIGNED_IN };
  if (access === "edit" && user.isDevice) return { error: DEVICE_REFUSED };

  const row = await db.planItem.findUnique({
    where: { id },
    include: { goal: { select: { ownerId: true, visibility: true } } },
  });
  if (!row) return { error: GONE, missing: true };
  if (!allowed(row.goal, user, access)) return { error: NOT_ALLOWED };

  const item: PlanItemRow = {
    id: row.id,
    goalId: row.goalId,
    title: row.title,
    kind: toPlanKind(row.kind) ?? "reminder",
    timesPerPeriod: row.timesPerPeriod,
    period: toHabitPeriod(row.period),
    doneAt: row.doneAt,
    sortOrder: row.sortOrder,
  };
  return { user, item };
}

export async function createPlanItem(goalId: string, raw: unknown): Promise<CreatePlanItemResult> {
  const user = await getVerifiedUser();
  if (!user) return { error: NOT_SIGNED_IN };
  if (user.isDevice) return { error: DEVICE_REFUSED };

  const goal = await db.goal.findUnique({
    where: { id: goalId },
    select: { ownerId: true, visibility: true },
  });
  if (!goal) return { error: "That goal no longer exists." };
  if (!allowed(goal, user, "edit")) return { error: NOT_ALLOWED };

  const checked = validatePlanItemInput(raw);
  if ("error" in checked) return { error: checked.error };
  const input = checked.ok;

  const { _max } = await db.planItem.aggregate({ where: { goalId }, _max: { sortOrder: true } });

  try {
    const created = await db.planItem.create({
      data: {
        goalId,
        title: input.title,
        kind: input.kind,
        timesPerPeriod: input.timesPerPeriod,
        period: input.period,
        sortOrder: (_max.sortOrder ?? -1) + 1,
      },
      select: { id: true },
    });
    refreshPlansViews();
    return { id: created.id };
  } catch (error) {
    if (isMissingParentError(error)) return { error: "That goal no longer exists." };
    throw error;
  }
}

/** Rewrites title, kind and repeat. Turning a step into anything else forgets that it was done. */
export async function updatePlanItem(id: string, raw: unknown): Promise<PlanItemActionResult> {
  const loaded = await loadItem(id, "edit");
  if ("error" in loaded) return { error: loaded.error };

  const checked = validatePlanItemInput(raw);
  if ("error" in checked) return { error: checked.error };
  const input = checked.ok;

  try {
    await db.planItem.update({
      where: { id },
      data: {
        title: input.title,
        kind: input.kind,
        timesPerPeriod: input.timesPerPeriod,
        period: input.period,
        ...(input.kind === "step" ? {} : { doneAt: null }),
      },
    });
  } catch (error) {
    if (isMissingRowError(error)) return { error: GONE };
    throw error;
  }

  refreshPlansViews();
  return {};
}

/** One tap, no confirmation. Its logs cascade. An item already gone is a success. */
export async function deletePlanItem(id: string): Promise<PlanItemActionResult> {
  const loaded = await loadItem(id, "edit");
  if ("error" in loaded) return "missing" in loaded && loaded.missing ? {} : { error: loaded.error };

  try {
    await db.planItem.delete({ where: { id } });
  } catch (error) {
    if (!isMissingRowError(error)) throw error;
  }

  refreshPlansViews();
  return {};
}

/** The habit's logs inside its current window, newest first. Null window = not a habit. */
async function habitWindowLogs(item: PlanItemRow) {
  const window = logWindow(item, householdToday(new Date())!);
  if (!window) return null;
  const logs = await db.planLog.findMany({
    where: { planItemId: item.id, day: { gte: utcMidnightInstant(window.start) } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true, planItemId: true, day: true, createdAt: true },
  });
  return { window, logs };
}

/** One tap on a habit, counted toward today (the household's, not the server's). Refused once the target is met. */
export async function logHabit(id: string): Promise<PlanItemActionResult> {
  const loaded = await loadItem(id, "log");
  if ("error" in loaded) return { error: loaded.error };
  const { user, item } = loaded;

  const found = await habitWindowLogs(item);
  if (!found) return { error: "Only a habit can be logged." };
  if (countInWindow(found.logs, found.window) >= found.window.target) {
    return { error: `Already done for ${found.window.label}.` };
  }

  try {
    await db.planLog.create({
      data: {
        planItemId: id,
        day: utcMidnightInstant(householdToday(new Date())!),
        loggedById: user.userId,
      },
    });
  } catch (error) {
    if (isMissingParentError(error)) return { error: GONE };
    throw error;
  }

  refreshPlansViews();
  return {};
}

/** Takes back the newest tap in the habit's current window. Nothing to take back is fine. */
export async function undoHabitLog(id: string): Promise<PlanItemActionResult> {
  const loaded = await loadItem(id, "log");
  if ("error" in loaded) return { error: loaded.error };

  const found = await habitWindowLogs(loaded.item);
  if (!found) return { error: "Only a habit can be logged." };
  // Newest first, and a tap's day is never after today, so the first is the newest in the window.
  const newest = found.logs[0];
  if (!newest) return {};

  try {
    await db.planLog.delete({ where: { id: newest.id } });
  } catch (error) {
    if (!isMissingRowError(error)) throw error;
  }

  refreshPlansViews();
  return {};
}

async function setStepDone(id: string, doneAt: Date | null): Promise<PlanItemActionResult> {
  const loaded = await loadItem(id, "log");
  if ("error" in loaded) return { error: loaded.error };
  if (loaded.item.kind !== "step") return { error: "Only a step can be checked off." };

  try {
    await db.planItem.update({ where: { id }, data: { doneAt } });
  } catch (error) {
    if (isMissingRowError(error)) return { error: GONE };
    throw error;
  }

  refreshPlansViews();
  return {};
}

export async function completeStep(id: string): Promise<PlanItemActionResult> {
  return setStepDone(id, new Date());
}

export async function uncompleteStep(id: string): Promise<PlanItemActionResult> {
  return setStepDone(id, null);
}
