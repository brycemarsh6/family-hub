import {
  GOAL_PAGE_VISION_HORIZON,
  GOAL_OWNERSHIPS,
  TOGETHER_BOARD,
  toLifeArea,
  toVisionHorizon,
  type GoalOwnership,
  type LifeArea,
  type VisionBoardKey,
  type VisionHorizon,
} from "./goalVocabulary";
import type { Viewer } from "./goals";

// Plans & Goals' vision rules: whose board a statement is on, who may edit
// it, what a save may submit, which statement a goal shows, and the board
// heading. A vision is Mine or Together, never private: a vision board is
// meant to be seen. No db, no React.

export const VISION_TEXT_MAX = 500;

export type VisionRow = {
  area: LifeArea;
  horizon: VisionHorizon;
  /** `visionBoardKey` of the row's owner: it stays a user id after that user is deleted. */
  boardKey: VisionBoardKey;
  text: string;
  updatedAt: Date;
};

export type VisionInput = { board: GoalOwnership; area: LifeArea; horizon: VisionHorizon; text: string };

/** No owner is the Together board. */
export function visionBoardKey(ownerId: string | null): VisionBoardKey {
  return ownerId === null ? TOGETHER_BOARD : ownerId;
}

/** The user id a board belongs to; null for Together. */
export function boardOwnerId(key: VisionBoardKey): string | null {
  return key === TOGETHER_BOARD ? null : key;
}

/** A device never edits; Together is any login's; a person's board is its owner's alone. */
export function canEditVision(ownerId: string | null, viewer: Viewer): boolean {
  if (viewer.isDevice) return false;
  return ownerId === null || ownerId === viewer.userId;
}

function isRecord(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw);
}

/** Empty text is allowed and means "clear this vision". */
export function validateVisionInput(raw: unknown): { ok: VisionInput } | { error: string } {
  if (!isRecord(raw)) return { error: "That vision didn't come through. Try again." };
  const board = GOAL_OWNERSHIPS.find((option) => option === raw.board) ?? null;
  if (!board) return { error: "Pick whether the vision is Mine or Together." };
  const area = toLifeArea(raw.area);
  if (!area) return { error: "Pick a life area." };
  const horizon = toVisionHorizon(raw.horizon);
  if (!horizon) return { error: "Pick 5, 10 or 15 years." };
  if (raw.text != null && typeof raw.text !== "string") return { error: "The vision needs to be words." };
  const text = typeof raw.text === "string" ? raw.text.trim() : "";
  if (text.length > VISION_TEXT_MAX) return { error: `Keep it under ${VISION_TEXT_MAX} characters.` };
  return { ok: { board, area, horizon, text } };
}

/** The goal owner's statement for this area and horizon, else the Together one, else null. */
export function visionForGoal(
  goalOwnerId: string | null,
  area: LifeArea,
  rows: VisionRow[],
  horizon: VisionHorizon = GOAL_PAGE_VISION_HORIZON,
): VisionRow | null {
  const filled = rows.filter((row) => row.area === area && row.horizon === horizon && row.text.trim() !== "");
  const own = goalOwnerId === null ? undefined : filled.find((row) => row.boardKey === visionBoardKey(goalOwnerId));
  return own ?? filled.find((row) => row.boardKey === TOGETHER_BOARD) ?? null;
}

/** "Our family in 2036" (no name) or "Bryce in 2036". */
export function boardHeading(name: string | null, todayYear: number, horizon: VisionHorizon): string {
  const year = todayYear + horizon;
  return name === null ? `Our family in ${year}` : `${name} in ${year}`;
}
