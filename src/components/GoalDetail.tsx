"use client";

import { useOptimistic, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, MoreHorizontal, Pencil, Plus, RotateCcw, Trash2, Undo2 } from "lucide-react";
import { ActionCircle } from "./ActionCircle";
import { ActionSheet } from "./ActionSheet";
import { CheckInSheet } from "./CheckInSheet";
import { GoalResultCard } from "./GoalResultCard";
import { HoursLogSheet, type RunChange } from "./HoursLogSheet";
import { PlanItemRow } from "./PlanItemRow";
import { PlanItemSheet } from "./PlanItemSheet";
import type { SwipeAction } from "./SwipeActions";
import type { GoalView } from "@/lib/goals";
import { paceStatus, progressFraction, type PlanItemView } from "@/lib/goalsProgress";
import { useOptimisticRun } from "@/lib/useOptimisticRun";
import type { CalendarDate } from "@/lib/householdDate";
import { applyPlanItemChange, type PlanItemChange } from "@/lib/planItemChanges";
import { completeGoal, deleteCheckIn, deleteGoal, uncompleteGoal, type GoalActionResult } from "@/app/actions/goals";
import {
  completeStep,
  deletePlanItem,
  logHabit,
  uncompleteStep,
  undoHabitLog,
  type PlanItemActionResult,
} from "@/app/actions/planItems";

// Two panels: The result on the left, The plan on the right. One "@container"
// wraps only the two panels (they go side by side from 48rem of the page's own
// width, so 1180, the Sidebar and the 820 iPad all get two panels and a phone
// gets one, with no extra code). Every sheet
// sits after it, outside, so each still opens on the viewport.
//
// Every way this goal can change on screen before the server has caught up.
// An optimistic value falls back to the server's own the moment the call
// finishes, so a refused call snaps back by itself; `run` then says why.
// The plan item changes are shared with This week (planItemChanges.ts); the
// three that change the goal itself live here.
type Change =
  | PlanItemChange
  | { type: "checkIn"; value: number; at: Date }
  | { type: "complete"; at: Date }
  | { type: "reopen" };


type Sheet = { kind: "menu" } | { kind: "checkIn" } | { kind: "item"; item?: PlanItemView };

