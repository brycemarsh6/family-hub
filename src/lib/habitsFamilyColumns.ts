import { TIMES_OF_DAY, type TimeOfDay } from "./habitVocabulary";
import type { FamilyColumn, FamilyRow } from "./habitsFamily";

// The wide (iPad) Whole family column: one person's rows grouped by time of
// day. Pure, so the order and the merge are pinned by tests.

export const TOGETHER_TAG = "Together";
export const CHORE_TAG = "Chore";

/** A row in a column, with the small tag the wide layout shows beside its title (null for a plain habit). */
export type ColumnItem = { row: FamilyRow; tag: string | null };

/** `key` is a time of day, or "anytime" for rows with none. */
export type ColumnGroup = { key: TimeOfDay | "anytime"; items: ColumnItem[] };

/**
 * A person's rows in Morning, Afternoon, Evening, then Anytime order, empty
 * groups dropped. Their own rows keep their order; the Together rows they take
 * part in (`togetherIds`) follow, each once, marked with the person's vacation
 * the same way `countedRows` does. `keep` is the filter chip.
 */
export function groupColumnRows(column: Pick<FamilyColumn, "rows" | "togetherIds" | "onVacation">, together: readonly FamilyRow[], keep: (row: FamilyRow) => boolean = () => true): ColumnGroup[] {
  const own = column.rows.map((row): ColumnItem => ({ row, tag: row.kind === "chore" ? CHORE_TAG : null }));
  const seen = new Set<string>();
  const shared: ColumnItem[] = [];
  for (const row of together) {
    if (!column.togetherIds.includes(row.id) || seen.has(row.id)) continue;
    seen.add(row.id);
    shared.push({ row: column.onVacation ? { ...row, onVacation: true } : row, tag: row.kind === "chore" ? `${TOGETHER_TAG} · ${CHORE_TAG}` : TOGETHER_TAG });
  }
  const items = [...own, ...shared].filter((item) => keep(item.row));
  const keys: ColumnGroup["key"][] = [...TIMES_OF_DAY, "anytime"];
  return keys
    .map((key) => ({ key, items: items.filter((item) => (item.row.timeOfDay ?? "anytime") === key) }))
    .filter((group) => group.items.length > 0);
}
