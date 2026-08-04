// Removes the test recipes seeded by seed-recipes.ts, matched by their exact
// titles — never the household's own real recipes, which live in this same
// table on this same shared Neon database. See the warning at the top of
// seed-recipes.ts for why that boundary matters here.
//
// Run with:  npm run db:clean-recipes

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { recipes } from "./recipe-seed-data";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  const titles = recipes.map((recipe) => recipe.title);
  const { count } = await db.recipe.deleteMany({ where: { title: { in: titles } } });
  console.log(`Deleted ${count} test recipes.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
