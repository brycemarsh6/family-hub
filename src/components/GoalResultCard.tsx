"use client";

import { CheckInHistory } from "./CheckInHistory";
import { ProgressBar } from "./ProgressBar";
import { HOUSEHOLD_TIME_ZONE } from "@/lib/constants";
import type { GoalView } from "@/lib/goals";
import { formatMeasure, PACE_LABELS } from "@/lib/goalsProgress";
import { calendarDateInZone, formatShortCalendarDate } from "@/lib/householdDate";

/**
 * "The result" card at the top of a goal: the number it is heading for, how
 * far it has come, the pace and the check-in history, or "No number to track".
 * It holds no state; the goal page owns the check-in sheet and the deletes.
 */
export function GoalResultCard({
  goal,
  onCheckIn,
  onDeleteCheckIn,
}: {
  goal: GoalView;
  onCheckIn: () => void;
  onDeleteCheckIn: (checkInId: string) => void;
}) {
  const completed = goal.completedAt !== null;
  const { measureUnit: unit, startValue: start, targetValue: target, currentValue: current } = goal;
  const measured = unit !== null && start !== null && target !== null && current !== null;
  const lastCheckIn = goal.checkedInAt
    ? `Last check-in ${formatShortCalendarDate(calendarDateInZone(goal.checkedInAt, HOUSEHOLD_TIME_ZONE))}`
    : "No check-in yet";

  return (
    <>
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">The result</h2>
      <div className="rounded-2xl border border-line bg-surface p-4">
        {measured ? (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <p className="text-lg font-bold">{formatMeasure(target, unit)}</p>
                {completed && <DonePill />}
              </div>
              <p className="shrink-0 text-sm text-muted">started {formatMeasure(start, unit)}</p>
            </div>
            <div className="mt-3">
              <ProgressBar fraction={goal.progress} label={`${goal.title} progress`} />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-sm text-muted">{lastCheckIn}</p>
              {goal.canEdit && (
                <button
                  type="button"
                  onClick={onCheckIn}
                  className="min-h-11 shrink-0 rounded-xl border border-line px-4 font-medium active:bg-surface-2"
                >
                  Check in
                </button>
              )}
            </div>
            <p className="mt-2 text-sm text-muted">
              Now {formatMeasure(current, unit)}
              {goal.pace !== null && (
                <>
                  {" · "}
                  <span className={goal.pace === "behind" ? "font-semibold text-warn" : ""}>
                    {PACE_LABELS[goal.pace]}
                  </span>
                </>
              )}
            </p>
            <CheckInHistory checkIns={goal.checkIns} unit={unit} canEdit={goal.canEdit} onDelete={onDeleteCheckIn} />
          </>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted">No number to track</p>
            {completed && <DonePill />}
          </div>
        )}
      </div>
    </>
  );
}

function DonePill() {
  return (
    <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
      Done
    </span>
  );
}
