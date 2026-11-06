"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Plane, Trash2 } from "lucide-react";
import { deleteVacation, saveVacation } from "@/app/actions/vacations";
import type { VacationItem } from "@/lib/choreChart";
import { formatShortCalendarDate, parseDateParam } from "@/lib/householdDate";

const INPUT_CLASS = "min-h-12 rounded-xl border border-line bg-surface px-3 text-base text-fg";

/** "Nov 20 to Nov 27", with the year only when a day is not in this year. */
function rangeLabel(item: VacationItem, thisYear: number): string {
  const label = (text: string) => {
    const day = parseDateParam(text);
    if (!day) return text;
    return day.year === thisYear ? formatShortCalendarDate(day) : `${formatShortCalendarDate(day)}, ${day.year}`;
  };
  return `${label(item.from)} to ${label(item.through)}`;
}

const STATUS_LABELS = { current: "Now", upcoming: "Coming up", past: "Past" } as const;

/**
 * The Vacation mode card on /settings (decision 123): two date inputs and
 * "Turn on vacation mode", then the person's vacations (current, upcoming,
 * past) each with a one-tap Delete. A delete leaves the list at once and
 * comes back with a line if the save fails; a save waits for the server,
 * because it can be refused (Through before From, overlap). Accounts only.
 */
export function VacationCard({ vacations, today }: { vacations: VacationItem[]; today: string }) {
  const [live, removeOne] = useOptimistic<VacationItem[], string>(vacations, (list, id) => list.filter((item) => item.id !== id));
  const [saving, startSave] = useTransition();
  const [, startDelete] = useTransition();
  const [from, setFrom] = useState("");
  const [through, setThrough] = useState("");
  const [error, setError] = useState<string | null>(null);
  const thisYear = parseDateParam(today)?.year ?? new Date().getFullYear();

  function turnOn() {
    setError(null);
    startSave(async () => {
      try {
        const result = await saveVacation(from, through);
        if (result.error) setError(result.error);
        else {
          setFrom("");
          setThrough("");
        }
      } catch {
        setError("Couldn't save that. Check your connection and try again.");
      }
    });
  }

  function remove(id: string) {
    setError(null);
    startDelete(async () => {
      removeOne(id);
      try {
        const result = await deleteVacation(id);
        if (result.error) setError(result.error);
      } catch {
        setError("Couldn't save that. Check your connection and try again.");
      }
    });
  }

  return (
    <section aria-label="Vacation mode" className="mt-4 rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <Plane aria-hidden="true" size={22} />
        </span>
        <div className="flex flex-col gap-0.5">
          <h3 className="text-base font-semibold">Vacation mode</h3>
          <p className="text-sm text-muted">Everything of yours counts as skipped. Streaks are safe and chores are excused.</p>
        </div>
      </div>

      <div className="mt-3 flex gap-2.5">
        <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm text-muted">
          From
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className={INPUT_CLASS} />
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm text-muted">
          Through
          <input type="date" value={through} onChange={(event) => setThrough(event.target.value)} className={INPUT_CLASS} />
        </label>
      </div>
      <button
        type="button"
        onClick={turnOn}
        disabled={saving}
        className="mt-3 inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-5 text-base font-semibold text-accent-fg disabled:opacity-40"
      >
        Turn on vacation mode
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-warn">
          {error}
        </p>
      )}

      {live.length > 0 && (
        <ul className="mt-3 divide-y divide-line">
          {live.map((item) => (
            <li key={item.id} className="flex min-h-14 items-center gap-3">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className={`text-base font-semibold ${item.status === "past" ? "text-muted" : ""}`}>{rangeLabel(item, thisYear)}</span>
                <span className="text-sm text-muted">{STATUS_LABELS[item.status]}</span>
              </div>
              <button
                type="button"
                onClick={() => remove(item.id)}
                aria-label={`Delete vacation ${rangeLabel(item, thisYear)}`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted active:bg-surface-2"
              >
                <Trash2 aria-hidden="true" size={20} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
