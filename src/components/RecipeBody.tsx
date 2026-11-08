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
 * near the top of the page, while this stays further down.
 *
 * Each of the three sections is also exported on its own (mission 51, L5).
 * Rendered whole by the share page and the print page; the private detail
 * page places the three sections itself. This component just composes them
 * in the old order, so the share and print pages render exactly what they
 * did before.
 */
export function RecipeIngredientsSection({ ingredients }: { ingredients: string }) {
  const lines = recipeLines(ingredients);
  if (lines.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-2 text-lg font-semibold">Ingredients</h2>
      <ul className="flex flex-col gap-2">
        {lines.map((ingredient, index) => (
          <li
            key={index}
            className="rounded-xl border border-line bg-surface px-4 py-3 text-base"
          >
            {ingredient}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RecipeStepsSection({ steps }: { steps: string }) {
  const lines = recipeLines(steps);
  if (lines.length === 0) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-2 text-lg font-semibold">Instructions</h2>
      <ol className="flex flex-col gap-2">
        {lines.map((step, index) => (
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
  );
}

export function RecipeNotesSection({ notes }: { notes: string | null }) {
  if (!notes) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-2 text-lg font-semibold">Notes</h2>
      <p className="whitespace-pre-wrap rounded-xl border border-line bg-surface px-4 py-3 text-base text-muted">
        {notes}
      </p>
    </section>
  );
}

export function RecipeBody({ recipe }: { recipe: RecipeBodyData }) {
  return (
    <>
      <RecipeIngredientsSection ingredients={recipe.ingredients} />
      <RecipeStepsSection steps={recipe.steps} />
      <RecipeNotesSection notes={recipe.notes} />
    </>
  );
}
