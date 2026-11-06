"use client";

import { useState } from "react";
import { Plane, Trash2 } from "lucide-react";
import { deleteVacation, saveVacation } from "@/app/actions/vacations";
import type { VacationItem } from "@/lib/choreChart";
import { formatShortCalendarDate, parseDateParam } from "@/lib/householdDate";
import { useOptimisticRun } from "@/lib/useOptimisticRun";

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
 * "Turn on vacation mode" ("Add a vacation" when one is now or coming up,
 * decision 128), then the person's vacations (current, upcoming, past) each
 * with a one-tap Delete. Neither write is optimistic: a save can be refused
 * (Through before From, overlap) and a delete changes every streak, so both
 * wait for the server, share one pending flag and disable the buttons while it
 * works. Accounts only.
 */
export function VacationCard({ vacations, today }: { vacations: VacationItem[]; today: string }) {
  const { run, error, pending } = useOptimisticRun<string>(() => {});
  const [from, setFrom] = useState("");
  const [through, setThrough] = useState("");
  const thisYear = parseDateParam(today)?.year ?? new Date().getFullYear();

  const hasOneAhead = vacations.some((item) => item.status !== "past");

  function turnOn() {
    run(null, () => saveVacation(from, through), () => {
      setFrom("");
      setThrough("");
    });
  }

  function remove(id: string) {
    run(null, () => deleteVacation(id));
  }

  return (
    <section aria-label="Vacation mode" className="mt-4 rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <Plane aria-hidden="true" size={22} />
        </span>
        <div className="flex flex-col gap-0.5">
          <h3 className="text-base font-semibold">Vacation mode</h3>
          <p className="text-sm text-muted">Anything you don&apos;t do counts as skipped. Streaks are safe and chores are excused.</p>
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
        disabled={pending}
        className="mt-3 inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-5 text-base font-semibold text-accent-fg disabled:opacity-40"
      >
        {hasOneAhead ? "Add a vacation" : "Turn on vacation mode"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-warn">
          {error}
        </p>
      )}

      {vacations.length > 0 && (
        <ul className="mt-3 divide-y divide-line">
          {vacations.map((item) => (
            <li key={item.id} className="flex min-h-14 items-center gap-3">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className={`whitespace-nowrap text-base font-semibold ${item.status === "past" ? "text-muted" : ""}`}>{rangeLabel(item, thisYear)}</span>
                <span className="text-sm text-muted">{STATUS_LABELS[item.status]}</span>
              </div>
              <button
                type="button"
                onClick={() => remove(item.id)}
                disabled={pending}
                aria-label={`Delete vacation ${rangeLabel(item, thisYear)}`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted active:bg-surface-2 disabled:opacity-40"
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
