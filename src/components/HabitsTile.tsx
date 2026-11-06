"use client";

import { useOptimistic, useState } from "react";
import { ListChecks } from "lucide-react";
import DashboardTile from "./DashboardTile";
import { HabitRow } from "./HabitRow";
import { checkHabit, skipHabit, uncheckHabit, unskipHabit } from "@/app/actions/habitChecks";
import { applyHabitChange, type HabitChange } from "@/lib/habitChanges";
import type { HabitRowView } from "@/lib/habitsRead";
import { keepShownRows } from "@/lib/habitsDashboard";
import { formatCalendarDate } from "@/lib/householdDate";
import { useOptimisticRun } from "@/lib/useOptimisticRun";

/**
 * The three taps of one Today row, shared by Today's list and the dashboard
 * tiles: check or uncheck, skip (the missed day for a carried row, decision 89)
 * and undo a skip. A carried row's tap is for the missed day, not today.
 */
export function habitRowTaps(
  row: HabitRowView,
  run: (change: HabitChange, action: () => Promise<{ error?: string }>) => void,
) {
  const day = row.carriedFrom ? formatCalendarDate(row.carriedFrom) : undefined;
  return {
    onToggle: () =>
      row.doneToday
        ? run({ type: "uncheck", habitId: row.id }, () => uncheckHabit(row.id, undefined, day))
        : run({ type: "check", habitId: row.id }, () => checkHabit(row.id, undefined, day)),
    onSkip: () =>
      run({ type: row.carriedFrom ? "skipCarried" : "skip", habitId: row.id }, () => skipHabit(row.id, undefined, day)),
    onUnskip: () => run({ type: "unskip", habitId: row.id }, () => unskipHabit(row.id)),
  };
}

/**
 * The live Today rows inside a dashboard tile (decisions 132, 133, 134): the
 * same `HabitRow`, the same taps and the same optimistic wrapper as
 * `HabitTodayList`. The rows shown at load stay until the next real page load
 * (decision 147): a tapped row keeps its place with its change even when the
 * refresh behind the tap no longer lists it, and no new row slides in.
 * `empty` is the server's line for no rows.
 */
export function HabitTileRows({
  rows,
  todayRows,
  empty,
  showStreaks,
}: {
  rows: HabitRowView[];
  /** The server's full Today rows for this tile's kind, for a shown row the tile filter drops. */
  todayRows: HabitRowView[];
  empty: string | null;
  showStreaks: boolean;
}) {
  // Fixed at load: which rows this tile shows, the rows as the last saved tap
  // left them (for a row the server stops sending), and the empty line to fall back on.
  const [shownIds] = useState(() => rows.map((row) => row.id));
  const [held, setHeld] = useState(rows);
  const [firstEmpty] = useState(empty);
  const kept = keepShownRows(shownIds, rows, todayRows, held);
  const [live, applyOptimistic] = useOptimistic<HabitRowView[], HabitChange>(kept, applyHabitChange);
  const { run, error } = useOptimisticRun<HabitChange>(applyOptimistic);
  const emptyLine = empty ?? firstEmpty;

  return (
    <>
      {live.length === 0 && emptyLine && <p className="text-sm text-muted">{emptyLine}</p>}
      {live.length > 0 && (
        // The list runs to the card's edge when nothing sits under it, so there is no empty strip below the last row.
        <ul className={`-mx-4 divide-y divide-line border-t border-line ${error ? "border-b" : "-mb-4"}`}>
          {live.map((row) => (
            <li key={row.id}>
              <HabitRow row={row} showStreaks={showStreaks} {...habitRowTaps(row, (change, action) =>
                  run(change, action, () => setHeld((prev) => applyHabitChange(prev, change))),
                )} />
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-warn">
          {error}
        </p>
      )}
    </>
  );
}

/**
 * The dashboard's Habits tile (decision 132). Its header is the tap into
 * Habits & Chores; the rows keep their own taps, so it uses DashboardTile's
 * panel shape. `label` is "The ones you picked" when the person has picks.
 */
export default function HabitsTile({
  rows,
  todayRows,
  label,
  empty,
  showStreaks,
}: {
  rows: HabitRowView[];
  todayRows: HabitRowView[];
  label: string | null;
  empty: string | null;
  showStreaks: boolean;
}) {
  return (
    <DashboardTile
      shape="panel"
      href="/habits"
      icon={<ListChecks aria-hidden="true" size={20} className="text-muted" />}
      title="Habits"
    >
      {label && <p className="mb-1 text-sm text-muted">{label}</p>}
      <HabitTileRows rows={rows} todayRows={todayRows} empty={empty} showStreaks={showStreaks} />
    </DashboardTile>
  );
}
