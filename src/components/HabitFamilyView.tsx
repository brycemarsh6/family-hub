"use client";

import { useEffect, useOptimistic, useRef, useState } from "react";
import { Users } from "lucide-react";
import { HoursLogSheet } from "./HoursLogSheet";
import { FamilyHabitRow, HabitFamilyColumn } from "./HabitFamilyColumn";
import { HabitFamilyWide } from "./HabitFamilyWide";
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
 * Below 768px: the stacked cards (side by side where two fit). From 768px up
 * (an iPad): `HabitFamilyWide`'s 330px columns by time of day (mission 41).
 * Both layouts are rendered from this one optimistic state.
 * A tap logs for `row.logForId` through the same actions and the same optimistic
 * reducer as Today; a row the viewer may not log for has no button.
 */
export function HabitFamilyView({
  page,
  showStreaks,
  canManage,
  focusPersonId,
}: {
  page: FamilyPage;
  showStreaks: boolean;
  /** False on the wall tablet: no Report link. */
  canManage: boolean;
  /** `?person=<id>`: that person's column (wide) or card (stacked) scrolls into view on load. An unknown id does nothing. */
  focusPersonId?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [live, applyOptimistic] = useOptimistic<FamilyPage, HabitChange>(page, applyToPage);
  const { run, error, setError, pending } = useOptimisticRun(applyOptimistic);
  // The hours row whose log sheet is open: the habit and the person, read live so bars move as soon as Add is tapped.
  const [logging, setLogging] = useState<{ habitId: string; userId: string } | null>(null);
  const loggingRow = logging ? live.columns.flatMap((column) => column.rows).find((row) => row.id === logging.habitId && row.logForId === logging.userId && row.hours) : undefined;

  // Both layouts are in the page; the hidden one has no box, so scrolling it does nothing.
  useEffect(() => {
    if (!focusPersonId) return;
    for (const el of root.current?.querySelectorAll<HTMLElement>("[data-family-person]") ?? []) {
      if (el.dataset.familyPerson === focusPersonId) el.scrollIntoView({ inline: "start", block: el.dataset.layout === "wide" ? "nearest" : "start" });
    }
  }, [focusPersonId]);

  function toggle(row: FamilyRow) {
    if (row.hours) {
      setError(null);
      return setLogging({ habitId: row.id, userId: row.logForId });
    }
    const change = { habitId: row.id, userId: row.logForId };
    if (row.doneToday) run({ ...change, type: "uncheck" }, () => uncheckHabit(row.id, row.logForId, dayOf(row)));
    else run({ ...change, type: "check" }, () => checkHabit(row.id, row.logForId, dayOf(row)));
  }

  return (
    <div ref={root} className="flex flex-col gap-3.5 md:min-h-0 md:flex-1">
      {error && !loggingRow && (
        <p role="alert" className="text-sm text-warn">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-3.5 md:hidden">
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
      <HabitFamilyWide page={live} showStreaks={showStreaks} canManage={canManage} onToggle={toggle} />
      {loggingRow?.hours && (
        <HoursLogSheet
          habitId={loggingRow.id}
          title={loggingRow.title}
          hours={loggingRow.hours}
          forUserId={loggingRow.logForId}
          forName={loggingRow.participants.find((p) => p.userId === loggingRow.logForId)?.displayName}
          run={run}
          pending={pending}
          error={error}
          onEdit={() => setError(null)}
          onClose={() => setLogging(null)}
        />
      )}
    </div>
  );
}
