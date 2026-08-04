import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Clock, Users, ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { deleteRecipe } from "@/app/actions/recipes";

export const dynamic = "force-dynamic";

/** Splits a newline-separated field into trimmed, non-empty lines. */
function lines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = await db.recipe.findUnique({ where: { id } });
  if (!recipe) notFound();

  const ingredients = lines(recipe.ingredients);
  const steps = lines(recipe.steps);
  const meta = [
    recipe.servings && { icon: Users, label: recipe.servings },
    recipe.prepTime && { icon: Clock, label: `Prep ${recipe.prepTime}` },
    recipe.cookTime && { icon: Clock, label: `Cook ${recipe.cookTime}` },
  ].filter(Boolean) as { icon: typeof Users; label: string }[];

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

      {meta.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          {meta.map(({ icon: Icon, label }, index) => (
            <span key={index} className="flex items-center gap-1.5">
              <Icon aria-hidden="true" size={16} />
              {label}
            </span>
          ))}
        </div>
      )}

      {recipe.sourceUrl && (
        <a
          href={recipe.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-4 flex items-center gap-1.5 text-sm text-accent underline underline-offset-2"
        >
          <ExternalLink aria-hidden="true" size={14} />
          Source
        </a>
      )}

      {ingredients.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-lg font-semibold">Ingredients</h2>
          <ul className="flex flex-col gap-2">
            {ingredients.map((ingredient, index) => (
              <li
                key={index}
                className="rounded-xl border border-line bg-surface px-4 py-3 text-base"
              >
                {ingredient}
              </li>
            ))}
          </ul>
        </section>
      )}

      {steps.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-lg font-semibold">Steps</h2>
          <ol className="flex flex-col gap-2">
            {steps.map((step, index) => (
              <li
                key={index}
                className="flex gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-base"
              >
                <span className="shrink-0 font-semibold text-muted">
                  {index + 1}.
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {recipe.notes && (
        <section className="mb-6">
          <h2 className="mb-2 text-lg font-semibold">Notes</h2>
          <p className="whitespace-pre-wrap rounded-xl border border-line bg-surface px-4 py-3 text-base text-muted">
            {recipe.notes}
          </p>
        </section>
      )}

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
