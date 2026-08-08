import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CookbookDetail } from "@/components/CookbookDetail";

export const dynamic = "force-dynamic";

// Every field the C4 filter bar needs to filter/sort by, on top of the
// basics — one shape shared by both queries below so a recipe looks the
// same whether it came from this cookbook or the full library.
const RECIPE_FIELDS = {
  id: true,
  title: true,
  ingredients: true,
  prepTime: true,
  cookTime: true,
  rating: true,
  lastCookedAt: true,
  tags: { select: { tagId: true } },
} as const;

type RawRecipe = {
  id: string;
  title: string;
  ingredients: string;
  prepTime: string | null;
  cookTime: string | null;
  rating: number | null;
  lastCookedAt: Date | null;
  tags: { tagId: string }[];
};

function toFilterableRecipe(recipe: RawRecipe) {
  return {
    id: recipe.id,
    title: recipe.title,
    ingredients: recipe.ingredients,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    rating: recipe.rating,
    lastCookedAt: recipe.lastCookedAt,
    tagIds: recipe.tags.map((t) => t.tagId),
  };
}

export default async function CookbookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [cookbook, allRecipesRaw, allTags] = await Promise.all([
    db.cookbook.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        recipes: { select: { recipe: { select: RECIPE_FIELDS } } },
      },
    }),
    // The add-sheet's "pick from your recipes" picker needs the full
    // library to search over; the page filters out what's already filed.
    // Also doubles as the C4 filter bar's lookup table when a recipe is
    // added, since AddRecipeToCookbookSheet only ever echoes back the
    // bare id/title/ingredients it was given.
    db.recipe.findMany({ select: RECIPE_FIELDS }),
    db.tag.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  if (!cookbook) notFound();

  return (
    <CookbookDetail
      cookbookId={cookbook.id}
      initialTitle={cookbook.title}
      initialRecipes={cookbook.recipes.map((entry) => toFilterableRecipe(entry.recipe))}
      allRecipes={allRecipesRaw.map(toFilterableRecipe)}
      allTags={allTags}
    />
  );
}
