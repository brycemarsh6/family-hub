"use client";

// The wide version of WeekCard: one week as a table, a column per day and a
// row per meal slot. It exists only from 1024px of list width (decision 218
// and 248): seven columns plus a label column need about that much room for a
// meal title to wrap to two lines, and below it WeekCard's stacked days read
// better. MealPlanList measures its own width and decides which one to draw;
// slot taps call the same handler WeekCard's do.

import { BookOpen, Trash2 } from "lucide-react";
import { MEAL_SLOTS, type MealSlot } from "@/lib/constants";
import {
  addDays,
  formatShortDayHeader,
  formatWeekRange,
  isSameDay,
} from "@/lib/mealPlanDates";
import type { MealPlanView } from "@/lib/types";

export function WeekGrid({
  plan,
  today,
  onSlotTap,
  onDeletePlan,
}: {
  plan: MealPlanView;
  today: Date;
  onSlotTap: (
    dayOffset: number,
    slot: MealSlot,
    currentTitle: string,
    currentRecipeId: string | null,
  ) => void;
  /** Omitted entirely (not disabled) for a kid session, same as WeekCard. */
  onDeletePlan?: () => void;
}) {
  const dates = Array.from({ length: 7 }, (_, dayOffset) => addDays(plan.weekStart, dayOffset));

  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-base font-semibold">{formatWeekRange(plan.weekStart)}</h3>
        {onDeletePlan && (
          <button
            type="button"
            onClick={onDeletePlan}
            aria-label={`Delete the week of ${formatWeekRange(plan.weekStart)}`}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-danger"
          >
            <Trash2 aria-hidden="true" size={16} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-[5.5rem_repeat(7,minmax(0,1fr))] gap-1.5">
        <div aria-hidden="true" />
        {dates.map((date, dayOffset) => (
          <p
            key={dayOffset}
            className={`rounded-lg py-1.5 text-center text-sm font-semibold ${
              isSameDay(date, today) ? "bg-accent-soft text-accent" : "text-muted"
            }`}
          >
            {formatShortDayHeader(date)}
          </p>
        ))}

        {MEAL_SLOTS.map((slot) => (
          <WeekGridRow
            key={slot}
            plan={plan}
            slot={slot}
            dates={dates}
            today={today}
            onSlotTap={onSlotTap}
          />
        ))}
      </div>
    </div>
  );
}

// A fragment, not a wrapper element, so its label and seven cells stay direct
// children of the grid above.
function WeekGridRow({
  plan,
  slot,
  dates,
  today,
  onSlotTap,
}: {
  plan: MealPlanView;
  slot: MealSlot;
  dates: Date[];
  today: Date;
  onSlotTap: (
    dayOffset: number,
    slot: MealSlot,
    currentTitle: string,
    currentRecipeId: string | null,
  ) => void;
}) {
  return (
    <>
      <span className="flex items-center text-xs font-medium uppercase tracking-wide text-muted">
        {slot}
      </span>
      {dates.map((date, dayOffset) => {
        const entry = plan.entries.find((e) => e.dayOffset === dayOffset && e.slot === slot);
        const isToday = isSameDay(date, today);
        const tone = entry
          ? `border-line ${isToday ? "bg-accent-soft" : "bg-surface-2"}`
          : `border-dashed border-line ${isToday ? "bg-accent-soft" : "bg-transparent"}`;
        return (
          <button
            key={dayOffset}
            type="button"
            aria-label={`${formatShortDayHeader(date)}, ${slot}: ${entry ? entry.title : "Add"}`}
            onClick={() => onSlotTap(dayOffset, slot, entry?.title ?? "", entry?.recipeId ?? null)}
            className={`min-h-16 rounded-xl border p-2 text-left transition-colors active:bg-line ${tone}`}
          >
            {entry ? (
              <span className="flex items-start gap-1.5 text-sm font-medium text-fg">
                {entry.recipeId && (
                  <BookOpen aria-hidden="true" size={13} className="mt-0.5 shrink-0 text-accent" />
                )}
                <span className="line-clamp-2 min-w-0">{entry.title}</span>
              </span>
            ) : (
              <span className={`text-sm ${isToday ? "text-muted-strong" : "text-muted"}`}>Add</span>
            )}
          </button>
        );
      })}
    </>
  );
}
