import { db } from "@/lib/db";
import { BackLink } from "@/components/BackLink";
import { RecipesBrowser } from "@/components/RecipesBrowser";

export const dynamic = "force-dynamic";

// The header (view toggle, count) and the floating + live in RecipesBrowser,
// a client component — the Cookbooks/All Recipes toggle and its own sheets
// need client state. This page just fetches everything and hands it over.
// See the Recipes v2 plan's C1 (cookbooks) and C2 (tags) phases.
export default async function RecipesPage() {
  const [recipesRaw, cookbooksRaw, tags] = await Promise.all([
    db.recipe.findMany({
      select: {
        id: true,
        title: true,
        ingredients: true,
        tags: { select: { tagId: true } },
      },
    }),
    db.cookbook.findMany({
      select: { id: true, title: true, recipes: { select: { addedAt: true } } },
    }),
    db.tag.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
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

  // tagIds ride along on the All Recipes view's own recipe list so the tag
  // filter chips (RecipesBrowser) can filter client-side without a second
  // fetch — RecipeList itself never looks at this field.
  const recipes = recipesRaw.map((recipe) => ({
    id: recipe.id,
    title: recipe.title,
    ingredients: recipe.ingredients,
    tagIds: recipe.tags.map((t) => t.tagId),
  }));

  return (
    <div className="py-2">
      <BackLink href="/kitchen/cooking" label="Cooking" />
      <RecipesBrowser recipes={recipes} cookbooks={cookbooks} tags={tags} />
    </div>
  );
}
