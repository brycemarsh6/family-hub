"use client";

import { useOptimistic } from "react";
import { Users } from "lucide-react";
import { FamilyHabitRow, HabitFamilyColumn } from "./HabitFamilyColumn";
import { checkHabit, uncheckHabit } from "@/app/actions/habitChecks";
import { applyHabitChange, type HabitChange } from "@/lib/habitChanges";
import type { FamilyPage, FamilyRow } from "@/lib/habitsFamily";
import { formatCalendarDate } from "@/lib/householdDate";
import { useOptimisticRun } from "@/lib/useOptimisticRun";

/** A tap applied to every place the habit shows: the strip and each column (an Each habit's `userId` keeps it to one person's own flags). */
function applyToPage(page: FamilyPage, change: HabitChange): FamilyPage {
  return {
    ...page,
    together: applyHabitChange(page.together, change),
    columns: page.columns.map((column) => ({ ...column, rows: applyHabitChange(column.rows, change) })),
  };
}

/** A carried row's tap is for the missed day, not today (same rule as Today). */
const dayOf = (row: FamilyRow) => (row.carriedFrom ? formatCalendarDate(row.carriedFrom) : undefined);

/**
 * The family view (decision 95): the Together strip, then a card per person.
 * Cards stack on a phone and sit side by side where two fit (an iPad at 820px).
 * A tap logs for `row.logForId` through the same actions and the same optimistic
 * reducer as Today; a row the viewer may not log for has no button.
 */
export function HabitFamilyView({ page, showStreaks }: { page: FamilyPage; showStreaks: boolean }) {
  const [live, applyOptimistic] = useOptimistic<FamilyPage, HabitChange>(page, applyToPage);
  const { run, error } = useOptimisticRun(applyOptimistic);

  function toggle(row: FamilyRow) {
    const change = { habitId: row.id, userId: row.logForId };
    if (row.doneToday) run({ ...change, type: "uncheck" }, () => uncheckHabit(row.id, row.logForId, dayOf(row)));
    else run({ ...change, type: "check" }, () => checkHabit(row.id, row.logForId, dayOf(row)));
  }

  return (
    <div className="flex flex-col gap-3.5">
      {error && (
        <p role="alert" className="text-sm text-warn">
          {error}
        </p>
      )}
      {live.together.length > 0 && (
        <section aria-label="Together" className="rounded-2xl border border-line bg-surface p-3">
          <div className="flex items-center gap-2 pb-1">
            <Users aria-hidden="true" size={20} className="text-accent" />
            <h2 className="text-base font-bold">Together</h2>
          </div>
          <ul className="flex flex-col divide-y divide-line sm:flex-row sm:flex-wrap sm:divide-y-0 sm:gap-x-8">
            {live.together.map((row) => (
              <li key={row.id} className="sm:min-w-64">
                <FamilyHabitRow row={row} showStreaks={showStreaks} onToggle={() => toggle(row)} together />
              </li>
            ))}
          </ul>
        </section>
      )}
      {live.columns.length === 0 ? (
        <p className="text-sm text-muted">No one to show yet.</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] items-start gap-3.5">
          {live.columns.map((column) => (
            <HabitFamilyColumn key={column.id} column={column} together={live.together} showStreaks={showStreaks} onToggle={toggle} />
          ))}
        </div>
      )}
    </div>
  );
}
