import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { db } from "@/lib/db";
import { deleteRecipe } from "@/app/actions/recipes";
import { BackLink } from "@/components/BackLink";
import { RecipeBody } from "@/components/RecipeBody";
import { RecipeTagsSection } from "@/components/RecipeTagsSection";
import { ShareRecipeControls } from "@/components/ShareRecipeControls";

export const dynamic = "force-dynamic";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [recipe, allTagsRaw] = await Promise.all([
    db.recipe.findUnique({
      where: { id },
      include: { tags: { select: { tag: { select: { id: true, name: true } } } } },
    }),
    // The full vocabulary, with a recipe count on each — cheap at household
    // scale, and it's what lets the delete-tag confirm show a real count
    // without a second round trip mid-interaction.
    db.tag.findMany({
      select: { id: true, name: true, _count: { select: { recipes: true } } },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!recipe) notFound();

  const allTags = allTagsRaw.map((tag) => ({
    id: tag.id,
    name: tag.name,
    recipeCount: tag._count.recipes,
  }));
  const recipeTags = recipe.tags.map(({ tag }) => {
    const withCount = allTags.find((t) => t.id === tag.id);
    return withCount ?? { id: tag.id, name: tag.name, recipeCount: 1 };
  });

  return (
    <div className="py-2">
      <BackLink href="/kitchen/cooking/recipes" label="Recipes" />

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

      <RecipeTagsSection recipeId={recipe.id} initialTags={recipeTags} allTags={allTags} />

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
