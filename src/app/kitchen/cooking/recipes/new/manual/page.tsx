import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RecipeForm } from "@/components/RecipeForm";
import { createRecipe } from "@/app/actions/recipes";

export default function ManualNewRecipePage() {
  return (
    <div className="py-2">
      <Link
        href="/kitchen/cooking/recipes/new"
        className="mb-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Add recipe
      </Link>

      <h1 className="mb-4 text-2xl font-bold tracking-tight md:text-3xl">
        New recipe
      </h1>

      <RecipeForm action={createRecipe} submitLabel="Save recipe" />
    </div>
  );
}
