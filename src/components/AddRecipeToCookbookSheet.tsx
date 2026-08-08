"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { searchRecipes } from "@/lib/match";
import type { RecipeListItem } from "./RecipeList";
import { addRecipeToCookbook } from "@/app/actions/cookbooks";

/**
 * The cookbook detail page's "Add recipe" sheet — the two ways in, per the
 * Recipes v2 plan's C1 phase: pick an existing recipe from the library (a
 * search picker over everything not already filed here, the same one-tap-
 * to-add shape M2's SlotEditSheet recipe picker established), or jump to
 * the familiar 4-way import chooser to bring in something new, which lands
 * in this cookbook automatically via the ?cookbookId= it carries.
 */
export function AddRecipeToCookbookSheet({
  cookbookId,
  candidates,
  onAdded,
  onClose,
}: {
  cookbookId: string;
  /** Recipes not already in this cookbook — the page filters this down
   * before passing it in, so nothing already-filed shows up as pickable. */
  candidates: RecipeListItem[];
  onAdded: (recipe: RecipeListItem) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const ranked = query.trim()
    ? searchRecipes(query, candidates)
    : [...candidates].sort((a, b) => a.title.localeCompare(b.title));

  function handleAdd(recipe: RecipeListItem) {
    setAddingId(recipe.id);
    startTransition(async () => {
      await addRecipeToCookbook(cookbookId, recipe.id);
      onAdded(recipe);
      setAddingId(null);
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
        aria-label="Add recipe"
        className="relative flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg md:max-w-md md:rounded-2xl"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add recipe</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-xl text-muted transition-colors hover:bg-surface-2"
          >
            ×
          </button>
        </div>

        <Link
          href={`/kitchen/cooking/recipes/new?cookbookId=${cookbookId}`}
          className="mb-3 flex min-h-12 items-center gap-2 rounded-xl border border-line bg-surface-2 px-4 text-base font-medium text-fg transition-colors active:bg-line"
        >
          <Plus aria-hidden="true" size={18} className="text-accent" />
          Import or type a new recipe
        </Link>

        <label className="relative mb-2 block">
          <Search
            aria-hidden="true"
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search your recipes…"
            autoComplete="off"
            className="min-h-12 w-full rounded-xl bg-surface-2 pl-10 pr-4 text-base outline-none placeholder:text-muted"
          />
        </label>

        <div className="flex flex-col gap-1">
          {ranked.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-muted">
              {candidates.length === 0
                ? "Every recipe is already in this cookbook."
                : "No recipes match that search."}
            </p>
          ) : (
            ranked.map((recipe) => (
              <button
                key={recipe.id}
                type="button"
                onClick={() => handleAdd(recipe)}
                disabled={addingId === recipe.id}
                className="flex min-h-12 items-center justify-between gap-3 rounded-xl px-3 text-left text-sm font-medium text-fg transition-colors active:bg-surface-2 disabled:opacity-50"
              >
                <span className="truncate">{recipe.title}</span>
                <span className="shrink-0 text-xs text-accent">
                  {addingId === recipe.id ? "Adding…" : "Add"}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
