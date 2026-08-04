"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { WeekCard } from "./WeekCard";
import { formatWeekRange } from "@/lib/mealPlanDates";
import type { MealSlot } from "@/lib/constants";
import type { MealPlanView } from "@/lib/types";

/** Past weeks as collapsed headers, newest first — expanding to the same
 * editable WeekCard as the current/future weeks. History stays editable on
 * purpose: this is a family log ("what did we actually eat"), not an audit
 * trail, and "we ate something different than planned" is a normal, real
 * correction to make after the fact. */
export function PastMealWeeks({
  plans,
  today,
  onSlotTap,
  onDeletePlan,
}: {
  /** Already sorted newest first. */
  plans: MealPlanView[];
  today: Date;
  onSlotTap: (
    plan: MealPlanView,
    dayOffset: number,
    slot: MealSlot,
    currentTitle: string,
  ) => void;
  onDeletePlan: (mealPlanId: string) => void;
}) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setOpenIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section>
      <h2 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-muted">
        Past weeks
      </h2>
      <div className="flex flex-col gap-2">
        {plans.map((plan) => {
          const open = openIds.has(plan.id);
          return (
            <div key={plan.id}>
              <button
                type="button"
                onClick={() => toggle(plan.id)}
                aria-expanded={open}
                className="flex min-h-12 w-full items-center gap-2 rounded-xl px-1 text-left text-sm font-semibold text-muted transition-colors active:bg-surface-2"
              >
                <ChevronRight
                  aria-hidden="true"
                  size={16}
                  className={`shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
                />
                Week of {formatWeekRange(plan.weekStart)}
              </button>
              {open && (
                <div className="mt-2">
                  <WeekCard
                    plan={plan}
                    today={today}
                    onSlotTap={(dayOffset, slot, currentTitle) =>
                      onSlotTap(plan, dayOffset, slot, currentTitle)
                    }
                    onDeletePlan={() => onDeletePlan(plan.id)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
