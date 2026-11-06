import "server-only";
import { db } from "@/lib/db";
import type { GoalView, Viewer } from "@/lib/goals";
import { loadGoalAreaCounts } from "@/lib/goalsRead";
import {
  GOAL_OWNERSHIP_LABELS,
  GOAL_PAGE_VISION_HORIZON,
  LIFE_AREAS,
  TOGETHER_BOARD,
  toLifeArea,
  toVisionHorizon,
  type GoalOwnership,
  type LifeArea,
  type VisionBoardKey,
  type VisionHorizon,
} from "@/lib/goalVocabulary";
import type { CalendarDate } from "@/lib/householdDate";
import { loadHouseholdPeople } from "@/lib/householdPeople";
import { boardOwnerId, canEditVision, visionBoardKey, visionForGoal, type VisionRow } from "@/lib/visions";

// Plans & Goals' vision reader: the boards a viewer may look at, one board's
// cards, and the vision a goal's page shows. No auth and no revalidation
// here: the page that calls it guards. Everyone signed in may read every
// board, so nothing is hidden by owner; `canEditVision` only decides the edit
// button. Who a board belongs to is read from its key, never compared here.

/** `param` is the board's `?board=` value: "together", "mine" or the other person's user id. */
export type VisionBoardChoice = { key: VisionBoardKey; label: string; param: string };
export type VisionCardData = { area: LifeArea; text: string | null; goalCount: number };
export type VisionBoardData = {
  boards: VisionBoardChoice[];
  board: VisionBoardKey;
  /** The display name of the person whose board it is; null for Together. */
  ownerName: string | null;
  canEdit: boolean;
  /** Which of the viewer's boards a save lands on; null when the viewer can't edit this one. */
  saveAs: GoalOwnership | null;
  cards: VisionCardData[];
};

/** Together, the viewer's own ("Mine"), then each other active person. A device sees Together only. */
async function loadBoards(viewer: Viewer): Promise<{ boards: VisionBoardChoice[]; names: Map<string, string> }> {
  const boards: VisionBoardChoice[] = [{ key: TOGETHER_BOARD, label: GOAL_OWNERSHIP_LABELS.together, param: TOGETHER_BOARD }];
  const names = new Map<string, string>();
  if (viewer.isDevice) return { boards, names };
  const people = await loadHouseholdPeople();
  for (const person of people) names.set(person.id, person.displayName);
  boards.push({ key: viewer.userId, label: GOAL_OWNERSHIP_LABELS.mine, param: "mine" });
  for (const person of people) {
    if (person.id !== viewer.userId) boards.push({ key: person.id, label: person.displayName, param: person.id });
  }
  return { boards, names };
}

/** One board at one horizon: its cards, with each area's active goal count. */
export async function loadVisionBoard(
  viewer: Viewer,
  boardParam: string | undefined,
  horizon: VisionHorizon,
  today: CalendarDate,
): Promise<VisionBoardData> {
  const { boards, names } = await loadBoards(viewer);
  const board = boards.find((choice) => choice.param === boardParam)?.key ?? TOGETHER_BOARD;
  const boardOwner = boardOwnerId(board);
  const canEdit = canEditVision(boardOwner, viewer);

  const [rows, counts] = await Promise.all([
    db.visionStatement.findMany({ where: { boardKey: board, horizon }, select: { area: true, text: true } }),
    loadGoalAreaCounts(viewer, board, today),
  ]);
  const textByArea = new Map<LifeArea, string>();
  for (const row of rows) {
    const area = toLifeArea(row.area);
    if (area && row.text.trim() !== "") textByArea.set(area, row.text);
  }

  return {
    boards,
    board,
    ownerName: boardOwner === null ? null : (names.get(boardOwner) ?? null),
    canEdit,
    saveAs: canEdit ? (boardOwner === null ? "together" : "mine") : null,
    cards: LIFE_AREAS.map((area) => ({
      area: area.key,
      text: textByArea.get(area.key) ?? null,
      goalCount: counts[area.key],
    })),
  };
}

/** The `GOAL_PAGE_VISION_HORIZON` vision a goal's page shows: its owner's, else Together's, else none. */
export async function loadGoalVision(goal: GoalView): Promise<VisionRow | null> {
  const horizon = GOAL_PAGE_VISION_HORIZON;
  const found = await db.visionStatement.findMany({
    where: { area: goal.area, horizon, boardKey: { in: [TOGETHER_BOARD, visionBoardKey(goal.ownerId)] } },
  });
  const rows: VisionRow[] = found.flatMap((row) => {
    const area = toLifeArea(row.area);
    const rowHorizon = toVisionHorizon(row.horizon);
    if (!area || !rowHorizon) return [];
    return [{ area, horizon: rowHorizon, boardKey: row.boardKey, text: row.text, updatedAt: row.updatedAt }];
  });
  return visionForGoal(goal.ownerId, goal.area, rows, horizon);
}
