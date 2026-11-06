"use client";

import { Check } from "lucide-react";
import { HoursLeftLine, HoursLogButton } from "./HoursHabitRow";
import { LogButton } from "./LogButton";
import { ProgressBar } from "./ProgressBar";
import { SwipeActions, type SwipeAction } from "./SwipeActions";
import type { PlanItemView } from "@/lib/goals";
import { HOURS_PHRASES } from "@/lib/habitHoursVocabulary";
import { goalHoursLine } from "@/lib/habitsHours";

/**
 * One plan item as a row: a habit gets a round log button (checked once
 * today has its check) and a "2 of 4" count, a step a square check box, a reminder plain text. It holds no state;
 * the list around it owns the optimistic counts. Swipe actions wrap the row
 * only when the caller passes some. An hours habit (`item.hours`) shows its bar
 * and "Calling · 6½ of 10 hours this week" and a + that opens the log sheet
 * (`onLogTime`), never the round check (decision 198). When no one's week can be shown (`hours.forUserId` null) it is the title alone.
 */
export function PlanItemRow({
  item,
  canLog,
  onLog,
  onUndo,
  onStepToggle,
  onLogTime,
  actions,
}: {
  item: PlanItemView;
  /** False for a goal this viewer may look at but not log (someone else's, or a shared device). */
  canLog: boolean;
  onLog: () => void;
  onUndo: () => void;
  onStepToggle: () => void;
  /** Opens the log sheet for an hours habit; left off where time can't be logged. */
  onLogTime?: () => void;
  actions?: SwipeAction[];
}) {
  const row = (
    <div className="flex min-h-14 items-center justify-between gap-3 px-3">
      {item.kind === "habit" && item.hours && item.hours.forUserId === null && (
        <div className="min-w-0 py-2">
          <p className="text-base font-medium">{item.title}</p>
          <p className="text-sm text-muted">{HOURS_PHRASES.hoursHabit}</p>
        </div>
      )}
      {item.kind === "habit" && item.hours && item.hours.forUserId !== null && (
        <>
          <div className="flex min-w-0 flex-1 flex-col gap-1 py-2">
            <p className="text-base font-medium">{goalHoursLine(item.title, item.hours)}</p>
            <ProgressBar fraction={item.hours.fraction} label={`${item.title}: ${item.hours.doneText}`} />
            <HoursLeftLine hours={item.hours} />
          </div>
          {canLog && onLogTime && <HoursLogButton hours={item.hours} title={item.title} onClick={onLogTime} />}
        </>
      )}
      {item.kind === "habit" && !item.hours && (
        <>
          <div className="min-w-0">
            <p className="text-base font-medium">{item.title}</p>
            {item.done ? (
              <p className="text-sm font-semibold text-accent">Done</p>
            ) : (
              <p className="text-sm text-muted">
                {item.count} of {item.target}
                {item.windowLabel === "this month" && " this month"}
              </p>
            )}
          </div>
          <LogButton
            done={item.doneToday}
            label={item.title}
            disabled={!canLog}
            onClick={item.doneToday ? onUndo : onLog}
          />
        </>
      )}
      {item.kind === "step" && (
        <>
          <p className={`min-w-0 text-base font-medium ${item.done ? "text-muted line-through" : ""}`}>
            {item.title}
          </p>
          <button
            type="button"
            onClick={onStepToggle}
            disabled={!canLog}
            aria-pressed={item.done}
            aria-label={`Check off ${item.title}`}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 transition-colors disabled:opacity-40 ${
              item.done ? "border-accent bg-accent text-accent-fg" : "border-muted"
            }`}
          >
            {item.done && <Check aria-hidden="true" size={22} />}
          </button>
        </>
      )}
      {item.kind === "reminder" && <p className="min-w-0 text-sm text-muted">{item.title}</p>}
    </div>
  );

  return actions && actions.length > 0 ? <SwipeActions actions={actions}>{row}</SwipeActions> : row;
}
