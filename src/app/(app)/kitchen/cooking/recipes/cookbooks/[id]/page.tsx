import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CookbookDetail } from "@/components/CookbookDetail";

export const dynamic = "force-dynamic";

export default async function CookbookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [cookbook, allRecipes] = await Promise.all([
    db.cookbook.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        recipes: {
          select: { recipe: { select: { id: true, title: true, ingredients: true } } },
        },
      },
    }),
    // The add-sheet's "pick from your recipes" picker needs the full
    // library to search over; the page filters out what's already filed.
    db.recipe.findMany({ select: { id: true, title: true, ingredients: true } }),
  ]);

  if (!cookbook) notFound();

  return (
    <CookbookDetail
      cookbookId={cookbook.id}
      initialTitle={cookbook.title}
      initialRecipes={cookbook.recipes.map((entry) => entry.recipe)}
      allRecipes={allRecipes}
    />
  );
}
