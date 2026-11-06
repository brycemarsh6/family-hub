"use client";

import { useOptimistic } from "react";
import { ListChecks } from "lucide-react";
import DashboardTile from "./DashboardTile";
import { HabitRow } from "./HabitRow";
import { checkHabit, skipHabit, uncheckHabit, unskipHabit } from "@/app/actions/habitChecks";
import { applyHabitChange, type HabitChange } from "@/lib/habitChanges";
import type { HabitRowView } from "@/lib/habitsRead";
import { formatCalendarDate } from "@/lib/householdDate";
import { useOptimisticRun } from "@/lib/useOptimisticRun";

/**
 * The live Today rows inside a dashboard tile (decisions 132, 133, 134): the
 * same `HabitRow`, the same check actions and the same optimistic wrapper as
 * `HabitTodayList`. The rows are the server's pick for the tile; a tap shows at
 * once and the page refreshes behind it. `empty` is the server's line for no rows.
 */
export function HabitTileRows({
  rows,
  empty,
  showStreaks,
}: {
  rows: HabitRowView[];
  empty: string | null;
  showStreaks: boolean;
}) {
  const [live, applyOptimistic] = useOptimistic<HabitRowView[], HabitChange>(rows, applyHabitChange);
  const { run, error } = useOptimisticRun(applyOptimistic);
  // A carried row's tap is for the missed day, not today.
  const dayOf = (row: HabitRowView) => (row.carriedFrom ? formatCalendarDate(row.carriedFrom) : undefined);

  return (
    <>
      {live.length === 0 && empty && <p className="text-sm text-muted">{empty}</p>}
      {live.length > 0 && (
        <ul className="-mx-4 divide-y divide-line border-y border-line">
          {live.map((row) => (
            <li key={row.id}>
              <HabitRow
                row={row}
                showStreaks={showStreaks}
                onToggle={() =>
                  row.doneToday
                    ? run({ type: "uncheck", habitId: row.id }, () => uncheckHabit(row.id, undefined, dayOf(row)))
                    : run({ type: "check", habitId: row.id }, () => checkHabit(row.id, undefined, dayOf(row)))
                }
                onSkip={() =>
                  run({ type: row.carriedFrom ? "skipCarried" : "skip", habitId: row.id }, () => skipHabit(row.id, undefined, dayOf(row)))
                }
                onUnskip={() => run({ type: "unskip", habitId: row.id }, () => unskipHabit(row.id))}
              />
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
  label,
  empty,
  showStreaks,
}: {
  rows: HabitRowView[];
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
      <HabitTileRows rows={rows} empty={empty} showStreaks={showStreaks} />
    </DashboardTile>
  );
}
