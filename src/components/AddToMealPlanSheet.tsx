"use client";

import { useEffect, useState, useTransition } from "react";
import { ChevronLeft } from "lucide-react";
import { MEAL_SLOTS, type MealSlot } from "@/lib/constants";
import {
  addDays,
  formatDayLabel,
  formatWeekRange,
  isSameDay,
  sundayOf,
} from "@/lib/mealPlanDates";
import { createMealPlan, setMealPlanEntry } from "@/app/actions/mealPlans";

const WEEKS_AHEAD = 5;

export type PlannedWeek = { id: string; weekStart: Date };

/**
 * Put this recipe on the meal plan: pick a week, then a day, then a slot.
 *
 * Every date here is computed from `new Date()` inside this component, which
 * only ever renders after a tap — never during SSR. That's the same reasoning
 * CreatePlanSheet documents: Vercel runs UTC and this household runs Mountain,
 * so a calendar day decided on the server is wrong for several hours every
 * evening. See src/lib/mealPlanDates.ts.
 *
 * Writes through setMealPlanEntry — the same upsert the Meal Plan branch's own
 * slot sheet uses, denormalized title and all — rather than adding a second way
 * to fill a slot. A week with no plan yet gets one via createMealPlan first,
 * which returns the id so this can fill the slot in the same interaction.
 */
export function AddToMealPlanSheet({
  recipeId,
  recipeTitle,
  plannedWeeks,
  onClose,
}: {
  recipeId: string;
  recipeTitle: string;
  /** Weeks that already have a plan, so an existing one is reused instead of
   * colliding on MealPlan.weekStart. */
  plannedWeeks: PlannedWeek[];
  onClose: () => void;
}) {
  const [step, setStep] = useState<"week" | "day" | "slot">("week");
  const [weekStart, setWeekStart] = useState<Date | null>(null);
  const [dayOffset, setDayOffset] = useState<number | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (step === "day") setStep("week");
      else if (step === "slot") setStep("day");
      else onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, step]);

  const thisWeek = sundayOf(new Date());
  const weeks = Array.from({ length: WEEKS_AHEAD }, (_, i) =>
    addDays(thisWeek, i * 7),
  );

  function handlePickSlot(slot: MealSlot) {
    if (!weekStart || dayOffset === null) return;
    setError(null);

    startTransition(async () => {
      const existing = plannedWeeks.find((week) =>
        isSameDay(week.weekStart, weekStart),
      );

      let mealPlanId = existing?.id;
      if (!mealPlanId) {
        const created = await createMealPlan(weekStart);
        if (created.error || !created.mealPlanId) {
          setError(created.error ?? "Couldn't create that week's plan.");
          return;
        }
        mealPlanId = created.mealPlanId;
      }

      const result = await setMealPlanEntry({
        mealPlanId,
        dayOffset,
        slot,
        title: recipeTitle,
        recipeId,
      });
      if (result.error) {
        setError(result.error);
        return;
      }

      setSaved(`${slot}, ${formatDayLabel(addDays(weekStart, dayOffset))}`);
    });
  }

  const heading =
    step === "week"
      ? "Pick a week"
      : step === "day"
        ? "Pick a day"
        : "Pick a meal";

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
        aria-label="Add to meal plan"
        className="relative flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-2 flex items-center justify-between">
          {step !== "week" && !saved ? (
            <button
              type="button"
              onClick={() => setStep(step === "slot" ? "day" : "week")}
              className="-ml-1 flex min-h-11 items-center gap-1 text-lg font-semibold"
            >
              <ChevronLeft aria-hidden="true" size={20} />
              {heading}
            </button>
          ) : (
            <h2 className="text-lg font-semibold">
              {saved ? "Added to the plan" : heading}
            </h2>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-xl text-muted transition-colors hover:bg-surface-2"
          >
            ×
          </button>
        </div>

        {saved ? (
          <div className="flex flex-col gap-4">
            <p className="rounded-xl bg-accent-soft px-4 py-3 text-base font-medium text-accent">
              {recipeTitle} → {saved}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {error && (
              <p
                role="alert"
                className="mb-3 rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn"
              >
                {error}
              </p>
            )}

            {step === "week" && (
              <div className="flex flex-col gap-2">
                {weeks.map((week, index) => {
                  const planned = plannedWeeks.some((existing) =>
                    isSameDay(existing.weekStart, week),
                  );
                  return (
                    <button
                      key={week.getTime()}
                      type="button"
                      onClick={() => {
                        setWeekStart(week);
                        setStep("day");
                      }}
                      className="flex min-h-14 items-center justify-between rounded-xl border border-line bg-surface px-4 text-left transition-colors active:bg-surface-2"
                    >
                      <span className="text-base font-medium">
                        {index === 0 ? "This week" : formatWeekRange(week)}
                        {index === 0 && (
                          <span className="block text-xs font-normal text-muted">
                            {formatWeekRange(week)}
                          </span>
                        )}
                      </span>
                      {planned && (
                        <span className="shrink-0 text-xs text-muted">Planned</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {step === "day" && weekStart && (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 7 }, (_, offset) => (
                  <button
                    key={offset}
                    type="button"
                    onClick={() => {
                      setDayOffset(offset);
                      setStep("slot");
                    }}
                    className="flex min-h-14 items-center rounded-xl border border-line bg-surface px-4 text-left text-base font-medium transition-colors active:bg-surface-2"
                  >
                    {formatDayLabel(addDays(weekStart, offset))}
                  </button>
                ))}
              </div>
            )}

            {step === "slot" && (
              <div className="grid grid-cols-2 gap-2">
                {MEAL_SLOTS.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => handlePickSlot(slot)}
                    disabled={pending}
                    className="min-h-14 rounded-xl border border-line bg-surface-2 px-2 text-sm font-semibold text-fg transition-colors active:bg-line disabled:opacity-50"
                  >
                    {pending ? "Saving…" : slot}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
