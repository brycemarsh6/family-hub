import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { RecipeBody } from "@/components/RecipeBody";

export const dynamic = "force-dynamic";

/**
 * A single shared recipe, readable by anyone holding the link.
 *
 * The token is the entire gate. There's no session check here on purpose —
 * this page exists for people outside the household — so the security
 * properties come from elsewhere: the token is 256 bits of crypto
 * randomness (see shareRecipe in actions/recipes.ts), the lookup is a
 * findUnique on that exact value, and "Stop sharing" nulls it so the same
 * URL stops resolving.
 *
 * `select` is explicit rather than fetching the whole row: this page is
 * public, so it should hand the renderer exactly the fields meant to be
 * seen and nothing else — no id, no shareToken, no timestamps.
 */
export default async function SharedRecipePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // A null/empty token must never match a recipe that simply isn't shared.
  // findUnique on `null` wouldn't match anyway (SQL null comparison), but
  // bailing early makes that guarantee explicit rather than incidental.
  if (!token) notFound();

  const recipe = await db.recipe.findUnique({
    where: { shareToken: token },
    select: {
      title: true,
      ingredients: true,
      steps: true,
      servings: true,
      prepTime: true,
      cookTime: true,
      sourceUrl: true,
      notes: true,
    },
  });
  if (!recipe) notFound();

  return (
    <div>
      <h1 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
        {recipe.title}
      </h1>

      <RecipeBody recipe={recipe} />

      <p className="mt-8 border-t border-line pt-4 text-sm text-muted">
        Shared from Marsh HQ.
      </p>
    </div>
  );
}
