import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { recipeLines } from "@/lib/recipeText";

export const dynamic = "force-dynamic";

// The /share root layout already sets robots noindex/nofollow, and Next
// merges metadata shallowly (parent keys survive unless a child redefines
// them) — so `robots` is repeated here deliberately, not redundantly. This
// is a public page whose only protection is an unguessable token; a search
// engine indexing one would undo that, and that guarantee shouldn't depend
// on a parent layout nobody edits alongside this file. The title override
// exists because the layout's default reads "Shared recipe".
export const metadata: Metadata = {
  title: "Shared cookbook",
  robots: { index: false, follow: false },
};

/**
 * A shared cookbook — every recipe currently filed in it, readable by
 * anyone holding the link.
 *
 * Same security shape as the shared-recipe page (R4): the token is the
 * entire gate, there's deliberately no session check (this page exists for
 * people outside the household), the lookup is a findUnique on that exact
 * value, and "Stop sharing" nulls it so the same URL stops resolving.
 * The token is 256 bits of crypto randomness — see shareCookbook in
 * src/app/actions/cookbooks.ts.
 *
 * The link follows the book's CURRENT contents rather than a snapshot: this
 * reads the join table live on every request, so a recipe filed in later
 * shows up here. That's deliberate, and CookbookShareSheet says so plainly
 * before anyone creates a link.
 *
 * `select` is explicit rather than fetching whole rows: this page is
 * public, so it hands the renderer exactly the fields meant to be seen and
 * nothing else. Exposed per recipe: title, ingredients, steps, servings.
 * Deliberately NOT exposed: ids, either shareToken, timestamps, and every
 * household-private field the family's own detail page shows — rating,
 * lastCookedAt, tags, cookbook membership, notes, sourceUrl, and the
 * nutrition columns. A cookbook link is a cooking reference for someone
 * outside the house, not a window onto how the family uses the app.
 *
 * The per-recipe markup is written out here rather than reusing RecipeBody
 * (which the single-recipe share page does use). That's deliberate: this
 * page nests many recipes under one h1, so each recipe's own title takes
 * the h2 and its sections need h3 — whereas RecipeBody hardcodes h2 for
 * "Ingredients"/"Instructions", which would flatten the heading order and
 * make the page harder to navigate with a screen reader.
 */
export default async function SharedCookbookPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // A null/empty token must never match a cookbook that simply isn't
  // shared. findUnique on `null` wouldn't match anyway (SQL null
  // comparison), but bailing early makes that guarantee explicit.
  if (!token) notFound();

  const cookbook = await db.cookbook.findUnique({
    where: { shareToken: token },
    select: {
      title: true,
      recipes: {
        orderBy: { addedAt: "asc" },
        select: {
          recipe: {
            select: {
              title: true,
              ingredients: true,
              steps: true,
              servings: true,
            },
          },
        },
      },
    },
  });
  if (!cookbook) notFound();

  const recipes = cookbook.recipes.map((entry) => entry.recipe);

  return (
    <div>
      <h1 className="mb-1 text-3xl font-bold tracking-tight md:text-4xl">
        {cookbook.title}
      </h1>
      <p className="mb-8 text-sm text-muted">
        {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"}
      </p>

      {recipes.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface px-4 py-6 text-center text-muted">
          There aren&apos;t any recipes in this cookbook yet.
        </p>
      ) : (
        <div className="flex flex-col gap-10">
          {recipes.map((recipe, index) => (
            <article key={index}>
              <h2 className="mb-1 text-2xl font-bold tracking-tight">
                {recipe.title}
              </h2>
              {recipe.servings && (
                <p className="mb-3 text-sm text-muted">{recipe.servings}</p>
              )}

              <h3 className="mb-2 mt-4 text-base font-semibold">Ingredients</h3>
              <ul className="flex flex-col gap-2">
                {recipeLines(recipe.ingredients).map((ingredient, i) => (
                  <li
                    key={i}
                    className="rounded-xl border border-line bg-surface px-4 py-3 text-base"
                  >
                    {ingredient}
                  </li>
                ))}
              </ul>

              <h3 className="mb-2 mt-4 text-base font-semibold">Instructions</h3>
              <ol className="flex flex-col gap-2">
                {recipeLines(recipe.steps).map((step, i) => (
                  <li
                    key={i}
                    className="flex gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-base"
                  >
                    <span className="shrink-0 font-semibold text-muted">
                      {i + 1}.
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </div>
      )}

      <p className="mt-10 border-t border-line pt-4 text-sm text-muted">
        Shared from Marshee.
      </p>
    </div>
  );
}
