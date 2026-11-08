"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { WeekCard } from "./WeekCard";
import { WeekGrid } from "./WeekGrid";
import { WeekSummaryCard } from "./WeekSummaryCard";
import { PastMealWeeks } from "./PastMealWeeks";
import { SlotEditSheet } from "./SlotEditSheet";
import { CreatePlanSheet } from "./CreatePlanSheet";
import { EmptyState } from "./EmptyState";
import { useHamburgerRowHeight } from "@/lib/appChrome";
import { useToday } from "@/lib/useToday";
import { useContainerWidth } from "@/lib/useContainerWidth";
import { COLUMN_MIN_WIDTH_PX } from "@/lib/splitColumns";
import { addDays, formatDayLabel, isSameDay, sundayOf } from "@/lib/mealPlanDates";
import type { MealSlot } from "@/lib/constants";
import type { MealPlanView } from "@/lib/types";
import type { RecipeListItem } from "./RecipeList";
import {
  createMealPlan,
  deleteMealPlan,
  setMealPlanEntry,
  clearMealPlanEntry,
} from "@/app/actions/mealPlans";

type Change =
  | { type: "createPlan"; tempId: string; weekStart: Date }
  | { type: "deletePlan"; mealPlanId: string }
  | {
      type: "setEntry";
      mealPlanId: string;
      dayOffset: number;
      slot: MealSlot;
      title: string;
      recipeId: string | null;
    }
  | { type: "clearEntry"; mealPlanId: string; dayOffset: number; slot: MealSlot };

function applyChange(plans: MealPlanView[], change: Change): MealPlanView[] {
  switch (change.type) {
    case "createPlan":
      return [...plans, { id: change.tempId, weekStart: change.weekStart, entries: [] }];
    case "deletePlan":
      return plans.filter((p) => p.id !== change.mealPlanId);
    case "setEntry":
      return plans.map((p) => {
        if (p.id !== change.mealPlanId) return p;
        const withoutOld = p.entries.filter(
          (e) => !(e.dayOffset === change.dayOffset && e.slot === change.slot),
        );
        return {
          ...p,
          entries: [
            ...withoutOld,
            {
              id: `optimistic-${change.mealPlanId}-${change.dayOffset}-${change.slot}`,
              dayOffset: change.dayOffset,
              slot: change.slot,
              title: change.title,
              recipeId: change.recipeId,
            },
          ],
        };
      });
    case "clearEntry":
      return plans.map((p) =>
        p.id !== change.mealPlanId
          ? p
          : {
              ...p,
              entries: p.entries.filter(
                (e) => !(e.dayOffset === change.dayOffset && e.slot === change.slot),
              ),
            },
      );
  }
}

type EditingSlot = {
  mealPlanId: string;
  dayOffset: number;
  slot: MealSlot;
  dayLabel: string;
  currentTitle: string;
  currentRecipeId: string | null;
};

/**
 * The whole Meal Plan page's client-side state: this week, the weeks ahead,
 * and collapsed past weeks — plus the two sheets (fill a slot, plan a new
 * week). "Which week is current" is decided here, from the browser's own
 * clock (see src/lib/useToday.ts), never on the server.
 */
