// Recipe-only test data, for exercising R1 (the alphabetized list, search
// later in R2, and the CRUD pages) without touching anything else.
//
// Run with:  npm run db:seed-recipes
// Clean up with:  npm run db:clean-recipes
//
// IMPORTANT: this only ever touches the Recipe table. Unlike prisma/seed.ts,
// it must NOT clear pantry or grocery data — the same Neon database backs
// both local dev and the live production app the family actually uses (see
// the Recipes plan in CLAUDE.md), and there is no separate dev database.
//
// Uses relative imports (not the "@/" shortcut) because this script is run
// directly by tsx, outside of Next.js.

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { recipes } from "./recipe-seed-data";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  // Only ever clears the test recipes this script itself seeds, matched by
  // their exact titles — never pantry, never grocery, and critically never
  // the household's own real recipes. This used to be a blanket
  // db.recipe.deleteMany(), which was correct when the Recipe table held
  // nothing but test data; it stopped being correct the moment the family
  // started saving real recipes into the same shared Neon database.
  const titles = recipes.map((recipe) => recipe.title);
  await db.recipe.deleteMany({ where: { title: { in: titles } } });
  await db.recipe.createMany({ data: recipes });

  console.log(`Seeded ${titles.length} test recipes.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
