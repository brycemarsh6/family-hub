"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Library } from "lucide-react";
import { RecipeCookbookPickSheet, type CookbookOption } from "./RecipeCookbookPickSheet";
import { addRecipeToCookbook, removeRecipeFromCookbook } from "@/app/actions/cookbooks";

/**
 * Cookbook chips on the recipe detail page, plus the Edit entry point into
 * RecipeCookbookPickSheet — files/unfiles this recipe from the recipe's own
 * side, reusing C1's addRecipeToCookbook/removeRecipeFromCookbook. Unlike
 * tag chips (which have no page of their own), cookbook chips are real
 * links through to that cookbook's page.
 */
export function RecipeCookbooksSection({
  recipeId,
  initialCookbooks,
  allCookbooks,
}: {
  recipeId: string;
  initialCookbooks: CookbookOption[];
  allCookbooks: CookbookOption[];
}) {
  const [cookbooks, setCookbooks] = useState(initialCookbooks);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [, startTransition] = useTransition();

  function handleToggle(cookbook: CookbookOption) {
    const isSelected = cookbooks.some((c) => c.id === cookbook.id);
    if (isSelected) {
      setCookbooks((prev) => prev.filter((c) => c.id !== cookbook.id));
      startTransition(async () => {
        await removeRecipeFromCookbook(cookbook.id, recipeId);
      });
    } else {
      setCookbooks((prev) => [...prev, cookbook]);
      startTransition(async () => {
        await addRecipeToCookbook(cookbook.id, recipeId);
      });
    }
  }

  return (
    <section className="mb-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Cookbooks</h2>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex min-h-9 items-center gap-1.5 text-sm font-medium text-accent"
        >
          <Library aria-hidden="true" size={15} />
          {cookbooks.length === 0 ? "Add to cookbook" : "Edit"}
        </button>
      </div>

      {cookbooks.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {cookbooks.map((cookbook) => (
            <Link
              key={cookbook.id}
              href={`/kitchen/cooking/recipes/cookbooks/${cookbook.id}`}
              className="flex min-h-11 items-center rounded-full bg-surface-2 px-3 text-sm font-medium text-fg transition-colors active:bg-line"
            >
              {cookbook.title}
            </Link>
          ))}
        </div>
      )}

      {sheetOpen && (
        <RecipeCookbookPickSheet
          selectedCookbookIds={cookbooks.map((c) => c.id)}
          allCookbooks={allCookbooks}
          onToggle={handleToggle}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </section>
  );
}
