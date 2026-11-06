"use client";

import { useOptimistic, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { HabitIcon } from "./HabitIcon";
import { planHabitDay } from "@/app/actions/habitPlans";
import type { TodayPrompt } from "@/lib/habitsRead";
import { PLAN_OTHER_DAY_LABEL, PLAN_PROMPT_QUESTION, PLAN_PROMPT_QUESTION_MANY, PLAN_PROMPT_TITLE } from "@/lib/habitVocabulary";
import { useOptimisticRun } from "@/lib/useOptimisticRun";

const CHIP_CLASSES = "flex min-h-12 items-center rounded-full border border-line bg-surface px-5 text-base font-semibold active:bg-surface-2";

/**
 * The "Pick a day" card (decisions 39, 142, 161): one card with a block per habit
 * that asks for a day today, shared by Today and the dashboard. A chip plans
 * that day and its block leaves the instant it is tapped (the card with the
 * last); if the save fails it comes back with the error under the blocks. "Other day" opens a date choice limited to the
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
    <section aria-label={PLAN_PROMPT_TITLE} className="mb-3 rounded-2xl border border-line bg-surface p-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
        <CalendarPlus aria-hidden="true" size={18} />
        {PLAN_PROMPT_TITLE}
      </h2>
      <p className="mt-1 text-sm text-muted">{live.length > 1 ? PLAN_PROMPT_QUESTION_MANY : PLAN_PROMPT_QUESTION}</p>
      <ul className="mt-2 divide-y divide-line">
        {live.map((prompt) => (
          <li key={prompt.habitId} className="py-3 first:pt-1 last:pb-0">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <HabitIcon name={prompt.icon} kind={prompt.kind} size={18} />
              </div>
              <p className="line-clamp-2 min-w-0 flex-1 text-base font-semibold">{prompt.title}</p>
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
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-2 text-sm text-warn">
          {error}
        </p>
      )}
    </section>
  );
}
