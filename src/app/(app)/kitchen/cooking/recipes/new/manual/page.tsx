import { BackLink } from "@/components/BackLink";
import { RecipeForm } from "@/components/RecipeForm";
import { createRecipe } from "@/app/actions/recipes";

export default function ManualNewRecipePage() {
  return (
    <div className="py-2">
      <BackLink href="/kitchen/cooking/recipes/new" label="Add recipe" />

      <h1 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">
        New recipe
      </h1>

      <RecipeForm action={createRecipe} submitLabel="Save recipe" />
    </div>
  );
}
