import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { RecipeDetailHeader } from "@/components/RecipeDetailHeader";
import { RecipeHero } from "@/components/RecipeHero";
import { RecipeActionCircles } from "@/components/RecipeActionCircles";
import { RecipeMeta } from "@/components/RecipeMeta";
import { RecipeCookbooksSection } from "@/components/RecipeCookbooksSection";
import { RecipeStars } from "@/components/RecipeStars";
import { RecipeCookedButton } from "@/components/RecipeCookedButton";
import { RecipeBody } from "@/components/RecipeBody";
import { NutritionPlaceholder } from "@/components/NutritionPlaceholder";
import { RecipeTagsSection } from "@/components/RecipeTagsSection";

export const dynamic = "force-dynamic";

// The redesigned recipe detail page (Recipes v2's C3 phase) — top to
// bottom: header (back + Edit + ⋯), hero placeholder, title, the three
// action circles, the meta/source block, cookbook chips, stars + cooked,
// ingredients/instructions/notes, the nutrition placeholder, then tags.
// See CLAUDE.md's Recipes v2 plan for the full design and why each piece
// lives where it does.
export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [recipe, allTagsRaw, allCookbooksRaw] = await Promise.all([
    db.recipe.findUnique({
      where: { id },
      include: {
        tags: { select: { tag: { select: { id: true, name: true } } } },
        cookbooks: { select: { cookbook: { select: { id: true, title: true } } } },
      },
    }),
    // The full tag vocabulary, with a recipe count on each — cheap at
    // household scale, and it's what lets the delete-tag confirm show a
    // real count without a second round trip mid-interaction.
    db.tag.findMany({
      select: { id: true, name: true, _count: { select: { recipes: true } } },
      orderBy: { name: "asc" },
    }),
    db.cookbook.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
  ]);
  if (!recipe) notFound();

  const allTags = allTagsRaw.map((tag) => ({
    id: tag.id,
    name: tag.name,
    recipeCount: tag._count.recipes,
  }));
  const recipeTags = recipe.tags.map(({ tag }) => {
    const withCount = allTags.find((t) => t.id === tag.id);
    return withCount ?? { id: tag.id, name: tag.name, recipeCount: 1 };
  });
  const recipeCookbooks = recipe.cookbooks.map(({ cookbook }) => cookbook);

  return (
    <div className="py-2">
      <RecipeDetailHeader recipeId={recipe.id} recipeTitle={recipe.title} />

      <RecipeHero />

      <h1 className="mb-1 text-2xl font-bold tracking-tight md:text-3xl">
        {recipe.title}
      </h1>

      <RecipeActionCircles
        recipeId={recipe.id}
        title={recipe.title}
        ingredients={recipe.ingredients}
        steps={recipe.steps}
        initialShareToken={recipe.shareToken}
      />

      <RecipeMeta recipe={recipe} />

      <RecipeCookbooksSection
        recipeId={recipe.id}
        initialCookbooks={recipeCookbooks}
        allCookbooks={allCookbooksRaw}
      />

      <div className="mb-6 flex flex-col gap-3">
        <RecipeStars recipeId={recipe.id} initialRating={recipe.rating} />
        <RecipeCookedButton recipeId={recipe.id} initialLastCookedAt={recipe.lastCookedAt} />
      </div>

      <RecipeBody recipe={recipe} />

      <NutritionPlaceholder />

      <RecipeTagsSection recipeId={recipe.id} initialTags={recipeTags} allTags={allTags} />
    </div>
  );
}
