import { Clock, Users, ExternalLink } from "lucide-react";
import { recipeLines } from "@/lib/recipeText";

export type RecipeBodyData = {
  ingredients: string;
  steps: string;
  servings: string | null;
  prepTime: string | null;
  cookTime: string | null;
  sourceUrl: string | null;
  notes: string | null;
};

/**
 * The read-only guts of a recipe — meta row, source link, ingredients,
 * steps, notes. Shared by the private detail page and the public share
 * page (src/app/share/recipe/[token]/page.tsx), which are otherwise
 * unrelated pages under different root layouts — this is the one piece
 * that has to render identically on both, so it only exists once.
 */
export function RecipeBody({ recipe }: { recipe: RecipeBodyData }) {
  const ingredients = recipeLines(recipe.ingredients);
  const steps = recipeLines(recipe.steps);
  const meta = [
    recipe.servings && { icon: Users, label: recipe.servings },
    recipe.prepTime && { icon: Clock, label: `Prep ${recipe.prepTime}` },
    recipe.cookTime && { icon: Clock, label: `Cook ${recipe.cookTime}` },
  ].filter(Boolean) as { icon: typeof Users; label: string }[];

  return (
    <>
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
    </>
  );
}
