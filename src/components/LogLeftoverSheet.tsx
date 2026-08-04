"use client";

import { useEffect, useState } from "react";
import { QuantityStepper } from "./QuantityStepper";

// How many days a cooked leftover keeps in the fridge, per USDA guidance —
// same sourcing as src/lib/shelfLife.ts. 3 is the safe middle of "most
// cooked leftovers, 3-4 days"; the other options cover a quick soup someone
// expects to finish in 2, or a hearty roast that'll stretch to 5.
const DAYS_GOOD_OPTIONS = [2, 3, 4, 5] as const;
const DEFAULT_DAYS_GOOD = 3;

/**
 * "Log leftovers" — the whole point is that it never asks for a date.
 *
 * Nobody hand-enters an expiry date mid-cleanup with a pot still on the
 * stove; that's exactly the friction that made leftovers get forgotten and
 * wasted in the first place (see the plan in CLAUDE.md). This asks the one
 * thing a person actually knows in the moment — roughly how long this is
 * good for — as a single tap on a big preset chip, and turns that into a
 * real date server-side (see the logLeftover action).
 */
export function LogLeftoverSheet({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (input: { name: string; quantity: number; daysGood: number }) => void;
}) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [daysGood, setDaysGood] = useState<number>(DEFAULT_DAYS_GOOD);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    onSave({ name: trimmedName, quantity, daysGood });
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
        aria-label="Log leftovers"
        className="relative flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Log leftovers</h2>
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
          <label className="block text-sm text-muted">
            <span className="mb-1 block">What is it?</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Taco soup, lasagna, roast chicken…"
              autoComplete="off"
              autoFocus
              className="min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base outline-none placeholder:text-muted"
            />
          </label>

          <label className="block text-sm text-muted">
            <span className="mb-1 block">How many portions?</span>
            <QuantityStepper
              value={quantity}
              onChange={setQuantity}
              min={0.5}
              label="portions"
            />
          </label>

          <div>
            <span className="mb-2 block text-sm text-muted">
              Good for about how long?
            </span>
            <div className="grid grid-cols-4 gap-2">
              {DAYS_GOOD_OPTIONS.map((days) => {
                const active = daysGood === days;
                return (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setDaysGood(days)}
                    aria-pressed={active}
                    className={`min-h-14 rounded-xl border text-base font-semibold transition-colors ${
                      active
                        ? "border-accent bg-accent text-accent-fg"
                        : "border-line bg-surface-2 text-fg"
                    }`}
                  >
                    {days}
                    {/* Every preset is 2+, so no singular/plural branch needed. */}
                    <span className="block text-xs font-normal">days</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-line pt-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
