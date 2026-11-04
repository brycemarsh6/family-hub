"use client";

import { useEffect, useState, useTransition } from "react";
import { formatMeasure, measureStep, type GoalView } from "@/lib/goals";
import { checkInGoal } from "@/app/actions/goals";

/** What was typed, as a number; null for blank or anything that isn't one ("1,200" counts). */
function parseTyped(text: string): number | null {
  const cleaned = text.replace(/,/g, "").trim();
  if (cleaned === "") return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/** A number as it should sit in the box: at most 2 decimals, no trailing zeroes. */
function toText(value: number): string {
  return String(Number(value.toFixed(2)));
}

/**
 * "Where is your number now?" A weigh-in or a dollar figure is a measurement,
 * not a pantry count, so unlike QuantityStepper the number here is typed
 * (Bryce's call, 2026-11-04), with −/+ beside it for small nudges. The −/+
 * are built here rather than from QuantityStepper because that component
 * puts a read-only number between its buttons.
 */
export function CheckInSheet({
  goal,
  onClose,
  onSaved,
}: {
  goal: GoalView;
  onClose: () => void;
  onSaved: (value: number) => void;
}) {
  // The detail page only opens this for a goal with a number; the fallbacks keep the types honest.
  const unit = goal.measureUnit ?? "";
  const start = goal.startValue ?? 0;
  const target = goal.targetValue ?? 0;
  const step = measureStep(start, target);

  const [text, setText] = useState(toText(goal.currentValue ?? start));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const parsed = parseTyped(text);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function nudge(direction: 1 | -1) {
    setText(toText((parsed ?? goal.currentValue ?? start) + direction * step));
  }

  function handleSave() {
    if (parsed === null) return;
    setError(null);
    startTransition(async () => {
      const result = await checkInGoal(goal.id, parsed);
      if (result.error) return setError(result.error);
      onSaved(parsed);
      onClose();
    });
  }

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
        aria-label="Check in"
        className="relative flex max-h-[90vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Check in</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-xl text-muted transition-colors hover:bg-surface-2"
          >
            ×
          </button>
        </div>

        <p className="text-sm text-muted">Goal: {formatMeasure(target, unit)}</p>

        <div className="my-6 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => nudge(-1)}
            aria-label="Decrease"
            className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-2 text-xl font-medium text-fg transition-colors active:bg-line"
          >
            −
          </button>
          <input
            type="text"
            inputMode="decimal"
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSave();
            }}
            aria-label={`Where you are now${unit ? `, in ${unit}` : ""}`}
            autoComplete="off"
            autoFocus
            className="min-h-12 w-28 rounded-xl bg-surface-2 px-2 text-center text-lg font-semibold tabular-nums outline-none"
          />
          <button
            type="button"
            onClick={() => nudge(1)}
            aria-label="Increase"
            className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-2 text-xl font-medium text-fg transition-colors active:bg-line"
          >
            +
          </button>
          <span className="text-base text-muted">{unit}</span>
        </div>

        {error && (
          <p
            role="alert"
            className="mb-4 rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn"
          >
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={pending || parsed === null}
          className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
