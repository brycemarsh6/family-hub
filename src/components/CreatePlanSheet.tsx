"use client";

import { useEffect } from "react";
import { addDays, formatWeekRange, isSameDay, sundayOf } from "@/lib/mealPlanDates";

const WEEKS_AHEAD = 5;

/**
 * The + flow: never a typed date. A short list of upcoming Sundays as big
 * chips, already-planned weeks visible but inert. The weeks themselves are
 * computed from `new Date()` right here, in a component that only ever
 * renders after a tap (never during SSR) — so unlike the page's own "what
 * week is this" logic, there's no server/client clock mismatch to guard
 * against.
 */
export function CreatePlanSheet({
  existingWeekStarts,
  onClose,
  onChoose,
}: {
  existingWeekStarts: Date[];
  onClose: () => void;
  onChoose: (weekStart: Date) => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const thisWeek = sundayOf(new Date());
  const weeks = Array.from({ length: WEEKS_AHEAD }, (_, i) => addDays(thisWeek, i * 7));

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Plan a week"
        className="relative flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Plan a week</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-xl text-muted transition-colors hover:bg-surface-2"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {weeks.map((weekStart, index) => {
            const alreadyPlanned = existingWeekStarts.some((existing) =>
              isSameDay(existing, weekStart),
            );
            return (
              <button
                key={weekStart.getTime()}
                type="button"
                onClick={() => {
                  if (alreadyPlanned) return;
                  onChoose(weekStart);
                }}
                disabled={alreadyPlanned}
                className={`flex min-h-14 items-center justify-between rounded-xl border px-4 text-left transition-colors ${
                  alreadyPlanned
                    ? "border-line bg-surface-2 text-muted opacity-60"
                    : "border-line bg-surface active:bg-surface-2"
                }`}
              >
                <span className="text-base font-medium">
                  {index === 0 ? "This week" : formatWeekRange(weekStart)}
                  {index === 0 && (
                    <span className="block text-xs font-normal text-muted">
                      {formatWeekRange(weekStart)}
                    </span>
                  )}
                </span>
                {alreadyPlanned && (
                  <span className="shrink-0 text-xs font-medium">Already planned</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
