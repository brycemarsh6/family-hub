import "server-only";

// The one place the goal routes read Plans & Goals: the app's own readers
// (`goalsRead.ts`, `visionsRead.ts`) with Winnie's viewer, shaped by
// serializeGoals.ts. Who she may see or change is decided by `canSee`,
// `canEdit` and `canEditVision` (goals.ts, visions.ts) and nowhere else: a goal
// she may not see is answered as missing, never filtered by a second rule.

import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { TOGETHER_BOARD, VISION_HORIZONS, toGoalVisibility, type VisionHorizon } from "@/lib/goalVocabulary";
import { canEdit, canSee, countsInScope, goalsInScope, type GoalView } from "@/lib/goals";
import type { GoalPolicyRow } from "@/lib/goalWrites";
import { loadGoal, loadPlansPage, loadWeekRecap } from "@/lib/goalsRead";
import type { CalendarDate } from "@/lib/householdDate";
import { loadHouseholdPeople } from "@/lib/householdPeople";
import { boardOwnerId, canEditVision } from "@/lib/visions";
import { loadGoalVision } from "@/lib/visionsRead";
import { assistantCreatedWhere, didAssistantCreate } from "./audit";
import { assistantGoalViewer, assistantOwnerId } from "./habitActorEnv";
import { requireHouseholdPerson } from "./habitReads";
import { toGoalDetail, toGoalSummary, toVisionBoards, toWeek } from "./serializeGoals";

/** The guard every goal write passes the write modules: she may see the goal and change it. */
export function winnieMayChangeGoal(goal: GoalPolicyRow): boolean {
  const viewer = assistantGoalViewer();
  const owned = { ownerId: goal.ownerId, visibility: toGoalVisibility(goal.visibility) };
  return canSee(owned, viewer) && canEdit(owned, viewer);
}

/** Whether she may write the board whose owner is `ownerId` (null: Together). */
export function winnieMayWriteBoard(ownerId: string | null): boolean {
  return canEditVision(ownerId, assistantGoalViewer());
}

/** Goals Winnie may see, soonest target date first; `personId` keeps that person's goals and Together's. 404 (thrown) for an unknown person. */
export async function listGoals(opts: { status: "active" | "done" | "all"; personId?: string }, today: CalendarDate) {
  if (opts.personId) await requireHouseholdPerson(opts.personId);
  const person = opts.personId ? { userId: opts.personId, isDevice: false } : null;
  const { goals } = await loadPlansPage(assistantGoalViewer(), today);
  return goals
    .filter((goal) => opts.status === "all" || (opts.status === "active") === (goal.completedAt === null))
    .filter((goal) => person === null || countsInScope(goal, person, "mine"))
    .map(toGoalSummary);
}

/** One goal as the viewer sees it (the view, for a write's answer to pick an item from); null when missing or hidden. */
export function viewGoal(id: string, today: CalendarDate): Promise<GoalView | null> {
  return loadGoal(id, assistantGoalViewer(), today);
}

/** One goal with its plan items, every check-in and the vision line; null when missing or hidden from her. */
export async function getGoal(id: string, today: CalendarDate) {
  const view = await viewGoal(id, today);
  if (!view) return null;
  const [vision, hers, createdByAssistant] = await Promise.all([
    loadGoalVision(view),
    view.checkIns.length === 0
      ? []
      : db.assistantChange.findMany({
          where: assistantCreatedWhere("GoalCheckIn", { in: view.checkIns.map((checkIn) => checkIn.id) }),
          select: { recordId: true },
        }),
    didAssistantCreate("Goal", id),
  ]);
  return toGoalDetail(view, {
    checkIns: view.checkIns,
    madeByAssistant: new Set(hers.map((change) => change.recordId)),
    vision: vision ? { board: vision.boardKey, horizon: vision.horizon, text: vision.text } : null,
    createdByAssistant,
  });
}

/**
 * The This week view: every goal she can see (the app's Everyone chip), or one
 * person's goals plus Together's. The Sunday recap is the owner's "Mine" one
 * for the owner, Everyone's without a person, and none for anyone else. An
 * unknown person throws 404.
 */
export async function readWeek(personId: string | undefined, today: CalendarDate) {
  if (personId) await requireHouseholdPerson(personId);
  const viewer = assistantGoalViewer();
  const { goals, weekStart } = await loadPlansPage(viewer, today);
  const shown = personId ? goalsInScope(goals, { userId: personId, isDevice: false }, "mine") : goalsInScope(goals, viewer, "everyone");
  const recaps = await loadWeekRecap(viewer, today);
  const recap = recaps === null ? null : personId ? (personId === assistantOwnerId() ? recaps.mine : null) : recaps.everyone;
  return toWeek({ goals: shown, weekStart, recapDay: recaps !== null, recap, personId });
}

/**
 * The Vision boards: Together first, then each active person in household
 * order, at one horizon or all three. Null when `board` is neither "together"
 * nor an active household person.
 */
export async function readVision(opts: { board?: string; horizon?: VisionHorizon }, today: CalendarDate) {
  const viewer = assistantGoalViewer();
  const people = await loadHouseholdPeople();
  const all = [TOGETHER_BOARD, ...people.map((person) => person.id)];
  if (opts.board !== undefined && !all.includes(opts.board)) return null;
  const boards = opts.board === undefined ? all : [opts.board];
  const horizons = opts.horizon === undefined ? VISION_HORIZONS : [opts.horizon];
  const [rows, page] = await Promise.all([
    db.visionStatement.findMany({
      where: { boardKey: { in: boards }, horizon: { in: [...horizons] } },
      select: { boardKey: true, area: true, horizon: true, text: true },
    }),
    loadPlansPage(viewer, today),
  ]);
  return { boards: toVisionBoards({ boards, horizons, rows, goals: page.goals, canEdit: (board) => canEditVision(boardOwnerId(board), viewer) }) };
}

/** Inside a write's transaction: lock the goal row, so the reads and the write that follow see one goal. */
export async function lockGoal(tx: Prisma.TransactionClient, id: string): Promise<void> {
  await tx.$queryRaw`SELECT "id" FROM "Goal" WHERE "id" = ${id} FOR UPDATE`;
}
