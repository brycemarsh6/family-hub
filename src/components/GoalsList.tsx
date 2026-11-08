"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "./EmptyState";
import { FloatingAddButton } from "./FloatingAddButton";
import { GoalCard } from "./GoalCard";
import type { PlansPageData } from "@/lib/goals";
import { GOAL_BOARD_EMPTY_AREA, LIFE_AREAS } from "@/lib/goalVocabulary";

type Status = "active" | "done";

const STATUSES: { key: Status; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "done", label: "Done" },
];

/**
 * Plans & Goals' Goals tab: the Active/Done chips, then the six life areas as a board.
 * The board flows column-major (a set row count), so the mock's fixed pairs stack
 * as drawn, which row-major flow would not. At 64rem it is 3 columns of 2 areas (all
 * six render). At 48rem it is 2 columns whose row count is ceil(visible areas / 2),
 * set in --board-rows: 5 areas give 3+2, 4 give 2+2, 3 give 2+1, 2 give 1+1, so both
 * columns are used. Below 48rem it is one stack. An area with no goals under the
 * current chip is `hidden` until there are 3 columns, so narrower boards look as they
 * always did (empty areas gone) while the wide board keeps its shape.
 * The container wraps the board only, never the chips or the add button.
 */
export function GoalsList({
  data,
  canManage,
  viewerId,
}: {
  data: PlansPageData;
  canManage: boolean;
  viewerId: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("active");

  // data.goals arrive soonest target date first; filtering keeps that order.
  const shown = data.goals.filter((goal) => (goal.completedAt === null) === (status === "active"));
  const groups = LIFE_AREAS.map((area) => ({
    area,
    goals: shown.filter((goal) => goal.area === area.key),
  }));
  const visibleAreas = groups.filter((group) => group.goals.length > 0).length;
  const anyShown = visibleAreas > 0;
  // Rows per column at 2 columns: half the visible areas, rounded up.
  const boardRows = Math.max(1, Math.ceil(visibleAreas / 2));

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {STATUSES.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setStatus(option.key)}
            aria-pressed={status === option.key}
            className={`flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors ${
              status === option.key
                ? "border-accent bg-accent text-accent-fg"
                : "border-line bg-surface text-muted"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {!anyShown ? (
        data.goals.length > 0 ? (
          // Goals exist, just not under this tab: say where they are rather than "none yet".
          <EmptyState
            emoji="🎯"
            title={status === "active" ? "No active goals" : "No finished goals yet"}
            hint={status === "active" ? "Finished goals are under Done" : "Goals you mark done show up here"}
          />
        ) : (
          <EmptyState
            emoji="🎯"
            title="No goals yet"
            hint={canManage ? "Tap + to add your first one" : "Nothing here yet"}
          />
        )
      ) : (
        <div className="@container">
        <div
          className="grid grid-cols-1 items-start gap-x-4 gap-y-5 @min-[48rem]:grid-cols-2 @min-[48rem]:grid-rows-[repeat(var(--board-rows),auto)] @min-[48rem]:grid-flow-col @min-[64rem]:grid-cols-3 @min-[64rem]:grid-rows-[repeat(2,auto)]"
          style={{ "--board-rows": boardRows } as React.CSSProperties}
        >
          {groups.map(({ area, goals }) => (
            <section key={area.key} className={goals.length === 0 ? "hidden @min-[64rem]:block" : undefined}>
              <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">
                {area.short}
              </h2>
              {goals.length === 0 ? (
                <p className="px-1 text-sm text-muted">{GOAL_BOARD_EMPTY_AREA}</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {goals.map((goal) => (
                    <GoalCard key={goal.id} goal={goal} viewerId={viewerId} />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
        </div>
      )}

      {canManage && (
        <>
          {/* Keeps the last card clear of the floating add button. */}
          <div aria-hidden="true" style={{ height: "calc(7rem + env(safe-area-inset-bottom))" }} />
          <FloatingAddButton onClick={() => router.push("/plans/goals/new")} />
        </>
      )}
    </div>
  );
}
