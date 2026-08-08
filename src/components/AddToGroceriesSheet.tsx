"use client";

import { useEffect, useState, useTransition } from "react";
import { Check } from "lucide-react";
import {
  classifyRecipeIngredients,
  addIngredientsToGroceries,
  type RecipeIngredientSuggestion,
} from "@/app/actions/groceries";

/**
 * "Add to groceries": read the recipe's ingredients, work out what the house
 * is actually missing, and let a human confirm before anything lands on the
 * shopping list.
 *
 * Suggest, never auto-add — the Recipes v2 plan's decision, and the reason
 * the flow has a review step at all. Two guesses stack here (a model reading
 * free-text ingredient lines, then a fuzzy matcher checking them against 477
 * real inventory rows), so both get shown rather than trusted: every row
 * names the recipe line it came from, and anything the house already has is
 * listed too, unticked, in case the matcher is wrong.
 *
 * Rows start ticked only when the item looks genuinely missing. Already
 * stocked or already written down starts unticked but stays tappable.
 */
export function AddToGroceriesSheet({
  recipeId,
  onClose,
}: {
  recipeId: string;
  onClose: () => void;
}) {
  const [suggestions, setSuggestions] = useState<RecipeIngredientSuggestion[] | null>(
    null,
  );
  const [chosen, setChosen] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [addedCount, setAddedCount] = useState<number | null>(null);
  const [loading, startLoading] = useTransition();
  const [saving, startSaving] = useTransition();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Classify once, when the sheet opens. Read-only — see
  // classifyRecipeIngredients; nothing is written until "Add" below.
  useEffect(() => {
    startLoading(async () => {
      const result = await classifyRecipeIngredients(recipeId);
      if (result.error || !result.suggestions) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      setSuggestions(result.suggestions);
      setChosen(
        new Set(
          result.suggestions
            .map((item, index) => (item.status === "missing" ? index : -1))
            .filter((index) => index >= 0),
        ),
      );
    });
  }, [recipeId]);

  function toggle(index: number) {
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function handleAdd() {
    if (!suggestions) return;
    setError(null);

    const confirmed = [...chosen]
      .sort((a, b) => a - b)
      .map((index) => suggestions[index])
      .map((item) => ({
        name: item.name,
        category: item.category,
        pantryItemId: item.pantryItemId,
      }));

    startSaving(async () => {
      const result = await addIngredientsToGroceries(confirmed);
      if (result.error) {
        setError(result.error);
        return;
      }
      setAddedCount(result.added ?? 0);
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Close without adding anything"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add to groceries"
        className="relative flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {addedCount !== null ? "Added to the list" : "Add to groceries"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close without adding anything"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-xl text-muted transition-colors hover:bg-surface-2"
          >
            ×
          </button>
        </div>

        {addedCount !== null ? (
          <div className="flex flex-col gap-4">
            <p className="rounded-xl bg-accent-soft px-4 py-3 text-base font-medium text-accent">
              {addedCount === 0
                ? "Nothing added."
                : `${addedCount} ${addedCount === 1 ? "item" : "items"} added to the shopping list.`}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80"
            >
              Done
            </button>
          </div>
        ) : loading ? (
          <p className="px-1 py-8 text-center text-sm text-muted">
            Checking what you already have…
          </p>
        ) : error ? (
          <div className="px-1 py-6 text-center">
            <p className="text-sm text-danger">{error}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 min-h-11 rounded-xl border border-line px-4 text-sm font-semibold transition-colors active:bg-surface-2"
            >
              Close
            </button>
          </div>
        ) : suggestions ? (
          <>
            <p className="mb-3 text-sm text-muted">
              Ticked items go on the shopping list. Things you already have are
              listed too, in case we got it wrong.
            </p>

            <div className="flex flex-col gap-1">
              {suggestions.map((item, index) => {
                const picked = chosen.has(index);
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => toggle(index)}
                    aria-pressed={picked}
                    className="flex min-h-14 items-center gap-3 rounded-xl px-2 text-left transition-colors active:bg-surface-2"
                  >
                    <span
                      aria-hidden="true"
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                        picked ? "border-accent bg-accent text-accent-fg" : "border-line"
                      }`}
                    >
                      {picked && <Check size={14} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-medium">{item.name}</span>
                      <span className="block truncate text-xs text-muted">
                        {item.status === "in-pantry"
                          ? `You have ${item.matchedName}`
                          : item.status === "on-list"
                            ? "Already on the list"
                            : item.line}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleAdd}
              disabled={saving || chosen.size === 0}
              className="mt-4 min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-40"
            >
              {saving
                ? "Adding…"
                : chosen.size === 0
                  ? "Nothing selected"
                  : `Add ${chosen.size} to the list`}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