export function GoalDetail({
  goal: served,
  today,
}: {
  goal: GoalView;
  today: CalendarDate;
}) {
  const router = useRouter();
  // Same trick as ThisWeekList: a copy of the goal we may fib about, updated
  // the instant something is tapped, then replaced by the server's real answer.
  const [goal, applyOptimistic] = useOptimistic(served, (current: GoalView, change: Change): GoalView => {
    switch (change.type) {
      case "checkIn": {
        const next = { ...current, currentValue: change.value, checkedInAt: change.at };
        return { ...next, progress: progressFraction(next), pace: paceStatus(next, today) };
      }
      case "complete":
        return { ...current, completedAt: change.at };
      case "reopen":
        return { ...current, completedAt: null };
      default:
        return { ...current, items: applyPlanItemChange(current.items, change) };
    }
  });
  const { run: runChange, error, setError, pending, startTransition } = useOptimisticRun(applyOptimistic);
  const [sheet, setSheet] = useState<Sheet | null>(null);
  // The hours habit whose log sheet is open; the sheet waits for the server, then the page's numbers follow.
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const logging = goal.items.find((item) => item.id === loggingId);
  const runTime: RunChange = (_change, action, onSuccess) => runChange(null, action, onSuccess);

  function run(
    change: Change,
    action: () => Promise<PlanItemActionResult | GoalActionResult>,
    refresh = false,
  ) {
    runChange(change, action, refresh ? () => router.refresh() : undefined);
  }

  function handleDeleteGoal() {
    setSheet(null);
    setError(null);
    // Not optimistic: a delete that fails would look like the goal vanished, then came back.
    startTransition(async () => {
      const result = await deleteGoal(goal.id);
      if (result.error) setError(result.error);
      else router.replace("/plans?view=goals");
    });
  }

  function handleDeleteItem(itemId: string) {
    setError(null);
    startTransition(async () => {
      const result = await deletePlanItem(itemId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function handleDeleteCheckIn(checkInId: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteCheckIn(checkInId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  function itemActions(item: PlanItemView): SwipeAction[] {
    const actions: SwipeAction[] = [];
    if (item.kind === "habit" && !item.hours && item.count > 0 && goal.canLog) {
      actions.push({
        label: "Undo last",
        accessibleLabel: `Undo last ${item.title}`,
        icon: <Undo2 aria-hidden="true" size={18} />,
        onAction: () => run({ type: "undo", itemId: item.id }, () => undoHabitLog(item.id)),
        tone: "neutral",
      });
    }
    if (!goal.canEdit) return actions;
    actions.push(
      {
        label: "Edit",
        accessibleLabel: `Edit ${item.title}`,
        icon: <Pencil aria-hidden="true" size={18} />,
        onAction: () => setSheet({ kind: "item", item }),
        tone: "neutral",
      },
      {
        label: "Delete",
        accessibleLabel: `Delete ${item.title}`,
        icon: <Trash2 aria-hidden="true" size={18} />,
        onAction: () => handleDeleteItem(item.id),
        tone: "danger",
      },
    );
    return actions;
  }

  const completed = goal.completedAt !== null;

  const menuItems = [
    {
      label: "Edit goal",
      icon: <Pencil aria-hidden="true" size={20} />,
      onClick: () => router.push(`/plans/goals/${goal.id}/edit`),
    },
    completed
      ? {
          label: "Reopen",
          icon: <RotateCcw aria-hidden="true" size={20} />,
          onClick: () => {
            setSheet(null);
            run({ type: "reopen" }, () => uncompleteGoal(goal.id), true);
          },
        }
      : {
          label: "Mark done",
          icon: <Check aria-hidden="true" size={20} />,
          onClick: () => {
            setSheet(null);
            run({ type: "complete", at: new Date() }, () => completeGoal(goal.id), true);
          },
        },
    {
      label: "Delete goal",
      icon: <Trash2 aria-hidden="true" size={20} />,
      onClick: handleDeleteGoal,
      destructive: true,
    },
  ];

  return (
    <div>
      {goal.canEdit && (
        <div className="mb-3 flex justify-end">
          <ActionCircle
            size="sm"
            label="More"
            icon={<MoreHorizontal aria-hidden="true" size={20} />}
            onClick={() => setSheet({ kind: "menu" })}
          />
        </div>
      )}

      <div className="@container">
        <div className="grid grid-cols-1 items-start gap-5 @min-[48rem]:grid-cols-2">
          <div>
            <GoalResultCard goal={goal} onCheckIn={() => setSheet({ kind: "checkIn" })} onDeleteCheckIn={handleDeleteCheckIn} />
          </div>
          <div>
            <h2 className="mb-2 mt-0 px-1 text-xs font-semibold uppercase tracking-wide text-muted">The plan</h2>
            {goal.items.length === 0 ? (
              <p className="px-1 text-sm text-muted">
                {goal.canEdit ? "No plan yet. What will you do to get there?" : "No plan yet."}
              </p>
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                {goal.items.map((item) => (
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
                      onLogTime={() => {
                        setError(null);
                        setLoggingId(item.id);
                      }}
                      actions={itemActions(item)}
                    />
                  </li>
                ))}
              </ul>
            )}

            {error && !logging && (
              <p role="alert" className="mt-3 rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
                {error}
              </p>
            )}

            {goal.canEdit && (
              <button
                type="button"
                onClick={() => setSheet({ kind: "item" })}
                className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line font-semibold text-accent active:bg-surface-2"
              >
                <Plus aria-hidden="true" size={20} />
                Add to the plan
              </button>
            )}
          </div>
        </div>
      </div>

      {logging?.hours?.forUserId && logging.habitId && (
        <HoursLogSheet
          habitId={logging.habitId}
          title={logging.title}
          hours={logging.hours}
          forUserId={logging.hours.forUserId}
          run={runTime}
          pending={pending}
          error={error}
          onEdit={() => setError(null)}
          onClose={() => setLoggingId(null)}
        />
      )}
      {sheet?.kind === "menu" && (
        <ActionSheet title="This goal" items={menuItems} onClose={() => setSheet(null)} />
      )}
      {sheet?.kind === "checkIn" && (
        <CheckInSheet
          goal={goal}
          onClose={() => setSheet(null)}
          onSaved={(value) =>
            startTransition(() => {
              applyOptimistic({ type: "checkIn", value, at: new Date() });
              router.refresh();
            })
          }
        />
      )}
      {sheet?.kind === "item" && (
        <PlanItemSheet
          goalId={goal.id}
          goalTitle={goal.title}
          goalArea={goal.area}
          initial={sheet.item}
          onClose={() => setSheet(null)}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  );
}
