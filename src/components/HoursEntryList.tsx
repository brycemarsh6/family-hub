"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { SwipeActions } from "./SwipeActions";
import { removeHabitTime } from "@/app/actions/habitHours";
import type { HoursEntryView } from "@/lib/habitsHours";
import { formatShortCalendarDate, parseDateParam } from "@/lib/householdDate";
import { useOptimisticRun } from "@/lib/useOptimisticRun";

/** "2026-11-05" as "Nov 5". */
function shortDay(iso: string): string {
  const date = parseDateParam(iso);
  return date ? formatShortCalendarDate(date) : "";
}

const GROUP_TITLE = "text-xs font-semibold uppercase tracking-wide text-muted";

/**
 * The time logged this week and last week, newest first ("Thu · 1½ hours";
 * decision 192). Swipe a row right to left to Delete it: no confirmation, no
 * undo toast, like `CheckInHistory`. It is not optimistic: the row waits for
 * the server, then the page reloads its numbers (a failed delete says why
 * under the list). Only an entry the viewer may remove gets the swipe.
 */
export function HoursEntryList({ thisWeek, lastWeek }: { thisWeek: HoursEntryView[]; lastWeek: HoursEntryView[] }) {
  const router = useRouter();
  const { run, error } = useOptimisticRun<never>(() => {});

  function remove(entryId: string) {
    run(null, () => removeHabitTime(entryId), () => router.refresh());
  }

  function group(title: string, entries: HoursEntryView[], empty: string) {
    return (
      <div className="flex flex-col">
        <h3 className={GROUP_TITLE}>{title}</h3>
        {entries.length === 0 ? (
          <p className="py-2 text-sm text-muted">{empty}</p>
        ) : (
          <ul className="mt-1 divide-y divide-line">
            {entries.map((entry) => {
              const row = (
                <div className="flex min-h-12 items-center justify-between gap-3 bg-surface">
                  <span className="text-sm font-medium">{entry.label}</span>
                  <span className="text-sm text-muted">{shortDay(entry.day)}</span>
                </div>
              );
              return (
                <li key={entry.id}>
                  {entry.canDelete ? (
                    <SwipeActions
                      actions={[
                        {
                          label: "Delete",
                          accessibleLabel: `Delete ${entry.label}`,
                          icon: <Trash2 aria-hidden="true" size={18} />,
                          onAction: () => remove(entry.id),
                          tone: "danger",
                        },
                      ]}
                    >
                      {row}
                    </SwipeActions>
                  ) : (
                    row
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3.5">
      {group("This week", thisWeek, "Nothing logged yet.")}
      {group("Last week", lastWeek, "Nothing logged.")}
      {(thisWeek.some((e) => e.canDelete) || lastWeek.some((e) => e.canDelete)) && <p className="text-sm text-muted">Swipe a row left to delete it.</p>}
      {error && (
        <p role="alert" className="text-sm text-warn">
          {error}
        </p>
      )}
    </div>
  );
}
