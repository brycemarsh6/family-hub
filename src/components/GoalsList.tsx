"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "./EmptyState";
import { FloatingAddButton } from "./FloatingAddButton";
import { GoalCard } from "./GoalCard";
import type { PlansPageData } from "@/lib/goals";
import { LIFE_AREAS } from "@/lib/goalVocabulary";

type Status = "active" | "done";

const STATUSES: { key: Status; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "done", label: "Done" },
];

export function GoalsList({ data, canManage }: { data: PlansPageData; canManage: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("active");

  // data.goals arrive soonest target date first; filtering keeps that order.
  const shown = data.goals.filter((goal) => (goal.completedAt === null) === (status === "active"));
  const groups = LIFE_AREAS.map((area) => ({
    area,
    goals: shown.filter((goal) => goal.area === area.key),
  })).filter((group) => group.goals.length > 0);

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

      {groups.length === 0 ? (
        <EmptyState
          emoji="🎯"
          title="No goals yet"
          hint={canManage ? "Tap + to add your first one" : "Nothing here yet"}
        />
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map(({ area, goals }) => (
            <section key={area.key}>
              <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">
                {area.short}
              </h2>
              <div className="flex flex-col gap-3">
                {goals.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {canManage && (
        <>
          {/* Keeps the last card clear of the floating add button. */}
          <div aria-hidden="true" className="h-28" />
          <FloatingAddButton onClick={() => router.push("/plans/goals/new")} />
        </>
      )}
    </div>
  );
}
