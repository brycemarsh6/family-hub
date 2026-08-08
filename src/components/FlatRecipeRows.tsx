import { RecipeRow, type RecipeListItem } from "./RecipeList";
import { EmptyState } from "./EmptyState";

/**
 * A flat, already-filtered/sorted list of recipe rows — no A-Z grouping, no
 * rail, no internal search box. That's deliberate: once the cookbook page
 * has a full filter/sort bar (Recipes v2's C4 phase), "browse alphabetically"
 * stops being the primary interaction — you're querying a smaller,
 * already-scoped collection, not browsing the whole library the way All
 * Recipes still does (RecipeList, unchanged, keeps its rail there).
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
  if (recipes.length === 0) {
    return <EmptyState emoji={emptyEmoji} title={emptyTitle} hint={emptyHint} />;
  }

  return (
    <ul className="space-y-2">
      {recipes.map((recipe) => (
        <RecipeRow key={recipe.id} recipe={recipe} onRemove={onRemove} />
      ))}
    </ul>
  );
}
