import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getVerifiedUser } from "@/lib/dal";
import { MANAGER_ROLES } from "@/lib/constants";
import { RecipeDetailHeader } from "@/components/RecipeDetailHeader";
import { RecipeHero } from "@/components/RecipeHero";
import { RecipeActionCircles } from "@/components/RecipeActionCircles";
import { RecipeMeta } from "@/components/RecipeMeta";
import { RecipeCookbooksSection } from "@/components/RecipeCookbooksSection";
import { RecipeStars } from "@/components/RecipeStars";
import { RecipeCookedButton } from "@/components/RecipeCookedButton";
import { RecipeBody } from "@/components/RecipeBody";
import { NutritionSection } from "@/components/NutritionSection";
import { RecipeTagsSection } from "@/components/RecipeTagsSection";
import { fingerprintIngredients } from "@/lib/nutritionFingerprint";

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

  // Only to decide whether Edit/Delete render below — updateRecipe and
  // deleteRecipe are the real, server-side gates (mission-6's C1).
  const user = await getVerifiedUser();
  const canManage = user !== null && MANAGER_ROLES.includes(user.role);

  const [recipe, allTagsRaw, allCookbooksRaw, plannedWeeks] = await Promise.all([
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
    // Which weeks already have a plan, so the Meal Plan picker reuses one
    // rather than colliding on MealPlan.weekStart. Deliberately just the
    // ids and dates — this page decides nothing about *which* week is
    // current; that's the browser's job (see src/lib/mealPlanDates.ts).
    db.mealPlan.findMany({ select: { id: true, weekStart: true } }),
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
      <RecipeDetailHeader
        recipeId={recipe.id}
        recipeTitle={recipe.title}
        canManage={canManage}
      />

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
        plannedWeeks={plannedWeeks}
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

      <NutritionSection
        recipeId={recipe.id}
        servingsText={recipe.servings}
        initial={
          recipe.nutritionCalories !== null &&
          recipe.nutritionProteinG !== null &&
          recipe.nutritionCarbsG !== null &&
          recipe.nutritionFatG !== null &&
          recipe.nutritionServings !== null
            ? {
                calories: recipe.nutritionCalories,
                proteinG: recipe.nutritionProteinG,
                carbsG: recipe.nutritionCarbsG,
                fatG: recipe.nutritionFatG,
                servings: recipe.nutritionServings,
              }
            : null
        }
        stale={
          recipe.nutritionFingerprint !== null &&
          recipe.nutritionFingerprint !== fingerprintIngredients(recipe.ingredients)
        }
      />

      <RecipeTagsSection recipeId={recipe.id} initialTags={recipeTags} allTags={allTags} />
    </div>
  );
}
