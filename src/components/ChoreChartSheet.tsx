"use client";

import { useEffect } from "react";
import { RotateCcw, SkipForward } from "lucide-react";
import type { ChartWeekChore } from "@/lib/choreChart";
import { CHORE_CHART_LABELS } from "@/lib/habitVocabulary";
import { SHORT_DAY_NAMES } from "@/lib/mealPlanDates";

const ROW = "flex min-h-12 items-center gap-3 rounded-xl px-3 text-left text-base font-medium text-fg transition-colors active:bg-surface-2";

/**
 * The bottom sheet for a chore on the chart's This week (decision 117): its
 * name (and who label when shared), "Move to" day chips, "Skip this week" and,
 * when a change exists, "Back to the default". The same frame as `RadioSheet`.
 * `column` is the weekday of the card that was tapped; a moved chore is not
 * offered its own column again.
 */
export function ChoreChartSheet({
  chore,
  column,
  onMove,
  onSkip,
  onClear,
  onClose,
}: {
  chore: ChartWeekChore;
  column: number;
  onMove: (toWeekday: number) => void;
  onSkip: () => void;
  onClear: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const targets = chore.moveTargets.filter((weekday) => weekday !== column);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/40" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={chore.title}
        className="relative flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{chore.title}</h2>
            {chore.who && <p className="text-sm text-muted">{chore.who}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xl text-muted transition-colors hover:bg-surface-2"
          >
            ×
          </button>
        </div>

        {targets.length > 0 && (
          <div role="group" aria-label={CHORE_CHART_LABELS.moveTo} className="mb-2">
            <p className="mb-1.5 text-sm font-semibold text-muted">{CHORE_CHART_LABELS.moveTo}</p>
            <div className="flex flex-wrap gap-2">
              {targets.map((weekday) => (
                <button
                  key={weekday}
                  type="button"
                  onClick={() => onMove(weekday)}
                  className="flex min-h-11 items-center rounded-full border border-line bg-surface px-4 text-sm font-medium text-fg active:bg-surface-2"
                >
                  {SHORT_DAY_NAMES[weekday]}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1">
          {chore.state !== "skipped" && (
            <button type="button" onClick={onSkip} className={ROW}>
              <SkipForward aria-hidden="true" size={18} className="text-muted" />
              {CHORE_CHART_LABELS.skipThisWeek}
            </button>
          )}
          {chore.changed && (
            <button type="button" onClick={onClear} className={ROW}>
              <RotateCcw aria-hidden="true" size={18} className="text-muted" />
              {CHORE_CHART_LABELS.backToDefault}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
