import { recipeLines } from "@/lib/recipeText";

export type RecipeBodyData = {
  ingredients: string;
  steps: string;
  notes: string | null;
};

/**
 * The read-only guts of a recipe — ingredients, instructions, notes.
 * Shared by the private detail page and the public share page
 * (src/app/share/recipe/[token]/page.tsx), which are otherwise unrelated
 * pages under different root layouts — this is the one piece that has to
 * render identically on both, so it only exists once.
 *
 * The servings/prep/cook/source meta row used to live here too; it moved to
 * RecipeMeta (Recipes v2's C3 redesign) so the private page can place it
 * near the top of the page, ahead of the rating/cookbook/cooked controls,
 * while this stays further down. Both pages render RecipeMeta immediately
 * before this component, so nothing is lost — the split is just about
 * where each page positions the two pieces.
 */
export function RecipeBody({ recipe }: { recipe: RecipeBodyData }) {
  const ingredients = recipeLines(recipe.ingredients);
  const steps = recipeLines(recipe.steps);

  return (
    <>
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
          <h2 className="mb-2 text-lg font-semibold">Instructions</h2>
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
