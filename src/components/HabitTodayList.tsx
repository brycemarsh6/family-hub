"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { Moon, Sun, Sunset } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { HabitFilterChips, type HabitFilterOption } from "./HabitFilterChips";
import { HabitRow } from "./HabitRow";
import { checkHabit, skipHabit, uncheckHabit, unskipHabit } from "@/app/actions/habitChecks";
import type { HabitActionResult } from "@/app/actions/habits";
import { lifeAreaInfo, toLifeArea } from "@/lib/goalVocabulary";
import { applyHabitChange, type HabitChange } from "@/lib/habitChanges";
import type { HabitRowView } from "@/lib/habitsRead";
import { formatCalendarDate } from "@/lib/householdDate";
import { TIMES_OF_DAY, TIME_OF_DAY_LABELS } from "@/lib/habitVocabulary";

const TIME_ICONS = { morning: Sun, afternoon: Sunset, evening: Moon } as const;

const ALL = "all";

/** Finished means checked or skipped: those sink to the bottom when the page loads. */
function isFinished(row: HabitRowView) {
  return row.doneToday || row.skippedToday;
}

/** "3 of 7 done" over rows that are still in play: a skipped row is neither done nor owed. */
function countLabel(rows: HabitRowView[]) {
  const owed = rows.filter((row) => !row.skippedToday);
  return `${owed.filter((row) => row.doneToday).length} of ${owed.length} done`;
}

export function HabitTodayList({
  rows,
  todayLabel,
  canManage,
}: {
  rows: HabitRowView[];
  /** "Thursday, Nov 5", made on the server so the browser agrees with it. */
  todayLabel: string;
  /** False on a shared device: it can tick things off but not add or edit. */
  canManage: boolean;
}) {
  // A copy of the rows that is updated the instant a button is tapped, then
  // replaced by the server's real answer (the same idea as ThisWeekList).
  const [live, applyOptimistic] = useOptimistic<HabitRowView[], HabitChange>(rows, applyHabitChange);
  const [, startTransition] = useTransition();
  const [filter, setFilter] = useState(ALL);
  const [error, setError] = useState<string | null>(null);
  // Done rows move to the bottom once, when the page loads. A tap must not
  // make a row jump away from under the finger, so the order is fixed here
  // and later rows (none expected) simply go last.
  const [order] = useState(() => [...rows].sort((a, b) => Number(isFinished(a)) - Number(isFinished(b))).map((row) => row.id));
  const rank = (row: HabitRowView) => {
    const at = order.indexOf(row.id);
    return at === -1 ? order.length : at;
  };
  const ordered = [...live].sort((a, b) => rank(a) - rank(b));

  function run(change: HabitChange, action: () => Promise<HabitActionResult>) {
    setError(null);
    startTransition(async () => {
      applyOptimistic(change);
      try {
        const result = await action();
        if (result.error) setError(result.error);
      } catch {
        // The call never reached the server (network down): say so here instead of the error page.
        setError("Couldn't save that. Check your connection and try again.");
      }
    });
  }

  // Which chips to offer: only the times of day and life areas that rows actually use.
  const options: HabitFilterOption[] = [{ key: ALL, label: "All" }];
  for (const time of TIMES_OF_DAY) {
    if (live.some((row) => row.timeOfDay === time)) {
      options.push({ key: `time:${time}`, label: TIME_OF_DAY_LABELS[time], icon: TIME_ICONS[time] });
    }
  }
  const areas = new Set<string>();
  for (const row of live) {
    const area = toLifeArea(row.lifeArea);
    if (area) areas.add(area);
  }
  for (const area of areas) options.push({ key: `area:${area}`, label: lifeAreaInfo(toLifeArea(area)!).short });
  // If the chosen chip's last row went away (the server refreshed), show everything again.
  const active = options.some((option) => option.key === filter) ? filter : ALL;

  const shown = ordered.filter((row) => {
    if (active === ALL) return true;
    return active.startsWith("time:") ? `time:${row.timeOfDay}` === active : `area:${row.lifeArea}` === active;
  });
  const sections = [
    { key: "habit", title: "Habits", rows: shown.filter((row) => row.kind === "habit") },
    { key: "chore", title: "Chores", rows: shown.filter((row) => row.kind === "chore") },
  ].filter((section) => section.rows.length > 0);

  // A carried row's tap is for the missed day, not today.
  const dayOf = (row: HabitRowView) => (row.carriedFrom ? formatCalendarDate(row.carriedFrom) : undefined);

  return (
    <div>
      <p className="mb-3 text-sm text-muted">
        {todayLabel}
        {live.length > 0 && ` · ${countLabel(live)}`}
      </p>

      {live.length > 0 && options.length > 1 && <HabitFilterChips options={options} value={active} onChange={setFilter} />}

      {error && (
        <p role="alert" className="mb-3 text-sm text-warn">
          {error}
        </p>
      )}

      {live.length === 0 ? (
        <div>
          <EmptyState
            emoji="🌱"
            title="Nothing to do today"
            hint={canManage ? "Add a habit or a chore to see it here" : "Nothing is due right now"}
          />
          {canManage && (
            <Link
              href="/habits/new"
              className="mt-3 flex min-h-12 items-center justify-center rounded-full bg-accent px-5 text-base font-semibold text-accent-fg"
            >
              Add a habit or chore
            </Link>
          )}
        </div>
      ) : shown.length === 0 ? (
        <p className="text-sm text-muted">Nothing here today.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {sections.map((section) => (
            <section key={section.key}>
              <div className="mb-1.5 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{section.title}</h2>
                <span className="text-sm text-muted">{countLabel(section.rows)}</span>
              </div>
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                {section.rows.map((row) => (
                  <li key={row.id}>
                    <HabitRow
                      row={row}
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
            </section>
          ))}
        </div>
      )}

      {live.length > 0 && <p className="mt-4 text-center text-sm text-muted">Swipe a row left to skip it for today.</p>}
    </div>
  );
}
