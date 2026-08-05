"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { BookOpen, ChevronLeft, Search, Sparkles } from "lucide-react";
import type { MealSlot } from "@/lib/constants";
import { searchRecipes } from "@/lib/match";
import type { RecipeListItem } from "./RecipeList";
import { suggestMealsForSlot } from "@/app/actions/mealPlans";
import type { MealSuggestion } from "@/lib/mealSuggest";

// Real-life frequent answers, one tap each — the whole point of these is
// that a preset tap *is* the save, no second confirmation needed. Free text
// still needs a deliberate Save tap, since "review before it lands" applies
// to anything not explicitly chosen from a fixed list.
const PRESETS = ["Leftovers", "Takeout", "Eating out"] as const;

/**
 * Fill (or clear) one meal slot. Three ways in, per the Meal Plan plan:
 * quick presets, a recipe picker, and AI suggestions grounded in the real
 * inventory. The recipe picker is real (M2); AI suggestions still point at
 * "coming soon" until M4 lands, same pattern the Recipes import chooser
 * used for photo/link import before they were built.
 */
export function SlotEditSheet({
  dayLabel,
  slot,
  currentTitle,
  currentRecipeId,
  recipes,
  onClose,
  onSave,
  onClear,
}: {
  dayLabel: string;
  slot: MealSlot;
  currentTitle: string;
  currentRecipeId: string | null;
  recipes: RecipeListItem[];
  onClose: () => void;
  onSave: (title: string, recipeId?: string | null) => void;
  onClear: () => void;
}) {
  const [customTitle, setCustomTitle] = useState(currentTitle);
  const [view, setView] = useState<"main" | "pickRecipe" | "askAi">("main");
  const [recipeQuery, setRecipeQuery] = useState("");

  const [suggestions, setSuggestions] = useState<MealSuggestion[]>([]);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggesting, startSuggesting] = useTransition();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (view === "main") onClose();
        else setView("main");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, view]);

  function askAi() {
    setView("askAi");
    setSuggestError(null);
    startSuggesting(async () => {
      const result = await suggestMealsForSlot(slot);
      if (result.error) {
        setSuggestError(result.error);
        setSuggestions([]);
      } else {
        setSuggestions(result.suggestions ?? []);
      }
    });
  }

  function handleSaveCustom() {
    const trimmed = customTitle.trim();
    if (!trimmed) return;
    onSave(trimmed, null);
  }

  const rankedRecipes = recipeQuery.trim()
    ? searchRecipes(recipeQuery, recipes)
    : [...recipes].sort((a, b) => a.title.localeCompare(b.title));

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
            {view !== "main" ? (
              <button
                type="button"
                onClick={() => setView("main")}
                className="flex min-h-11 items-center gap-1 -ml-1 text-lg font-semibold"
              >
                <ChevronLeft aria-hidden="true" size={20} />
                {view === "pickRecipe" ? "Pick a recipe" : "What can I make?"}
              </button>
            ) : (
              <>
                <h2 className="text-lg font-semibold">{slot}</h2>
                <p className="text-sm text-muted">{dayLabel}</p>
              </>
            )}
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

        {view === "pickRecipe" ? (
          <div className="flex flex-col gap-3">
            <label className="relative block">
              <Search
                aria-hidden="true"
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                type="text"
                value={recipeQuery}
                onChange={(event) => setRecipeQuery(event.target.value)}
                placeholder="Search your recipes…"
                autoComplete="off"
                className="min-h-12 w-full rounded-xl bg-surface-2 pl-10 pr-4 text-base outline-none placeholder:text-muted"
              />
            </label>

            <div className="flex flex-col gap-1">
              {rankedRecipes.length === 0 ? (
                <p className="px-1 py-6 text-center text-sm text-muted">
                  {recipes.length === 0
                    ? "No recipes saved yet."
                    : "No recipes match that search."}
                </p>
              ) : (
                rankedRecipes.map((recipe) => (
                  <button
                    key={recipe.id}
                    type="button"
                    onClick={() => onSave(recipe.title, recipe.id)}
                    className="flex min-h-12 items-center gap-2 rounded-xl px-3 text-left text-sm font-medium text-fg transition-colors active:bg-surface-2"
                  >
                    <BookOpen aria-hidden="true" size={16} className="shrink-0 text-accent" />
                    <span className="truncate">{recipe.title}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        ) : view === "askAi" ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">
              Ideas from what&apos;s actually in the kitchen, using up
              anything close to going bad.
            </p>

            {suggesting ? (
              <p className="px-1 py-8 text-center text-sm text-muted">
                Looking through the kitchen…
              </p>
            ) : suggestError ? (
              <div className="px-1 py-6 text-center">
                <p className="text-sm text-danger">{suggestError}</p>
                <button
                  type="button"
                  onClick={askAi}
                  className="mt-3 min-h-11 rounded-xl border border-line px-4 text-sm font-semibold transition-colors active:bg-surface-2"
                >
                  Try again
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion.title}-${index}`}
                    type="button"
                    onClick={() =>
                      onSave(
                        suggestion.title,
                        suggestion.kind === "recipe" ? suggestion.recipeId : null,
                      )
                    }
                    className="flex min-h-14 flex-col items-start gap-0.5 rounded-xl border border-line bg-surface-2 px-4 py-3 text-left transition-colors active:bg-line"
                  >
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-fg">
                      {suggestion.kind === "recipe" && (
                        <BookOpen
                          aria-hidden="true"
                          size={14}
                          className="shrink-0 text-accent"
                        />
                      )}
                      {suggestion.title}
                    </span>
                    {suggestion.why && (
                      <span className="text-xs text-muted">{suggestion.why}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {currentRecipeId && (
              <Link
                href={`/kitchen/cooking/recipes/${currentRecipeId}`}
                className="mb-3 flex min-h-9 w-fit items-center gap-1.5 text-sm font-medium text-accent"
              >
                <BookOpen aria-hidden="true" size={15} />
                View recipe
              </Link>
            )}

            <div className="flex flex-col gap-4">
              <div>
                <span className="mb-2 block text-sm text-muted">Quick pick</span>
                <div className="grid grid-cols-3 gap-2">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => onSave(preset, null)}
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
                  onClick={() => setView("pickRecipe")}
                  className="flex min-h-12 items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 text-left text-sm font-medium text-fg transition-colors active:bg-line"
                >
                  <BookOpen aria-hidden="true" size={18} />
                  Pick from your recipes
                </button>
                <button
                  type="button"
                  onClick={askAi}
                  className="flex min-h-12 items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 text-left text-sm font-medium text-fg transition-colors active:bg-line"
                >
                  <Sparkles aria-hidden="true" size={18} />
                  Ask AI what to make
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
          </>
        )}
      </div>
    </div>
  );
}
