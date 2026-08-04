import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { db } from "@/lib/db";
import { deleteRecipe } from "@/app/actions/recipes";
import { RecipeBody } from "@/components/RecipeBody";
import { ShareRecipeControls } from "@/components/ShareRecipeControls";

export const dynamic = "force-dynamic";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = await db.recipe.findUnique({ where: { id } });
  if (!recipe) notFound();

  return (
    <div className="py-2">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          {recipe.title}
        </h1>
        <Link
          href={`/kitchen/cooking/recipes/${recipe.id}/edit`}
          aria-label="Edit recipe"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line bg-surface transition-colors active:bg-surface-2"
        >
          <Pencil aria-hidden="true" size={20} />
        </Link>
      </div>

      <RecipeBody recipe={recipe} />

      <ShareRecipeControls
        recipeId={recipe.id}
        title={recipe.title}
        ingredients={recipe.ingredients}
        steps={recipe.steps}
        initialShareToken={recipe.shareToken}
      />

      <form action={deleteRecipe} className="border-t border-line pt-4">
        <input type="hidden" name="id" value={recipe.id} />
        <button
          type="submit"
          className="min-h-11 w-full rounded-xl text-sm font-medium text-danger transition-colors hover:bg-surface-2"
        >
          Delete recipe
        </button>
      </form>
    </div>
  );
}
