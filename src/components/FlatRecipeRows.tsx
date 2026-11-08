"use client";

import { useRef } from "react";
import { columnCountFor, splitByWeight } from "@/lib/splitColumns";
import { useContainerWidth } from "@/lib/useContainerWidth";
import { RecipeRow, type RecipeListItem } from "./RecipeList";
import { EmptyState } from "./EmptyState";

/**
 * A flat, already-filtered/sorted list of recipe rows — no A-Z grouping, no
 * rail, no internal search box. That's deliberate: once the cookbook page
 * has a full filter/sort bar (Recipes v2's C4 phase), "browse alphabetically"
 * stops being the primary interaction — you're querying a smaller,
 * already-scoped collection, not browsing the whole library the way All
 * Recipes still does (RecipeList, unchanged, keeps its rail there).
 *
 * On wide pages the rows sit in up to 3 columns. The split is decided from
 * the order and the row count only (src/lib/splitColumns.ts), not by CSS
 * `columns`, which balances by height and would shuffle rows between columns.
 */
export function FlatRecipeRows({
  recipes,
  onRemove,
  emptyEmoji = "🔍",
  emptyTitle = "No matches",
  emptyHint = "Try different filters.",
}: {
  recipes: RecipeListItem[];
  onRemove?: (recipeId: string) => void;
  emptyEmoji?: string;
  emptyTitle?: string;
  emptyHint?: string;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const columns = columnCountFor(useContainerWidth(gridRef), 3);

  // The ref div is always rendered so the width is measured even while the
  // list is empty and a filter later fills it.
  return (
    <div ref={gridRef}>
      {recipes.length === 0 ? (
        <EmptyState emoji={emptyEmoji} title={emptyTitle} hint={emptyHint} />
      ) : (
        <div
          className="grid items-start gap-x-4"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {splitByWeight(recipes, columns, () => 1).map((column, i) => (
            <ul key={i} className="space-y-2">
              {column.map((recipe) => (
                <RecipeRow key={recipe.id} recipe={recipe} onRemove={onRemove} />
              ))}
            </ul>
          ))}
        </div>
      )}
    </div>
  );
}
