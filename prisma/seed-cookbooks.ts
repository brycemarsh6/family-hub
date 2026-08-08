// Cookbook-only test data, for exercising C1 (create, file, unfile, delete)
// without touching anything else.
//
// Run with:  npm run db:seed-cookbooks
// Clean up with:  npm run db:clean-cookbooks
//
// IMPORTANT: same rule as seed-recipes.ts — this only ever touches the
// Cookbook and CookbookRecipe tables, matched by exact title. It must NEVER
// clear pantry, grocery, or the family's own real recipes/cookbooks — this
// is the same shared Neon database local dev and production both use.
//
// Uses relative imports (not the "@/" shortcut) because this script is run
// directly by tsx, outside of Next.js.

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import {
  WEEKNIGHT_COOKBOOK_TITLE,
  EMPTY_COOKBOOK_TITLE,
  cookbookTitles,
  weeknightRecipeTitles,
} from "./cookbook-seed-data";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  // Only ever clears the test cookbooks this script itself seeds, matched
  // by their exact titles — the join rows cascade with them, but that never
  // touches the recipes those rows pointed at (real or test), since
  // deleting a cookbook only ever unfiles, never deletes.
  await db.cookbook.deleteMany({ where: { title: { in: cookbookTitles } } });

  const weeknight = await db.cookbook.create({
    data: { title: WEEKNIGHT_COOKBOOK_TITLE },
  });
  await db.cookbook.create({ data: { title: EMPTY_COOKBOOK_TITLE } });

  const recipes = await db.recipe.findMany({
    where: { title: { in: weeknightRecipeTitles } },
    select: { id: true },
  });
  if (recipes.length < weeknightRecipeTitles.length) {
    console.warn(
      "Some test recipes weren't found — run `npm run db:seed-recipes` first for a full test set.",
    );
  }

  await db.cookbookRecipe.createMany({
    data: recipes.map((recipe) => ({ cookbookId: weeknight.id, recipeId: recipe.id })),
  });

  console.log(
    `Seeded ${cookbookTitles.length} test cookbooks (${recipes.length} recipes filed into "${WEEKNIGHT_COOKBOOK_TITLE}").`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
