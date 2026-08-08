import { db } from "@/lib/db";
import { BackLink } from "@/components/BackLink";
import { RecipesBrowser } from "@/components/RecipesBrowser";

export const dynamic = "force-dynamic";

// The header (view toggle, count) and the floating + live in RecipesBrowser,
// a client component — the Cookbooks/All Recipes toggle and its own sheets
// need client state. This page just fetches both and hands them over. See
// the Recipes v2 plan's C1 phase.
export default async function RecipesPage() {
  const [recipes, cookbooksRaw] = await Promise.all([
    db.recipe.findMany({
      select: { id: true, title: true, ingredients: true },
    }),
    db.cookbook.findMany({
      select: { id: true, title: true, recipes: { select: { addedAt: true } } },
    }),
  ]);

  // "Most recent" for a cookbook means "when was a recipe last filed into
  // it" (CookbookRecipe.addedAt), not the cookbook row's own updatedAt —
  // see the schema comment on CookbookRecipe.addedAt for why those differ.
  const cookbooks = cookbooksRaw.map((cookbook) => ({
    id: cookbook.id,
    title: cookbook.title,
    count: cookbook.recipes.length,
    mostRecentAddedAt:
      cookbook.recipes.length > 0
        ? new Date(Math.max(...cookbook.recipes.map((r) => r.addedAt.getTime())))
        : null,
  }));

  return (
    <div className="py-2">
      <BackLink href="/kitchen/cooking" label="Cooking" />
      <RecipesBrowser recipes={recipes} cookbooks={cookbooks} />
    </div>
  );
}
