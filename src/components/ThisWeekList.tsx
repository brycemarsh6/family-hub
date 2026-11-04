"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { Undo2 } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { PlanItemRow } from "./PlanItemRow";
import type { SwipeAction } from "./SwipeActions";
import {
  nextStep,
  weekSummary,
  type GoalView,
  type PlanItemView,
  type PlansPageData,
  type Viewer,
} from "@/lib/goals";
import { lifeAreaInfo } from "@/lib/goalVocabulary";
import { formatWeekRange } from "@/lib/mealPlanDates";
import {
  completeStep,
  logHabit,
  uncompleteStep,
  undoHabitLog,
  type PlanItemActionResult,
} from "@/app/actions/planItems";

// Every way a plan item can change on screen before the server has caught up.
type Change =
  | { type: "log"; itemId: string }
  | { type: "undo"; itemId: string }
  | { type: "stepDone"; itemId: string; at: Date }
  | { type: "stepUndone"; itemId: string };

function changeItem(item: PlanItemView, change: Change): PlanItemView {
  switch (change.type) {
    case "log": {
      const count = item.count + 1;
      return { ...item, count, done: count >= item.target };
    }
    case "undo":
      return { ...item, count: Math.max(0, item.count - 1), done: false };
    case "stepDone":
      return { ...item, count: 1, done: true, doneAt: change.at };
    case "stepUndone":
      return { ...item, count: 0, done: false, doneAt: null };
  }
}

function applyChange(goals: GoalView[], change: Change): GoalView[] {
  return goals.map((goal) =>
    goal.items.some((item) => item.id === change.itemId)
      ? {
          ...goal,
          items: goal.items.map((item) =>
            item.id === change.itemId ? changeItem(item, change) : item,
          ),
        }
      : goal,
  );
}

type Filter = "mine" | "everyone";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "mine", label: "Mine and Together" },
  { key: "everyone", label: "Everyone" },
];

export function ThisWeekList({ data, viewer }: { data: PlansPageData; viewer: Viewer }) {
  // Same trick as GroceryList: a copy of the goals we may fib about, updated
  // the instant a button is tapped, then replaced by the server's real answer.
  const [goals, applyOptimistic] = useOptimistic(data.goals, applyChange);
  const [, startTransition] = useTransition();
  const [filter, setFilter] = useState<Filter>("mine");
  const [error, setError] = useState<string | null>(null);

  function run(change: Change, action: () => Promise<PlanItemActionResult>) {
    setError(null);
    startTransition(async () => {
      applyOptimistic(change);
      const result = await action();
      if (result.error) setError(result.error);
    });
  }

  const ws = data.weekStart;
  const showFilter = !viewer.isDevice;
  const shown = goals.filter(
    (goal) =>
      goal.completedAt === null &&
      (!showFilter ||
        filter === "everyone" ||
        goal.ownerId === viewer.userId ||
        goal.ownerId === null),
  );
  const { done, total } = weekSummary(shown);

  // Each goal with what it contributes to this week; a goal with nothing is skipped.
  const cards = shown.flatMap((goal) => {
    const step = nextStep(goal.items);
    const stepView = step ? goal.items.find((item) => item.id === step.id) : undefined;
    const rows = [
      ...goal.items.filter((item) => item.kind === "habit"),
      ...(stepView ? [stepView] : []),
      ...goal.items.filter((item) => item.kind === "reminder"),
    ];
    return rows.length > 0 ? [{ goal, rows }] : [];
  });

  function swipeActions(item: PlanItemView, canLog: boolean): SwipeAction[] {
    if (item.kind !== "habit" || item.count <= 0 || !canLog) return [];
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

  return (
    <div>
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
                {goal.title} · {goal.ownerId === null ? "Together" : lifeAreaInfo(goal.area).short}
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
                      actions={swipeActions(item, goal.canLog)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
