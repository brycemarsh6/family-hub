"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { SwipeActions } from "./SwipeActions";
import { HOUSEHOLD_TIME_ZONE } from "@/lib/constants";
import { formatMeasure } from "@/lib/goalsProgress";
import { calendarDateInZone, formatShortCalendarDate } from "@/lib/householdDate";

const COLLAPSED_COUNT = 3;

/**
 * Every check-in on a goal's number, newest first: three at first, the rest
 * behind "Show all". Swipe a row right to left to delete it (no confirmation,
 * like the rest of the app); only people who can edit the goal get the swipe.
 */
export function CheckInHistory({
  checkIns,
  unit,
  canEdit,
  onDelete,
}: {
  checkIns: { id: string; value: number; at: Date }[];
  unit: string;
  canEdit: boolean;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (checkIns.length === 0) return null;

  const shown = expanded ? checkIns : checkIns.slice(0, COLLAPSED_COUNT);
  return (
    <div className="mt-4 border-t border-line pt-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">History</h3>
      <ul className="mt-1 divide-y divide-line">
        {shown.map((checkIn) => {
          const date = formatShortCalendarDate(calendarDateInZone(checkIn.at, HOUSEHOLD_TIME_ZONE));
          const value = formatMeasure(checkIn.value, unit);
          const row = (
            <div className="flex min-h-12 items-center justify-between gap-3 bg-surface">
              <span className="text-sm text-muted">{date}</span>
              <span className="text-sm font-medium tabular-nums">{value}</span>
            </div>
          );
          return (
            <li key={checkIn.id}>
              {canEdit ? (
                <SwipeActions
                  actions={[
                    {
                      label: "Delete",
                      accessibleLabel: `Delete ${value} check-in from ${date}`,
                      icon: <Trash2 aria-hidden="true" size={18} />,
                      onAction: () => onDelete(checkIn.id),
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
      {!expanded && checkIns.length > COLLAPSED_COUNT && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-1 min-h-11 text-sm font-medium text-accent active:opacity-70"
        >
          Show all {checkIns.length}
        </button>
      )}
    </div>
  );
}
