"use client";

import { useOptimistic } from "react";
import { Bell } from "lucide-react";
import { markNudgeSeen } from "@/app/actions/habitNudges";
import type { TodayNudge } from "@/lib/habitsRead";
import { useOptimisticRun } from "@/lib/useOptimisticRun";

/**
 * One card per unseen nudge (decision 96): "Emily nudged you about Morning
 * Prayers" and a "Got it" button. The card goes the instant it is tapped; the
 * server marks it seen and the page refreshes behind it. If the save fails the
 * card comes back with a line saying so.
 */
export function NudgeCards({ nudges }: { nudges: TodayNudge[] }) {
  const [live, hide] = useOptimistic<TodayNudge[], string>(nudges, (list, id) => list.filter((n) => n.id !== id));
  const { run, error } = useOptimisticRun(hide);

  function gotIt(id: string) {
    run(id, () => markNudgeSeen(id));
  }

  if (live.length === 0 && !error) return null;
  return (
    <div className="mb-3 flex flex-col gap-2">
      {live.map((nudge) => (
        <div key={nudge.id} className="flex items-center gap-2.5 rounded-2xl bg-streak-soft py-2 pl-3 pr-1">
          <Bell aria-hidden="true" size={20} className="shrink-0 text-streak" />
          <p className="min-w-0 flex-1 text-sm">
            <b>{nudge.fromName} nudged you</b> about {nudge.habitTitle}
          </p>
          <button
            type="button"
            onClick={() => gotIt(nudge.id)}
            className="min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold"
          >
            Got it
          </button>
        </div>
      ))}
      {error && (
        <p role="alert" className="text-sm text-warn">
          {error}
        </p>
      )}
    </div>
  );
}
