"use client";

import { useEffect, useState, useTransition } from "react";
import { Sparkles, RotateCcw } from "lucide-react";
import { QuantityStepper } from "./QuantityStepper";
import { computeNutrition } from "@/app/actions/recipes";

type Nutrition = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  servings: number;
};

// A fixed three-color category palette for the donut, not the app's
// job-based CSS tokens (globals.css's --danger/--warn/--accent) — those
// name UI *roles*, and don't map onto three arbitrary macro categories.
// Chosen for contrast against both the light and dark --bg.
const FAT_COLOR = "#f97316"; // orange
const PROTEIN_COLOR = "#3b82f6"; // blue
const CARBS_COLOR = "#a855f7"; // purple

/**
 * "Calculate nutrition" and the estimate it produces (Recipes v2's C6
 * phase). Nutrition is estimated once, stored, and marked honest — never
 * silently recomputed. See Recipe.nutritionCalories's schema comment and
 * src/lib/nutritionFingerprint.ts for the staleness design.
 */
export function NutritionSection({
  recipeId,
  servingsText,
  initial,
  stale,
}: {
  recipeId: string;
  /** The recipe's own free-text `servings` field ("6-8"), read only to
   * guess a sensible default for the stepper — never written to. */
  servingsText: string | null;
  initial: Nutrition | null;
  /** True when the stored estimate was computed for an ingredient list
   * that's since changed — see nutritionFingerprint.ts. */
  stale: boolean;
}) {
  const [nutrition, setNutrition] = useState(initial);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <section className="mb-6 border-t border-line pt-4">
      <h2 className="mb-2 text-lg font-semibold">Nutrition</h2>

      {nutrition ? (
        <>
          {stale && (
            <p className="mb-3 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
              This was computed for an older ingredient list.{" "}
              <button
                type="button"
                onClick={() => setSheetOpen(true)}
                className="font-semibold underline underline-offset-2"
              >
                Recompute
              </button>
            </p>
          )}

          <NutritionResults nutrition={nutrition} />

          {!stale && (
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="mt-3 flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted transition-colors active:text-fg"
            >
              <RotateCcw aria-hidden="true" size={14} />
              Recalculate
            </button>
          )}
        </>
      ) : (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line text-sm font-medium text-muted transition-colors active:bg-surface-2"
        >
          <Sparkles aria-hidden="true" size={16} />
          Calculate nutrition
        </button>
      )}

      {sheetOpen && (
        <ConfirmServingsSheet
          recipeId={recipeId}
          defaultServings={guessServings(servingsText, nutrition?.servings)}
          onClose={() => setSheetOpen(false)}
          onComputed={(result) => {
            setNutrition(result);
            setSheetOpen(false);
          }}
        />
      )}
    </section>
  );
}

/** Guesses a starting servings count for the stepper: the last value used,
 * else the first number found in the recipe's free-text `servings` field
 * ("6-8" -> 6), else a plain default. */
function guessServings(servingsText: string | null, lastUsed: number | undefined): number {
  if (lastUsed) return lastUsed;
  const match = servingsText?.match(/\d+/);
  if (match) return Math.max(1, Math.min(50, parseInt(match[0], 10)));
  return 4;
}

function NutritionResults({ nutrition }: { nutrition: Nutrition }) {
  const { calories, proteinG, carbsG, fatG, servings } = nutrition;

  // Split by CALORIES, not grams — fat is 9 cal/g, protein and carbs are
  // 4 cal/g, so a gram-split donut understates fat by more than half.
  const fatCals = fatG * 9;
  const proteinCals = proteinG * 4;
  const carbsCals = carbsG * 4;
  const totalMacroCals = fatCals + proteinCals + carbsCals;

  const fatPct = totalMacroCals > 0 ? (fatCals / totalMacroCals) * 100 : 0;
  const proteinPct = totalMacroCals > 0 ? (proteinCals / totalMacroCals) * 100 : 0;

  const ring =
    totalMacroCals > 0
      ? `conic-gradient(${FAT_COLOR} 0% ${fatPct}%, ${PROTEIN_COLOR} ${fatPct}% ${fatPct + proteinPct}%, ${CARBS_COLOR} ${fatPct + proteinPct}% 100%)`
      : "var(--surface-2)";

  return (
    <div className="flex items-center gap-5">
      <div
        aria-hidden="true"
        className="relative h-28 w-28 shrink-0 rounded-full"
        style={{ background: ring }}
      >
        <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-surface">
          <span className="text-xl font-bold tabular-nums">~{calories}</span>
          <span className="text-[10px] text-muted">cal / serving</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 text-sm">
        <MacroRow color={FAT_COLOR} label="Fat" grams={fatG} />
        <MacroRow color={PROTEIN_COLOR} label="Protein" grams={proteinG} />
        <MacroRow color={CARBS_COLOR} label="Carbs" grams={carbsG} />
        <p className="mt-1 text-xs text-muted">
          Estimated, {servings} serving{servings === 1 ? "" : "s"} total
        </p>
      </div>
    </div>
  );
}

function MacroRow({ color, label, grams }: { color: string; label: string; grams: number }) {
  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-fg">{label}</span>
      <span className="text-muted">~{grams}g</span>
    </div>
  );
}

function ConfirmServingsSheet({
  recipeId,
  defaultServings,
  onClose,
  onComputed,
}: {
  recipeId: string;
  defaultServings: number;
  onClose: () => void;
  onComputed: (nutrition: Nutrition) => void;
}) {
  const [servings, setServings] = useState(defaultServings);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleCalculate() {
    setError(null);
    startTransition(async () => {
      const result = await computeNutrition(recipeId, servings);
      if (result.error || !result.nutrition) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      onComputed(result.nutrition);
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
        aria-label="Calculate nutrition"
        className="relative flex w-full flex-col rounded-t-2xl bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Calculate nutrition</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-xl text-muted transition-colors hover:bg-surface-2"
          >
            ×
          </button>
        </div>

        <p className="mb-4 text-sm text-muted">
          How many servings does this recipe make? Nutrition is estimated per
          serving — this doesn&apos;t change the recipe&apos;s own servings field.
        </p>

        <div className="mb-4 flex items-center justify-center rounded-xl bg-surface-2 py-4">
          <QuantityStepper
            value={servings}
            unit="servings"
            min={1}
            label="Servings for nutrition calculation"
            onChange={(next) => setServings(Math.min(50, Math.max(1, next)))}
          />
        </div>

        {error && (
          <p role="alert" className="mb-3 text-sm text-danger">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleCalculate}
          disabled={pending}
          className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50"
        >
          {pending ? "Calculating…" : error ? "Try again" : "Calculate"}
        </button>
      </div>
    </div>
  );
}
