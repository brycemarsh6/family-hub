"use client";

import { Trash2 } from "lucide-react";
import { MEAL_SLOTS, type MealSlot } from "@/lib/constants";
import { addDays, formatDayLabel, formatWeekRange, isSameDay } from "@/lib/mealPlanDates";
import type { MealPlanView } from "@/lib/types";

/** One planned week: a header (range + delete) and seven days, each with
 * its four meal slots. Every slot is its own tap target — filled slots show
 * the meal, empty ones read as a muted "Add". */
export function WeekCard({
  plan,
  today,
  onSlotTap,
  onDeletePlan,
}: {
  plan: MealPlanView;
  today: Date;
  onSlotTap: (dayOffset: number, slot: MealSlot, currentTitle: string) => void;
  onDeletePlan: () => void;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-base font-semibold">{formatWeekRange(plan.weekStart)}</h3>
        <button
          type="button"
          onClick={onDeletePlan}
          aria-label={`Delete the week of ${formatWeekRange(plan.weekStart)}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-danger"
        >
          <Trash2 aria-hidden="true" size={16} />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {Array.from({ length: 7 }, (_, dayOffset) => {
          const date = addDays(plan.weekStart, dayOffset);
          const isToday = isSameDay(date, today);
          return (
            <div key={dayOffset}>
              <p
                className={`mb-1 flex items-center gap-1.5 px-1 text-sm font-semibold ${
                  isToday ? "text-accent" : "text-muted"
                }`}
              >
                {formatDayLabel(date)}
                {isToday && (
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                    Today
                  </span>
                )}
              </p>
              <div className="flex flex-col gap-1.5">
                {MEAL_SLOTS.map((slot) => {
                  const entry = plan.entries.find(
                    (e) => e.dayOffset === dayOffset && e.slot === slot,
                  );
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => onSlotTap(dayOffset, slot, entry?.title ?? "")}
                      className="flex min-h-12 items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 text-left transition-colors active:bg-line"
                    >
                      <span className="w-20 shrink-0 text-xs font-medium uppercase tracking-wide text-muted">
                        {slot}
                      </span>
                      <span
                        className={`min-w-0 flex-1 truncate text-sm ${
                          entry ? "font-medium text-fg" : "text-muted"
                        }`}
                      >
                        {entry ? entry.title : "Add"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
