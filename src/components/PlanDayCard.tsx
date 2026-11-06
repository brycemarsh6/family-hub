"use client";

import { useOptimistic, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { HabitIcon } from "./HabitIcon";
import { planHabitDay } from "@/app/actions/habitPlans";
import type { TodayPrompt } from "@/lib/habitsRead";
import { PLAN_OTHER_DAY_LABEL, PLAN_PROMPT_QUESTION, PLAN_PROMPT_TITLE } from "@/lib/habitVocabulary";
import { useOptimisticRun } from "@/lib/useOptimisticRun";

const CHIP_CLASSES = "flex min-h-12 items-center rounded-full border border-line bg-surface px-5 text-base font-semibold";

/**
 * The "Pick a day" cards (decisions 39, 142): one per habit that asks for a
 * day today, shared by Today and the dashboard. A chip plans that day and the
 * card leaves the instant it is tapped; if the save fails it comes back with
 * the error under the cards. "Other day" opens a date choice limited to the
 * days past the chips, up to the period's last day.
 */
export function PlanDayCards({ prompts }: { prompts: TodayPrompt[] }) {
  const [live, hide] = useOptimistic<TodayPrompt[], string>(prompts, (list, habitId) => list.filter((p) => p.habitId !== habitId));
  const { run, error } = useOptimisticRun(hide);
  const [otherOpen, setOtherOpen] = useState<string | null>(null);

  function plan(habitId: string, day: string) {
    setOtherOpen(null);
    run(habitId, () => planHabitDay(habitId, day));
  }

  if (live.length === 0 && !error) return null;
  return (
    <div className="mb-3 flex flex-col gap-2">
      {live.map((prompt) => (
        <section key={prompt.habitId} aria-label={`${PLAN_PROMPT_TITLE}: ${prompt.title}`} className="rounded-2xl border border-line bg-surface p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <HabitIcon name={prompt.icon} kind={prompt.kind} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted">
                <CalendarPlus aria-hidden="true" size={14} />
                {PLAN_PROMPT_TITLE}
              </p>
              <p className="truncate text-base font-semibold">{prompt.title}</p>
              <p className="text-sm text-muted">{PLAN_PROMPT_QUESTION}</p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {prompt.chips.map((chip) => (
              <button key={chip.day} type="button" onClick={() => plan(prompt.habitId, chip.day)} className={CHIP_CLASSES}>
                {chip.label}
              </button>
            ))}
            {prompt.showOther && (
              <button
                type="button"
                onClick={() => setOtherOpen(otherOpen === prompt.habitId ? null : prompt.habitId)}
                aria-expanded={otherOpen === prompt.habitId}
                className={CHIP_CLASSES}
              >
                {PLAN_OTHER_DAY_LABEL}
              </button>
            )}
          </div>
          {prompt.showOther && otherOpen === prompt.habitId && (
            // Picking a date plans it at once (the browser's picker has its own Done step), so there is no second button.
            <input
              type="date"
              aria-label={`${PLAN_OTHER_DAY_LABEL} for ${prompt.title}`}
              min={prompt.otherFrom}
              max={prompt.otherTo}
              onChange={(event) => event.target.value && plan(prompt.habitId, event.target.value)}
              className="mt-2 min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base text-fg outline-none"
            />
          )}
        </section>
      ))}
      {error && (
        <p role="alert" className="text-sm text-warn">
          {error}
        </p>
      )}
    </div>
  );
}
