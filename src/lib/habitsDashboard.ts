import {
  CHORES_TILE_EMPTY,
  HABITS_TILE_ALL_DONE,
  HABITS_TILE_DEFAULT_LIMIT,
  HABITS_TILE_NOTHING_DUE,
  HABITS_TILE_PICKED_LABEL,
} from "./habitVocabulary";
import type { HabitManagerItem, HabitRowView } from "./habitsToday";

// Pure builders for the dashboard's Habits and Chores today tiles (decisions
// 132, 133, 137). They take Today's rows (already the viewer's, already only
// what Today would show) and decide which ones a tile lists and what its
// empty line says. No db, no React, no clock: "today" is already baked into
// the rows by habitsToday.ts.

type TileRow = Pick<
  HabitRowView,
  "id" | "kind" | "dueState" | "carriedFrom" | "doneToday" | "skippedToday" | "onVacation" | "skippedThisWeek"
>;

export type HabitsTile<T extends TileRow> = {
  rows: T[];
  /** "The ones you picked" when the person has picks, else null. */
  label: string | null;
  /** What to say when `rows` is empty, else null. */
  empty: string | null;
};

/** Due today: required, or carried over from a missed day (decision 132). */
function isDue(row: TileRow): boolean {
  return row.dueState === "required" || row.carriedFrom !== null;
}

/** On Today for a reason: due, or already checked or skipped. A plain "open" row nobody has touched is not. */
function isHandled(row: TileRow): boolean {
  return isDue(row) || row.doneToday || row.skippedToday;
}

/**
 * The Habits tile (decision 132). With picks: the picked habits in picked
 * order, only those Today shows, done and skipped ones included. Without:
 * up to three due today and not done or skipped. The empty line says "All
 * done" only when something was due and all of it is done or skipped.
 */
export function habitsTileRows<T extends TileRow>(rows: T[], picks: string[]): HabitsTile<T> {
  const habits = rows.filter((row) => row.kind === "habit");
  const picked = picks.length > 0;
  const shown = picked
    ? [...new Set(picks)].flatMap((id) => habits.filter((row) => row.id === id && isHandled(row)))
    : habits.filter((row) => isDue(row) && !row.doneToday && !row.skippedToday).slice(0, HABITS_TILE_DEFAULT_LIMIT);
  const empty =
    shown.length > 0
      ? null
      : !picked && habits.some(isHandled)
        ? HABITS_TILE_ALL_DONE
        : HABITS_TILE_NOTHING_DUE;
  return { rows: shown, label: picked ? HABITS_TILE_PICKED_LABEL : null, empty };
}

/**
 * The Chores today tile (decision 133): chores due or carried today plus the
 * ones done today. Skipped, skipped-this-week and vacation rows stay out.
 */
export function choresTileRows<T extends TileRow>(rows: T[]): HabitsTile<T> {
  const shown = rows.filter(
    (row) =>
      row.kind === "chore" &&
      !row.skippedToday &&
      !row.skippedThisWeek &&
      !row.onVacation &&
      (isDue(row) || row.doneToday),
  );
  return { rows: shown, label: null, empty: shown.length === 0 ? CHORES_TILE_EMPTY : null };
}

/** The habits the picker lists (decision 137): kind habit, not archived, private included. */
export function pickableHabits<T extends Pick<HabitManagerItem, "kind" | "archived">>(manage: T[]): T[] {
  return manage.filter((item) => item.kind === "habit" && !item.archived);
}
