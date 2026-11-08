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
import {
  RecipeIngredientsSection,
  RecipeStepsSection,
  RecipeNotesSection,
} from "@/components/RecipeBody";
import { NutritionSection } from "@/components/NutritionSection";
import { RecipeTagsSection } from "@/components/RecipeTagsSection";
import { fingerprintIngredients } from "@/lib/nutritionFingerprint";

export const dynamic = "force-dynamic";

// The redesigned recipe detail page (Recipes v2's C3 phase), widened for the
// iPad in landscape (mission 51, L5). Top to bottom: header (back + Edit +
// ⋯), then the header band (hero or small icon, title and meta line, the
// three action circles), then the body. The band is NOT a container because
// it holds the action sheets; that is why RecipeHero is the page's one
// screen breakpoint (`md`, see its comment). The body is one container:
// from 48rem Ingredients (400px), the Rating card and Nutrition sit in a
// left column beside Instructions, Notes, Cookbooks and Tags on the right.
// On a phone the two column divs dissolve (`@max-[48rem]:contents`) and the
// `order-N` on each section sets one reading order: Ingredients,
// Instructions, Notes, Rating + Cooked, Nutrition, Cookbooks, Tags. That
// trick is only for a small fixed set of sections like this, never a list.
// Nutrition (Confirm servings), Cookbooks and Tags open sheets from inside
// the container; they are the known exceptions listed in STRUCTURE.md's
// Wide pages rule 1 (Chrome keeps fixed children on the viewport). See
// CLAUDE.md's Recipes v2 plan for the rest.
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
    <div className="py-2" data-page-width="wide">
      <RecipeDetailHeader
        recipeId={recipe.id}
        recipeTitle={recipe.title}
        canManage={canManage}
      />

      <div className="mb-6 flex flex-wrap items-start gap-4">
        <RecipeHero />

        <div className="min-w-0 flex-1 basis-[20rem]">
          <h1 className="mb-1 text-2xl font-bold tracking-tight md:text-3xl">
            {recipe.title}
          </h1>
          <RecipeMeta recipe={recipe} />
        </div>

        <RecipeActionCircles
          className="w-full shrink-0 justify-around md:ml-auto md:w-auto md:gap-6"
          recipeId={recipe.id}
          title={recipe.title}
          ingredients={recipe.ingredients}
          steps={recipe.steps}
          initialShareToken={recipe.shareToken}
          plannedWeeks={plannedWeeks}
        />
      </div>

      <div className="@container">
        <div className="flex flex-col @min-[48rem]:grid @min-[48rem]:grid-cols-[25rem_minmax(0,1fr)] @min-[48rem]:items-start @min-[48rem]:gap-5">
          <div className="flex flex-col @max-[48rem]:contents">
            <div className="order-1">
              <RecipeIngredientsSection ingredients={recipe.ingredients} />
            </div>
            <section className="order-4 mb-6 flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
              <h2 className="text-lg font-semibold">Rating</h2>
              <RecipeStars recipeId={recipe.id} initialRating={recipe.rating} />
              <RecipeCookedButton
                recipeId={recipe.id}
                initialLastCookedAt={recipe.lastCookedAt}
              />
            </section>
            <div className="order-5">
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
            </div>
          </div>

          <div className="flex flex-col @max-[48rem]:contents">
            <div className="order-2">
              <RecipeStepsSection steps={recipe.steps} />
            </div>
            <div className="order-3">
              <RecipeNotesSection notes={recipe.notes} />
            </div>
            <div className="order-6">
              <RecipeCookbooksSection
                recipeId={recipe.id}
                initialCookbooks={recipeCookbooks}
                allCookbooks={allCookbooksRaw}
              />
            </div>
            <div className="order-7">
              <RecipeTagsSection recipeId={recipe.id} initialTags={recipeTags} allTags={allTags} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
