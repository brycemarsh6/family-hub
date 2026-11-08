"use client";

import { MEAL_SLOTS } from "@/lib/constants";
import { formatWeekRange } from "@/lib/mealPlanDates";
import type { MealPlanView } from "@/lib/types";

const MEALS_PER_WEEK = 7 * MEAL_SLOTS.length;

/** A future week as a compact card on the wide Meal Plan (decision 268): the
 * range and how full it is. Tapping it opens the week as a WeekGrid. */
export function WeekSummaryCard({
  plan,
  open,
  onToggle,
}: {
  plan: MealPlanView;
  open: boolean;
  onToggle: () => void;
}) {
  const planned = plan.entries.filter((e) => e.title.trim() !== "").length;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={`min-h-[4.5rem] rounded-xl border bg-surface p-3 text-left active:bg-surface-2 ${
        open ? "border-accent" : "border-line"
      }`}
    >
      <p className="text-base font-semibold">{formatWeekRange(plan.weekStart)}</p>
      <p className="text-sm text-muted">
        {planned === 0 ? "Nothing planned yet" : `${planned} of ${MEALS_PER_WEEK} meals planned`}
      </p>
    </button>
  );
}
