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
  "id" | "kind" | "dueState" | "carriedFrom" | "doneToday" | "skippedToday" | "onVacation" | "skippedThisWeek" | "plannedToday"
>;

export type TileRows<T extends TileRow> = {
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

/** Due, or already checked or skipped. A plain "open" row nobody has touched is not. */
function isHandled(row: TileRow): boolean {
  return isDue(row) || row.doneToday || row.skippedToday;
}

/** On Today at all: handled, or an open row (decision 132). Only a "none" row nobody touched is not. */
function isOnToday(row: TileRow): boolean {
  return isHandled(row) || row.dueState === "open";
}

/**
 * The rows of the dashboard's "Planned today" card (decision 145): the habits
 * the viewer planned for today, in Today's order. Chores stay in the Chores tile.
 */
export function plannedTodayRows<T extends TileRow>(rows: T[]): T[] {
  return rows.filter((row) => row.kind === "habit" && row.plannedToday);
}

/**
 * The Habits tile (decision 132). Rows already in Planned today are left out
 * (decision 145), picked or not. With picks: the picked habits in picked
 * order, every one Today shows (open, done and skipped ones included). Without:
 * up to three due today and not done or skipped. The empty line says "All
 * done" only when something was due and all of it is done or skipped.
 */
export function habitsTileRows<T extends TileRow>(rows: T[], picks: string[]): TileRows<T> {
  const habits = rows.filter((row) => row.kind === "habit" && !row.plannedToday);
  const picked = picks.length > 0;
  const shown = picked
    ? [...new Set(picks)].flatMap((id) => habits.filter((row) => row.id === id && isOnToday(row)))
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
 * ones done today. A chore done today always stays, vacation or week-skipped
 * (decision 150); undone skipped, skipped-this-week and vacation rows stay out.
 */
export function choresTileRows<T extends TileRow>(rows: T[]): TileRows<T> {
  const shown = rows.filter(
    (row) =>
      row.kind === "chore" &&
      (row.doneToday || (!row.skippedToday && !row.skippedThisWeek && !row.onVacation && isDue(row))),
  );
  return { rows: shown, label: null, empty: shown.length === 0 ? CHORES_TILE_EMPTY : null };
}

/** The habits the picker lists (decision 137): kind habit, not archived, private included. */
export function pickableHabits<T extends Pick<HabitManagerItem, "kind" | "archived">>(manage: T[]): T[] {
  return manage.filter((item) => item.kind === "habit" && !item.archived);
}

/**
 * The rows a tile keeps on screen until the next real page load (decision
 * 147). `shownIds` is what the tile showed at load, in that order. Each id
 * takes the fresh tile row when the tile filter still lists it, else the
 * server's own Today row (`today`, so a streak stays current), else `held`
 * (the row as the last successful tap left it); an id with none is gone. A
 * row the server sends that was not shown at load never slides in.
 */
export function keepShownRows<T extends { id: string }>(shownIds: string[], fresh: T[], today: T[], held: T[]): T[] {
  return shownIds.flatMap((id) => {
    const row = fresh.find((r) => r.id === id) ?? today.find((r) => r.id === id) ?? held.find((r) => r.id === id);
    return row ? [row] : [];
  });
}
