"use client";

import { useOptimistic, useState } from "react";
import { ListChecks } from "lucide-react";
import DashboardTile from "./DashboardTile";
import { HabitRow } from "./HabitRow";
import { HoursLogSheet, type RunChange } from "./HoursLogSheet";
import { checkHabit, skipHabit, uncheckHabit, unskipHabit } from "@/app/actions/habitChecks";
import { applyHabitChange, type HabitChange } from "@/lib/habitChanges";
import type { HabitRowView } from "@/lib/habitsRead";
import { keepShownRows } from "@/lib/habitsDashboard";
import { DASHBOARD_WIDGET_WORDS } from "@/lib/dashboardWidgets";
import { formatCalendarDate } from "@/lib/householdDate";
import { useOptimisticRun } from "@/lib/useOptimisticRun";

/**
 * The three taps of one Today row, shared by Today's list and the dashboard
 * tiles: check or uncheck, skip (the missed day for a carried row, decision 89)
 * and undo a skip. A carried row's tap is for the missed day, not today. An
 * hours row has no check: its tap calls `openLog` for the log sheet (decision
 * 189) and never writes one.
 */
export function habitRowTaps(
  row: HabitRowView,
  run: (change: HabitChange, action: () => Promise<{ error?: string }>) => void,
  openLog?: (row: HabitRowView) => void,
) {
  const day = row.carriedFrom ? formatCalendarDate(row.carriedFrom) : undefined;
  return {
    onToggle: () => {
      if (row.hours) return openLog?.(row);
      if (row.doneToday) return run({ type: "uncheck", habitId: row.id }, () => uncheckHabit(row.id, undefined, day));
      run({ type: "check", habitId: row.id }, () => checkHabit(row.id, undefined, day));
    },
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
 * `empty` is the server's line for no rows. `limit` (a Medium widget) shows
 * the first rows only and says how many more there are, in plain text: the
 * whole tile is still one place to tap, so no link (decision 207).
 */
export function HabitTileRows({
  rows,
  todayRows,
  empty,
  showStreaks,
  limit,
}: {
  rows: HabitRowView[];
  /** The server's full Today rows for this tile's kind, for a shown row the tile filter drops. */
  todayRows: HabitRowView[];
  empty: string | null;
  showStreaks: boolean;
  /** Most rows to list; the rest become a "+N more" line. Without it every row shows. */
  limit?: number;
}) {
  // Fixed at load: which rows this tile shows, the rows as the last saved tap
  // left them (for a row the server stops sending), and the empty line to fall back on.
  const [shownIds] = useState(() => rows.map((row) => row.id));
  const [held, setHeld] = useState(rows);
  const [firstEmpty] = useState(empty);
  const kept = keepShownRows(shownIds, rows, todayRows, held);
  const [live, applyOptimistic] = useOptimistic<HabitRowView[], HabitChange>(kept, applyHabitChange);
  const { run, error, setError, pending } = useOptimisticRun<HabitChange>(applyOptimistic);
  // The hours row whose log sheet is open, by id, so the sheet reads the row's live week.
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const logging = live.find((row) => row.id === loggingId && row.hours);
  const keep: RunChange = (change, action, onSuccess) =>
    run(change, action, () => {
      setHeld((prev) => applyHabitChange(prev, change));
      onSuccess?.();
    });
  const emptyLine = empty ?? firstEmpty;
  const shown = limit === undefined ? live : live.slice(0, limit);
  const hidden = live.length - shown.length;

  return (
    <>
      {live.length === 0 && emptyLine && <p className="text-sm text-muted">{emptyLine}</p>}
      {live.length > 0 && (
        // The list runs to the card's edge when nothing sits under it, so there is no empty strip below the last row.
        <ul className={`-mx-4 divide-y divide-line border-t border-line ${error || hidden > 0 ? "border-b" : "-mb-4"}`}>
          {shown.map((row) => (
            <li key={row.id}>
              <HabitRow row={row} showStreaks={showStreaks} {...habitRowTaps(row, (change, action) => keep(change, action), (hoursRow) => {
                setError(null);
                setLoggingId(hoursRow.id);
              })} />
            </li>
          ))}
        </ul>
      )}
      {hidden > 0 && <p className="mt-2 text-sm text-muted">{DASHBOARD_WIDGET_WORDS.moreRows(hidden)}</p>}
      {error && !logging && (
        <p role="alert" className="mt-2 text-sm text-warn">
          {error}
        </p>
      )}
      {logging?.hours && (
        <HoursLogSheet
          habitId={logging.id}
          title={logging.title}
          hours={logging.hours}
          forUserId={logging.viewerId}
          run={keep}
          pending={pending}
          error={error}
          onEdit={() => setError(null)}
          onClose={() => setLoggingId(null)}
        />
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
  limit,
}: {
  rows: HabitRowView[];
  todayRows: HabitRowView[];
  label: string | null;
  empty: string | null;
  showStreaks: boolean;
  limit?: number;
}) {
  return (
    <DashboardTile
      shape="panel"
      href="/habits"
      icon={<ListChecks aria-hidden="true" size={20} className="text-muted" />}
      title="Habits"
    >
      {label && <p className="mb-1 text-sm text-muted">{label}</p>}
      <HabitTileRows rows={rows} todayRows={todayRows} empty={empty} showStreaks={showStreaks} limit={limit} />
    </DashboardTile>
  );
}
