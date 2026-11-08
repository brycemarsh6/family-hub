import { NOTHING_DUE_TODAY, NOTHING_HERE_TODAY, ON_VACATION_LABEL, TIMES_OF_DAY, familyRowTag, type TimeOfDay } from "./habitVocabulary";
import type { HabitRowView } from "./habitsToday";
import { countedRows, doneCountLabel, type FamilyColumn, type FamilyRow } from "./habitsFamily";

// Time-of-day grouping for both wide views (Mine's four columns and Whole
// family's per-person columns) and the rule for when everyone fits side by
// side. Pure, so the order, the merge and the fit are pinned by tests.

type ColumnInput = Pick<FamilyColumn, "rows" | "togetherIds" | "onVacation">;

/** A row in a column, with the small tag the wide layout shows beside its title (null for a plain habit) and whether it is a Together row. */
export type ColumnItem = { row: FamilyRow; tag: string | null; together: boolean };

/** `key` is a time of day, or "anytime" for rows with none. */
export type ColumnGroup = { key: TimeKey; items: ColumnItem[] };

type TimeKey = TimeOfDay | "anytime";

/** The one time-of-day order, and which bucket a row falls in. */
const TIME_KEYS: readonly TimeKey[] = [...TIMES_OF_DAY, "anytime"];
const timeKeyOf = (row: { timeOfDay: string | null }): TimeKey => (row.timeOfDay as TimeOfDay | null) ?? "anytime";

/** The person's rows once each (`countedRows`: their own, then the Together ones they are on), as column items. */
function columnItems(column: ColumnInput, together: readonly FamilyRow[]): ColumnItem[] {
  const seen = new Set<string>();
  return countedRows(column, together)
    .filter((row) => !seen.has(row.id) && seen.add(row.id))
    .map((row) => {
      const isTogether = column.togetherIds.includes(row.id);
      return { row, tag: familyRowTag(isTogether, row.kind === "chore"), together: isTogether };
    });
}

/**
 * A person's rows in Morning, Afternoon, Evening, then Anytime order, empty
 * groups dropped. Their own rows keep their order; the Together rows they take
 * part in (`togetherIds`) follow, each once, marked with the person's vacation
 * the same way `countedRows` does. `keep` is the filter chip.
 */
export function groupColumnRows(column: ColumnInput, together: readonly FamilyRow[], keep: (row: FamilyRow) => boolean = () => true): ColumnGroup[] {
  const items = columnItems(column, together).filter((item) => keep(item.row));
  return TIME_KEYS
    .map((key) => ({ key, items: items.filter((item) => timeKeyOf(item.row) === key) }))
    .filter((group) => group.items.length > 0);
}

/** A Mine row with the small tag the Today cards show (null for a plain habit; "Chore" for a chore). */
export type TimeRowItem = { row: HabitRowView; tag: string | null };

/** One of Today's four time-of-day columns; `items` may be empty (the caller decides whether to draw it). */
export type TimeGroup = { key: TimeKey; items: TimeRowItem[] };

/**
 * Mine's rows in Morning, Afternoon, Evening, then Anytime order, all four
 * groups kept even when empty. Rows keep their order; `keep` is the Filter.
 */
export function groupRowsByTime(rows: readonly HabitRowView[], keep: (row: HabitRowView) => boolean = () => true): TimeGroup[] {
  const kept = rows.filter(keep);
  return TIME_KEYS.map((key) => ({
    key,
    items: kept.filter((row) => timeKeyOf(row) === key).map((row) => ({ row, tag: familyRowTag(false, row.kind === "chore") })),
  }));
}

/** What an empty column says: nothing due at all, or (the filter chip hid every row) Today's "Nothing here today.". */
export function emptyColumnText(column: ColumnInput, together: readonly FamilyRow[]): string {
  return columnItems(column, together).length === 0 ? NOTHING_DUE_TODAY : NOTHING_HERE_TODAY;
}

/** The line under a person's name: "3 of 7 done", with "On vacation" after it (alone when nothing counts). */
export function familyCountText(column: ColumnInput & Pick<FamilyColumn, "totalCount">, together: readonly FamilyRow[]): string {
  if (column.onVacation && column.totalCount === 0) return ON_VACATION_LABEL;
  const count = doneCountLabel(countedRows(column, together));
  return column.onVacation ? `${count} · ${ON_VACATION_LABEL}` : count;
}

/** The narrowest a person's column may be when everyone fits side by side, and the gap between columns (px). 12, not 14: five 220px columns at the 1148px a 1180 iPad leaves need exactly 1148. `FIT_COLUMN_GAP` is `gap-3`; `HabitFamilyWide`'s strip uses that class, so change them together. */
export const FIT_COLUMN_MIN = 220;
export const FIT_COLUMN_GAP = 12;

/** Whether `count` columns of at least `FIT_COLUMN_MIN` px, `FIT_COLUMN_GAP` px apart, fit in `width` px (so the strip needs no sideways swipe). */
export function fitsEveryone(width: number, count: number): boolean {
  return count > 0 && width >= count * FIT_COLUMN_MIN + (count - 1) * FIT_COLUMN_GAP;
}
