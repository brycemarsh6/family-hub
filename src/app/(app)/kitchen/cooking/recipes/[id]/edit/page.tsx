import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
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
      <Link
        href={`/kitchen/cooking/recipes/${recipe.id}`}
        className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        {recipe.title}
      </Link>

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
