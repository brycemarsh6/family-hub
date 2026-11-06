import Link from "next/link";
import { Lock } from "lucide-react";
import { ProgressBar } from "./ProgressBar";
import { isPrivateGoal, whoseGoal, type GoalView } from "@/lib/goals";
import { formatMeasure, PACE_LABELS, weekSummary } from "@/lib/goalsProgress";
import { GOAL_OWNERSHIP_LABELS, ONGOING_LABEL } from "@/lib/goalVocabulary";

/**
 * One goal on the Goals list: title, who it belongs to, the number being
 * tracked with its pace, and a one-line count of the plan under it. The whole
 * card is the tap target; it opens the goal.
 */
export function GoalCard({ goal, viewerId }: { goal: GoalView; viewerId: string }) {
  const { done, total } = weekSummary([goal]);
  const whose = whoseGoal(goal, viewerId);
  const plans = `${goal.items.length} ${goal.items.length === 1 ? "plan" : "plans"}`;
  // A goal's number is all or nothing: unit, target and current are set together.
  const { measureUnit: unit, targetValue: target, currentValue: current } = goal;
  const measured = unit !== null && target !== null && current !== null;

  return (
    <Link
      href={`/plans/goals/${goal.id}`}
      className="block rounded-2xl border border-line bg-surface p-4 active:bg-surface-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <h3 className="min-w-0 text-base font-semibold">{goal.title}</h3>
          {isPrivateGoal(goal) && (
            <Lock aria-label="Private" className="shrink-0 text-muted" size={14} />
          )}
          {goal.targetDate === null && (
            <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted-strong whitespace-nowrap">
              {ONGOING_LABEL}
            </span>
          )}
        </div>
        {whose === "together" ? (
          <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
            {GOAL_OWNERSHIP_LABELS.together}
          </span>
        ) : (
          <span className="shrink-0 text-xs text-muted">
            {whose === "mine" ? GOAL_OWNERSHIP_LABELS.mine : goal.owner?.displayName}
          </span>
        )}
      </div>

      <p className="mt-1 text-sm text-muted">
        {measured
          ? `${formatMeasure(target, unit)} · now ${formatMeasure(current, unit)}`
          : "No number to track"}
        {goal.pace !== null && (
          <>
            {" · "}
            <span className={goal.pace === "behind" ? "font-semibold text-warn" : ""}>
              {PACE_LABELS[goal.pace]}
            </span>
          </>
        )}
      </p>

      {measured && (
        <div className="mt-2">
          <ProgressBar fraction={goal.progress} label={`${goal.title} progress`} />
        </div>
      )}

      <p className="mt-2 text-sm text-muted">
        {plans}
        {total > 0 && ` · ${done} of ${total} this week`}
      </p>
    </Link>
  );
}
