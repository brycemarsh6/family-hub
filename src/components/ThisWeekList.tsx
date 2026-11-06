"use client";

import { useOptimistic, useState } from "react";
import Link from "next/link";
import { Undo2 } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { HoursLogSheet, type RunChange } from "./HoursLogSheet";
import { PlanItemRow } from "./PlanItemRow";
import { WeekRecapCard } from "./WeekRecapCard";
import type { SwipeAction } from "./SwipeActions";
import { HOUSEHOLD_TIME_ZONE } from "@/lib/constants";
import {
  goalOwnership,
  goalsInScope,
  nextStep,
  type GoalView,
  type PlansPageData,
  type Viewer,
} from "@/lib/goals";
import type { WeekRecap } from "@/lib/goalsRecap";
import { weekSummary, type PlanItemView } from "@/lib/goalsProgress";
import { GOAL_OWNERSHIP_LABELS, lifeAreaInfo } from "@/lib/goalVocabulary";
import { zoneMidnightInstant } from "@/lib/householdDate";
import { formatWeekRange } from "@/lib/mealPlanDates";
import { useOptimisticRun } from "@/lib/useOptimisticRun";
import { applyPlanItemChange, type PlanItemChange } from "@/lib/planItemChanges";
import {
  completeStep,
  logHabit,
  uncompleteStep,
  undoHabitLog,
} from "@/app/actions/planItems";

// Every way a plan item can change on screen before the server has caught up.
function applyChange(goals: GoalView[], change: PlanItemChange): GoalView[] {
  return goals.map((goal) =>
    goal.items.some((item) => item.id === change.itemId)
      ? { ...goal, items: applyPlanItemChange(goal.items, change) }
      : goal,
  );
}

type Filter = "mine" | "everyone";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "mine", label: `${GOAL_OWNERSHIP_LABELS.mine} and ${GOAL_OWNERSHIP_LABELS.together}` },
  { key: "everyone", label: "Everyone" },
];

export function ThisWeekList({
  data,
  viewer,
  recap,
}: {
  data: PlansPageData;
  viewer: Viewer;
  // Sundays only: the week that just ended, for each chip. Null on other days.
  recap: { mine: WeekRecap | null; everyone: WeekRecap | null } | null;
}) {
  // Same trick as GroceryList: a copy of the goals we may fib about, updated
  // the instant a button is tapped, then replaced by the server's real answer.
  const [goals, applyOptimistic] = useOptimistic(data.goals, applyChange);
  const { run, error, pending } = useOptimisticRun(applyOptimistic);
  const [filter, setFilter] = useState<Filter>("mine");
  // The hours habit whose log sheet is open. Time isn't drawn early here: the sheet waits for the server, and the page's numbers follow.
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const logging = goals.flatMap((goal) => goal.items).find((item) => item.id === loggingId);
  const runTime: RunChange = (_change, action, onSuccess) => run(null, action, onSuccess);

  const ws = data.weekStart;
  const showFilter = !viewer.isDevice;
  const shown = goalsInScope(goals, viewer, filter);
  const { done, total } = weekSummary(shown);

  // Each goal with what it contributes to this week; a goal with nothing is skipped.
  // A step checked off this week stays put, struck through, so a second tap can undo it;
  // the next undone step sits below it rather than sliding into its place. `doneAt` is a real
  // instant and the week starts at household midnight, so the cut-off is that midnight, not UTC's.
  // Done steps run oldest first, which leaves the one just ticked directly above the next step.
  const weekStartMs = zoneMidnightInstant(ws, HOUSEHOLD_TIME_ZONE).getTime();
  const doneAtMs = (item: PlanItemView) => item.doneAt?.getTime() ?? 0;
  const cards = shown.flatMap((goal) => {
    const step = nextStep(goal.items);
    const stepView = step ? goal.items.find((item) => item.id === step.id) : undefined;
    const rows = [
      ...goal.items.filter((item) => item.kind === "habit"),
      ...goal.items
        .filter((item) => item.kind === "step" && item.doneAt !== null && doneAtMs(item) >= weekStartMs)
        .sort((a, b) => doneAtMs(a) - doneAtMs(b)),
      ...(stepView ? [stepView] : []),
      ...goal.items.filter((item) => item.kind === "reminder"),
    ];
    return rows.length > 0 ? [{ goal, rows }] : [];
  });

  function swipeActions(item: PlanItemView, canLog: boolean): SwipeAction[] {
    if (item.kind !== "habit" || item.hours || item.count <= 0 || !canLog) return [];
    return [
      {
        label: "Undo last",
        accessibleLabel: `Undo last ${item.title}`,
        icon: <Undo2 aria-hidden="true" size={18} />,
        onAction: () => run({ type: "undo", itemId: item.id }, () => undoHabitLog(item.id)),
        tone: "neutral",
      },
    ];
  }

  const shownRecap = recap?.[filter] ?? null;

  return (
    <div>
      {shownRecap && <WeekRecapCard recap={shownRecap} />}
      <p className="mb-3 text-sm text-muted">
        {formatWeekRange(new Date(ws.year, ws.month - 1, ws.day))}
        {total > 0 && ` · ${done} of ${total} done`}
      </p>

      {showFilter && (
        <div className="mb-4 flex gap-2">
          {FILTERS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setFilter(option.key)}
              aria-pressed={filter === option.key}
              className={`flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors ${
                filter === option.key
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-line bg-surface text-muted"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="mb-3 text-sm text-warn">
          {error}
        </p>
      )}

      {cards.length === 0 ? (
        <EmptyState emoji="🎯" title="Nothing planned yet" hint="Add a goal, then give it a plan" />
      ) : (
        <div className="flex flex-col gap-3">
          {cards.map(({ goal, rows }) => (
            <section key={goal.id} className="overflow-hidden rounded-2xl border border-line bg-surface">
              <Link
                href={`/plans/goals/${goal.id}`}
                className="flex min-h-11 items-center px-3 text-xs font-semibold uppercase tracking-wide text-muted active:bg-surface-2"
              >
                {goal.title} · {goalOwnership(goal) === "together" ? GOAL_OWNERSHIP_LABELS.together : lifeAreaInfo(goal.area).short}
              </Link>
              <ul className="divide-y divide-line">
                {rows.map((item) => (
                  <li key={item.id}>
                    <PlanItemRow
                      item={item}
                      canLog={goal.canLog}
                      onLog={() => run({ type: "log", itemId: item.id }, () => logHabit(item.id))}
                      onUndo={() => run({ type: "undo", itemId: item.id }, () => undoHabitLog(item.id))}
                      onStepToggle={() =>
                        item.done
                          ? run({ type: "stepUndone", itemId: item.id }, () => uncompleteStep(item.id))
                          : run({ type: "stepDone", itemId: item.id, at: new Date() }, () => completeStep(item.id))
                      }
                      onLogTime={() => setLoggingId(item.id)}
                      actions={swipeActions(item, goal.canLog)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {logging?.hours && logging.habitId && (
        <HoursLogSheet
          habitId={logging.habitId}
          title={logging.title}
          hours={logging.hours}
          forUserId={viewer.userId}
          run={runTime}
          pending={pending}
          error={error}
          onClose={() => setLoggingId(null)}
        />
      )}
    </div>
  );
}
