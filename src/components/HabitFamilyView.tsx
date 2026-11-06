"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { User, Users } from "lucide-react";
import { FamilyHabitRow, HabitFamilyColumn } from "./HabitFamilyColumn";
import { checkHabit, uncheckHabit } from "@/app/actions/habitChecks";
import type { HabitActionResult } from "@/app/actions/habits";
import { applyHabitChange, type HabitChange } from "@/lib/habitChanges";
import type { FamilyPage, FamilyRow } from "@/lib/habitsFamily";
import { formatCalendarDate } from "@/lib/householdDate";

/**
 * The "Mine" / "Whole family" switch (decision 95) above both views. The choice
 * is the URL (`/habits` or `/habits?view=family`), so a refresh or a shared link
 * lands on the same view. Same pill look as `HabitFilterChips`, but links.
 */
export function HabitViewChips({ view }: { view: "mine" | "family" }) {
  const chips = [
    { key: "mine", label: "Mine", href: "/habits", icon: User },
    { key: "family", label: "Whole family", href: "/habits?view=family", icon: Users },
  ] as const;
  return (
    <div role="group" aria-label="Whose habits" className="mb-4 flex gap-2">
      {chips.map(({ key, label, href, icon: Icon }) => (
        <Link
          key={key}
          href={href}
          replace
          scroll={false}
          aria-current={view === key ? "page" : undefined}
          className={`flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors ${
            view === key ? "border-accent bg-accent text-accent-fg" : "border-line bg-surface text-muted"
          }`}
        >
          <Icon aria-hidden="true" size={16} />
          {label}
        </Link>
      ))}
    </div>
  );
}

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
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
                <FamilyHabitRow row={row} showStreaks={showStreaks} onToggle={() => toggle(row)} />
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
            <HabitFamilyColumn key={column.id} column={column} showStreaks={showStreaks} onToggle={toggle} />
          ))}
        </div>
      )}
    </div>
  );
}
