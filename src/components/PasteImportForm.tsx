"use client";

import { useState, useTransition } from "react";
import { RecipeForm, type RecipeFormDefaults } from "./RecipeForm";
import { createRecipe, extractRecipeFromPastedText } from "@/app/actions/recipes";

/**
 * Paste-text import: a textarea and an Extract button until Claude returns
 * something, then the same RecipeForm every other path uses — pre-filled,
 * fully editable, nothing written to the database until Save is tapped.
 */
export function PasteImportForm({ cookbookId }: { cookbookId?: string }) {
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<RecipeFormDefaults | null>(null);
  // Bumped on every successful extraction so RecipeForm remounts — its
  // inputs are uncontrolled (defaultValue), so a fresh key is what makes a
  // second extraction actually replace what's on screen.
  const [version, setVersion] = useState(0);

  function handleExtract() {
    setError(null);
    startTransition(async () => {
      const result = await extractRecipeFromPastedText(text);
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
        sourceUrl: "",
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
        <span className="mb-1 block">Recipe text</span>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={14}
          placeholder="Paste here…"
          className="w-full resize-y rounded-xl bg-surface-2 px-4 py-3 text-base outline-none placeholder:text-muted"
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
        onClick={handleExtract}
        disabled={isPending || !text.trim()}
        className="min-h-12 w-full rounded-xl bg-accent text-base font-semibold text-accent-fg transition-opacity active:opacity-80 disabled:opacity-50"
      >
        {isPending ? "Extracting…" : "Extract recipe"}
      </button>
    </div>
  );
}
