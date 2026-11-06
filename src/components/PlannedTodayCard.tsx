"use client";

import { useOptimistic } from "react";
import { CalendarCheck } from "lucide-react";
import { HabitRow } from "./HabitRow";
import { habitRowTaps } from "./HabitsTile";
import { applyHabitChange, type HabitChange } from "@/lib/habitChanges";
import type { HabitRowView } from "@/lib/habitsRead";
import { PLANNED_TODAY_TITLE } from "@/lib/habitVocabulary";
import { useOptimisticRun } from "@/lib/useOptimisticRun";

/**
 * The dashboard's "Planned today" card (decision 145): the habits the person
 * planned for today, as the same live rows and taps Today uses. It shows
 * nothing when no habit is planned. A row stays all day (a planned day does not
 * end when it is checked), so unlike a tile it follows the server's rows: a
 * habit planned from a Pick a day card appears here after the refresh.
 */
export function PlannedTodayCard({ rows, showStreaks }: { rows: HabitRowView[]; showStreaks: boolean }) {
  const [live, applyOptimistic] = useOptimistic<HabitRowView[], HabitChange>(rows, applyHabitChange);
  const { run, error } = useOptimisticRun<HabitChange>(applyOptimistic);
  if (live.length === 0) return null;
  return (
    <section aria-label={PLANNED_TODAY_TITLE} className="mb-3 overflow-hidden rounded-2xl border border-line bg-surface">
      <h2 className="flex items-center gap-2 px-3 pb-1 pt-3 text-sm font-semibold uppercase tracking-wide text-muted">
        <CalendarCheck aria-hidden="true" size={18} />
        {PLANNED_TODAY_TITLE}
      </h2>
      <ul className="divide-y divide-line border-t border-line">
        {live.map((row) => (
          <li key={row.id}>
            <HabitRow row={row} showStreaks={showStreaks} {...habitRowTaps(row, run)} />
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="px-3 py-2 text-sm text-warn">
          {error}
        </p>
      )}
    </section>
  );
}