export function MealPlanList({
  plans,
  recipes,
  canManage,
}: {
  plans: MealPlanView[];
  recipes: RecipeListItem[];
  /** True for admin/parent sessions — deleteMealPlan refuses a kid's
   * session server-side (mission-6's C1), so every WeekCard's delete
   * button is omitted entirely for one rather than shown-and-disabled.
   * Filling/clearing a slot stays available to everyone. */
  canManage: boolean;
}) {
  const [optimisticPlans, applyOptimistic] = useOptimistic(plans, applyChange);
  const [, startTransition] = useTransition();
  const today = useToday();

  // The wide layout (WeekGrid, Coming up beside Past weeks) is decided by the
  // list wrapper's own measured width, not the screen's, so the pinned
  // Sidebar or Rail just leaves it less room (structural call 4). The sheets
  // sit OUTSIDE the measured wrapper (STRUCTURE.md "Wide pages", rule 1). It
  // wraps every state of the list so the ref is attached on the first render.
  const listRef = useRef<HTMLDivElement>(null);
  // The week grid needs the 3-column width to fit seven days.
  const wide = useContainerWidth(listRef) >= COLUMN_MIN_WIDTH_PX[3];
  // Wide only: the one week opened from a summary card or a past-week header.
  const [openWeekId, setOpenWeekId] = useState<string | null>(null);
  const openGridRef = useRef<HTMLDivElement>(null);
  // Keeps the opened week title clear of the floating menu button (0 where the menu is pinned).
  const hamburgerRowHeight = useHamburgerRowHeight();
  // The opened grid sits below the cards, often off screen, so bring it into view.
  useEffect(() => {
    if (openWeekId !== null) openGridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [openWeekId]);
  const toggleWeek = (id: string) => setOpenWeekId((cur) => (cur === id ? null : id));

  const [creatingPlan, setCreatingPlan] = useState(false);
  const [editingSlot, setEditingSlot] = useState<EditingSlot | null>(null);

  function run(change: Change, serverAction: () => Promise<unknown>) {
    startTransition(async () => {
      applyOptimistic(change);
      await serverAction();
    });
  }

  function openSlot(
    plan: MealPlanView,
    dayOffset: number,
    slot: MealSlot,
    currentTitle: string,
    currentRecipeId: string | null,
  ) {
    setEditingSlot({
      mealPlanId: plan.id,
      dayOffset,
      slot,
      dayLabel: formatDayLabel(addDays(plan.weekStart, dayOffset)),
      currentTitle,
      currentRecipeId,
    });
  }

  function handleCreatePlan(weekStart: Date) {
    run({ type: "createPlan", tempId: `temp-${weekStart.getTime()}`, weekStart }, () =>
      createMealPlan(weekStart),
    );
    setCreatingPlan(false);
  }

  function handleDeletePlan(mealPlanId: string) {
    run({ type: "deletePlan", mealPlanId }, () => deleteMealPlan(mealPlanId));
  }

  function handleSaveSlot(title: string, recipeId: string | null = null) {
    if (!editingSlot) return;
    const { mealPlanId, dayOffset, slot } = editingSlot;
    run({ type: "setEntry", mealPlanId, dayOffset, slot, title, recipeId }, () =>
      setMealPlanEntry({ mealPlanId, dayOffset, slot, title, recipeId }),
    );
    setEditingSlot(null);
  }

  function handleClearSlot() {
    if (!editingSlot) return;
    const { mealPlanId, dayOffset, slot } = editingSlot;
    run({ type: "clearEntry", mealPlanId, dayOffset, slot }, () =>
      clearMealPlanEntry({ mealPlanId, dayOffset, slot }),
    );
    setEditingSlot(null);
  }

  const addWeekButton = (
    <div className="mb-4 flex justify-end">
      <button
        type="button"
        onClick={() => setCreatingPlan(true)}
        className="flex min-h-12 shrink-0 items-center gap-1.5 rounded-xl bg-accent px-4 text-base font-semibold text-accent-fg transition-opacity active:opacity-80"
      >
        <Plus aria-hidden="true" size={20} />
        Plan a week
      </button>
    </div>
  );

  // `today` is null during SSR and the very first client render — see
  // useToday's own comment for why guessing here would risk showing the
  // wrong "current week" for part of every evening. Rendering nothing that
  // depends on it for a moment is the honest tradeoff.
  function renderList(today: Date) {
    const todaySunday = sundayOf(today);
    const currentPlan = optimisticPlans.find((p) => isSameDay(p.weekStart, todaySunday));
    const futurePlans = optimisticPlans
      .filter((p) => p.weekStart.getTime() > todaySunday.getTime())
      .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
    const pastPlans = optimisticPlans
      .filter((p) => p.weekStart.getTime() < todaySunday.getTime())
      .sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime());

    if (optimisticPlans.length === 0) {
      return (
        <EmptyState
          emoji="🗓️"
          title="No weeks planned yet"
          hint='Tap "Plan a week" above to get started.'
        />
      );
    }

    const tapFor =
      (plan: MealPlanView) =>
      (dayOffset: number, slot: MealSlot, currentTitle: string, currentRecipeId: string | null) =>
        openSlot(plan, dayOffset, slot, currentTitle, currentRecipeId);
    const deleteFor = (plan: MealPlanView) =>
      canManage ? () => handleDeletePlan(plan.id) : undefined;
    // Same props either way; only the wide layout swaps the card for the grid.
    const Week = wide ? WeekGrid : WeekCard;
    const openPlan = wide ? optimisticPlans.find((p) => p.id === openWeekId) : undefined;

    return (
      <div className="flex flex-col gap-6">
        {currentPlan ? (
          <Week
            plan={currentPlan}
            today={today}
            onSlotTap={tapFor(currentPlan)}
            onDeletePlan={deleteFor(currentPlan)}
          />
        ) : (
          <EmptyState
            emoji="🗓️"
            title="This week isn't planned yet"
            hint='Tap "Plan a week" above to fill it in.'
          />
        )}

        {wide ? (
          (futurePlans.length > 0 || pastPlans.length > 0) && (
            <>
              <div className="grid grid-cols-2 items-start gap-4">
                <section>
                  {futurePlans.length > 0 && (
                    <>
                      <h2 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-muted">
                        Coming up
                      </h2>
                      <div className="grid grid-cols-2 gap-3">
                        {futurePlans.map((plan) => (
                          <WeekSummaryCard key={plan.id} plan={plan}
                            open={openWeekId === plan.id} onToggle={() => toggleWeek(plan.id)} />
                        ))}
                      </div>
                    </>
                  )}
                </section>
                {pastPlans.length > 0 && (
                  <PastMealWeeks
                    plans={pastPlans}
                    today={today}
                    onSlotTap={openSlot}
                    openId={openWeekId}
                    onToggle={toggleWeek}
                  />
                )}
              </div>
              {openPlan && (
                <div
                  ref={openGridRef}
                  style={{ scrollMarginTop: hamburgerRowHeight + 8 }}
                >
                  <WeekGrid
                    plan={openPlan}
                    today={today}
                    onSlotTap={tapFor(openPlan)}
                    onDeletePlan={deleteFor(openPlan)}
                  />
                </div>
              )}
            </>
          )
        ) : (
          <>
            {futurePlans.length > 0 && (
              <section>
                <h2 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-muted">
                  Coming up
                </h2>
                <div className="flex flex-col gap-4">
                  {futurePlans.map((plan) => (
                    <WeekCard
                      key={plan.id}
                      plan={plan}
                      today={today}
                      onSlotTap={tapFor(plan)}
                      onDeletePlan={deleteFor(plan)}
                    />
                  ))}
                </div>
              </section>
            )}

            {pastPlans.length > 0 && (
              <PastMealWeeks
                plans={pastPlans}
                today={today}
                onSlotTap={openSlot}
                onDeletePlan={canManage ? handleDeletePlan : undefined}
              />
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      {addWeekButton}

      <div ref={listRef}>
        {today === null ? <div aria-hidden="true" className="h-40" /> : renderList(today)}
      </div>

      {creatingPlan && (
        <CreatePlanSheet
          existingWeekStarts={optimisticPlans.map((p) => p.weekStart)}
          onClose={() => setCreatingPlan(false)}
          onChoose={handleCreatePlan}
        />
      )}

      {editingSlot && (
        <SlotEditSheet
          dayLabel={editingSlot.dayLabel}
          slot={editingSlot.slot}
          currentTitle={editingSlot.currentTitle}
          currentRecipeId={editingSlot.currentRecipeId}
          recipes={recipes}
          onClose={() => setEditingSlot(null)}
          onSave={handleSaveSlot}
          onClear={handleClearSlot}
        />
      )}
    </div>
  );
}
