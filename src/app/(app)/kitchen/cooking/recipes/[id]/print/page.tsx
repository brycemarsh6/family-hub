import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { BackLink } from "@/components/BackLink";
import { RecipeMeta } from "@/components/RecipeMeta";
import { RecipeBody } from "@/components/RecipeBody";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";

/**
 * The print view behind the recipe detail page's ⋯ menu — both "Print" and
 * "Export PDF" land here, since a platform's print dialog already offers
 * "Save as PDF" (see the Recipes v2 plan's C3 decision: they're the same
 * view). Reuses RecipeMeta + RecipeBody wholesale rather than duplicating
 * their markup — this page's only real job is stripping away everything
 * that shouldn't end up on paper.
 *
 * `print:hidden` on the back link and the print button keeps them out of
 * the actual printout; the shared header/bottom nav hide themselves the
 * same way from the root (app) layout.
 */
export default async function RecipePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const recipe = await db.recipe.findUnique({
    where: { id },
    select: {
      title: true,
      ingredients: true,
      steps: true,
      servings: true,
      prepTime: true,
      cookTime: true,
      sourceUrl: true,
      notes: true,
    },
  });
  if (!recipe) notFound();

  return (
    <div className="py-2">
      <div className="print:hidden mb-4 flex items-center justify-between gap-3">
        <BackLink href={`/kitchen/cooking/recipes/${id}`} label={recipe.title} />
        <PrintButton />
      </div>

      <h1 className="mb-2 text-2xl font-bold tracking-tight md:text-3xl">
        {recipe.title}
      </h1>

      <RecipeMeta recipe={recipe} />
      <RecipeBody recipe={recipe} />
    </div>
  );
}
