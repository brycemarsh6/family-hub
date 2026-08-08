import { BackLink } from "@/components/BackLink";
import { RecipeForm } from "@/components/RecipeForm";
import { createRecipe } from "@/app/actions/recipes";

export default async function ManualNewRecipePage({
  searchParams,
}: {
  searchParams: Promise<{ cookbookId?: string }>;
}) {
  const { cookbookId } = await searchParams;
  const backHref = cookbookId
    ? `/kitchen/cooking/recipes/new?cookbookId=${cookbookId}`
    : "/kitchen/cooking/recipes/new";

  return (
    <div className="py-2">
      <BackLink href={backHref} label="Add recipe" />

      <h1 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">
        New recipe
      </h1>

      <RecipeForm
        action={createRecipe}
        submitLabel="Save recipe"
        cookbookId={cookbookId}
      />
    </div>
  );
}
