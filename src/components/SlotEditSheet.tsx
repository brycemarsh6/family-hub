"use client";

import { useEffect, useState } from "react";
import { BookOpen, Sparkles } from "lucide-react";
import type { MealSlot } from "@/lib/constants";

// Real-life frequent answers, one tap each — the whole point of these is
// that a preset tap *is* the save, no second confirmation needed. Free text
// still needs a deliberate Save tap, since "review before it lands" applies
// to anything not explicitly chosen from a fixed list.
const PRESETS = ["Leftovers", "Takeout", "Eating out"] as const;

/**
 * Fill (or clear) one meal slot. Three ways in, per the Meal Plan plan:
 * quick presets, a recipe picker, and AI suggestions grounded in the real
 * inventory — the latter two are visible now (M1) but point at "coming
 * soon" until M2 and M4 land, same pattern the Recipes import chooser used
 * for photo/link import before they were built.
 */
export function SlotEditSheet({
  dayLabel,
  slot,
  currentTitle,
  onClose,
  onSave,
  onClear,
}: {
  dayLabel: string;
  slot: MealSlot;
  currentTitle: string;
  onClose: () => void;
  onSave: (title: string) => void;
  onClear: () => void;
}) {
  const [customTitle, setCustomTitle] = useState(currentTitle);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleSaveCustom() {
    const trimmed = customTitle.trim();
    if (!trimmed) return;
    onSave(trimmed);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Close without saving"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${slot}, ${dayLabel}`}
        className="relative flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-2 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{slot}</h2>
            <p className="text-sm text-muted">{dayLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close without saving"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-xl text-muted transition-colors hover:bg-surface-2"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <span className="mb-2 block text-sm text-muted">Quick pick</span>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onSave(preset)}
                  className="min-h-14 rounded-xl border border-line bg-surface-2 px-2 text-sm font-semibold text-fg transition-colors active:bg-line"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled
              className="flex min-h-12 items-center gap-3 rounded-xl border border-dashed border-line px-4 text-left text-sm font-medium text-muted opacity-60"
            >
              <BookOpen aria-hidden="true" size={18} />
              Pick from your recipes
              <span className="ml-auto text-xs">Coming soon</span>
            </button>
            <button
              type="button"
              disabled
              className="flex min-h-12 items-center gap-3 rounded-xl border border-dashed border-line px-4 text-left text-sm font-medium text-muted opacity-60"
            >
              <Sparkles aria-hidden="true" size={18} />
              Ask AI what to make
              <span className="ml-auto text-xs">Coming soon</span>
            </button>
          </div>

          <label className="block text-sm text-muted">
            <span className="mb-1 block">Or type something else</span>
            <input
              type="text"
              value={customTitle}
              onChange={(event) => setCustomTitle(event.target.value)}
              placeholder="Chicken pot pie, tacos…"
              autoComplete="off"
              className="min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base outline-none placeholder:text-muted"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-line pt-4">
          <button
            type="button"
            onClick={handleSaveCustom}
            disabled={!customTitle.trim()}
            className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-40"
          >
            Save
          </button>
          {currentTitle && (
            <button
              type="button"
              onClick={onClear}
              className="min-h-11 w-full rounded-xl text-sm font-medium text-danger transition-colors hover:bg-surface-2"
            >
              Clear this meal
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
