"use client";

import { useEffect, useState, useTransition } from "react";
import { QuantityStepper } from "./QuantityStepper";
import type { PlanItemView } from "@/lib/goals";
import {
  HABIT_PERIODS,
  PLAN_KINDS,
  PLAN_KIND_LABELS,
  type HabitPeriod,
  type PlanKind,
} from "@/lib/goalVocabulary";
import { createPlanItem, deletePlanItem, updatePlanItem } from "@/app/actions/planItems";

/**
 * Add one thing to a goal's plan, or edit one that is already there. A habit
 * repeats ("3 times a week"), a step is done once, a reminder is just text.
 * Edit mode adds a one-tap Delete (house rule: no confirmation).
 */
export function PlanItemSheet({
  goalId,
  goalTitle,
  initial,
  onClose,
  onSaved,
}: {
  goalId: string;
  goalTitle: string;
  initial?: PlanItemView;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [kind, setKind] = useState<PlanKind>(initial?.kind ?? "habit");
  const [times, setTimes] = useState(initial?.timesPerPeriod ?? 3);
  const [period, setPeriod] = useState<HabitPeriod>(initial?.period ?? "week");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleSubmit() {
    if (!title.trim()) return;
    const raw = {
      title: title.trim(),
      kind,
      timesPerPeriod: kind === "habit" ? times : null,
      period: kind === "habit" ? period : null,
    };
    setError(null);
    startTransition(async () => {
      const result = initial
        ? await updatePlanItem(initial.id, raw)
        : await createPlanItem(goalId, raw);
      if (result.error) return setError(result.error);
      onSaved();
      onClose();
    });
  }

  function handleDelete() {
    if (!initial) return;
    setError(null);
    startTransition(async () => {
      const result = await deletePlanItem(initial.id);
      if (result.error) return setError(result.error);
      onSaved();
      onClose();
    });
  }

  const heading = initial ? "Edit plan item" : "Add to the plan";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={heading}
        className="relative flex max-h-[90vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{heading}</h2>
            <p className="truncate text-sm text-muted">for {goalTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xl text-muted transition-colors hover:bg-surface-2"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <label className="block text-sm text-muted">
            <span className="mb-1 block">What will you do?</span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSubmit();
              }}
              maxLength={120}
              autoComplete="off"
              autoFocus
              className="min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base text-fg outline-none placeholder:text-muted"
            />
          </label>

          <div role="group" aria-label="Kind">
            <span className="mb-2 block text-sm text-muted">Kind</span>
            <div className="grid grid-cols-3 gap-2">
              {PLAN_KINDS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setKind(option)}
                  aria-pressed={kind === option}
                  className={`min-h-16 rounded-xl border px-2 text-sm font-semibold transition-colors ${
                    kind === option
                      ? "border-accent bg-accent-soft text-fg"
                      : "border-line bg-surface-2 text-fg"
                  }`}
                >
                  {PLAN_KIND_LABELS[option].label}
                  <span className="block text-xs font-normal">{PLAN_KIND_LABELS[option].hint}</span>
                </button>
              ))}
            </div>
          </div>

          {kind === "habit" && (
            <div role="group" aria-label="How often">
              <span className="mb-2 block text-sm text-muted">How often</span>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <QuantityStepper value={times} onChange={setTimes} min={1} label="Times" />
                <span className="text-sm text-muted">times a</span>
                <div className="flex rounded-xl bg-surface-2 p-1">
                  {HABIT_PERIODS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setPeriod(option)}
                      aria-pressed={period === option}
                      className={`min-h-11 flex-1 rounded-lg px-3 text-sm font-medium transition-colors ${
                        period === option ? "bg-surface text-fg" : "text-muted"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn"
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2 border-t border-line pt-4">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pending || !title.trim()}
            className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50"
          >
            {pending ? "Saving…" : initial ? "Save" : "Add"}
          </button>
          {initial && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="min-h-12 w-full rounded-xl text-base font-semibold text-danger transition-colors active:bg-surface-2 disabled:opacity-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
