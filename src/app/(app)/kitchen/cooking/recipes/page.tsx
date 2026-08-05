import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { BackLink } from "@/components/BackLink";
import { RecipeList } from "@/components/RecipeList";

export const dynamic = "force-dynamic";

// The header (title, count, New button) stays server-rendered here; the A-Z
// rail, search, and grouped/flat list all need client state, so that part
// lives in RecipeList. Same split as PantryPage/PantryList.
export default async function RecipesPage() {
  const recipes = await db.recipe.findMany({
    select: { id: true, title: true, ingredients: true },
  });

  return (
    <div className="py-2">
      <BackLink href="/kitchen/cooking" label="Cooking" />

      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Recipes
          </h1>
          <p className="mt-1 text-sm text-muted">
            {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"}
          </p>
        </div>
        <Link
          href="/kitchen/cooking/recipes/new"
          className="flex min-h-12 shrink-0 items-center gap-1.5 rounded-xl bg-accent px-4 text-base font-semibold text-accent-fg transition-opacity active:opacity-80"
        >
          <Plus aria-hidden="true" size={20} />
          New
        </Link>
      </div>

      <RecipeList recipes={recipes} />
    </div>
  );
}
