"use client";

import { useState, useTransition } from "react";
import { RecipeForm, type RecipeFormDefaults } from "./RecipeForm";
import { createRecipe, importRecipeFromLink } from "@/app/actions/recipes";

/**
 * Link import: paste a URL, fetch it server-side, and pre-fill RecipeForm —
 * from a TikTok caption, a blog's own schema.org data, a Pinterest pin's
 * outbound link, or (last resort) Claude reading the stripped page text.
 * The flakiest import path, so failures always name a specific next step
 * rather than dead-ending.
 */
export function LinkImportForm({ cookbookId }: { cookbookId?: string }) {
  const [url, setUrl] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<RecipeFormDefaults | null>(null);
  // Bumped on every successful import so RecipeForm remounts — see the same
  // note in PasteImportForm about uncontrolled inputs.
  const [version, setVersion] = useState(0);

  function handleImport() {
    setError(null);
    startTransition(async () => {
      const result = await importRecipeFromLink(url);
      if (result.error || !result.data) {
        setError(result.error ?? "Something went wrong. Try again.");
        return;
      }
      setExtracted({
        title: result.data.title,
        ingredients: result.data.ingredients.join("\n"),
        steps: result.data.steps.join("\n"),
        servings: result.data.servings,
        prepTime: result.data.prepTime,
        cookTime: result.data.cookTime,
        // The resolved source (a Pinterest pin's outbound link, not the
        // pin itself) beats the raw pasted URL when the two differ.
        sourceUrl: result.sourceUrl ?? url.trim(),
        notes: "",
      });
      setVersion((v) => v + 1);
    });
  }

  if (extracted) {
    return (
      <div>
        <p className="mb-4 rounded-xl bg-accent-soft px-4 py-3 text-base font-medium text-accent">
          Extracted — review and edit before saving.
        </p>
        <RecipeForm
          key={version}
          action={createRecipe}
          submitLabel="Save recipe"
          defaultValues={extracted}
          cookbookId={cookbookId}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="block text-sm text-muted">
        <span className="mb-1 block">Recipe link</span>
        <input
          type="url"
          inputMode="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://…"
          autoComplete="off"
          className="min-h-12 w-full rounded-xl bg-surface-2 px-4 text-base outline-none placeholder:text-muted"
        />
      </label>

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn"
        >
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleImport}
        disabled={isPending || !url.trim()}
        className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50"
      >
        {isPending ? "Fetching…" : "Import recipe"}
      </button>
    </div>
  );
}
