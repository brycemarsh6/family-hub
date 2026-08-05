import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { BackLink } from "@/components/BackLink";
import { RecipeForm } from "@/components/RecipeForm";
import { updateRecipe } from "@/app/actions/recipes";

export const dynamic = "force-dynamic";

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = await db.recipe.findUnique({ where: { id } });
  if (!recipe) notFound();

  return (
    <div className="py-2">
      <BackLink
        href={`/kitchen/cooking/recipes/${recipe.id}`}
        label={recipe.title}
      />

      <h1 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">
        Edit recipe
      </h1>

      <RecipeForm
        action={updateRecipe}
        submitLabel="Save changes"
        defaultValues={{
          id: recipe.id,
          title: recipe.title,
          ingredients: recipe.ingredients,
          steps: recipe.steps,
          servings: recipe.servings ?? "",
          prepTime: recipe.prepTime ?? "",
          cookTime: recipe.cookTime ?? "",
          sourceUrl: recipe.sourceUrl ?? "",
          notes: recipe.notes ?? "",
        }}
      />
    </div>
  );
}
