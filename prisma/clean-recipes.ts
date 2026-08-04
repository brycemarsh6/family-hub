// Removes every recipe. Only touches the Recipe table — see the warning at
// the top of seed-recipes.ts for why that boundary matters here.
//
// Run with:  npm run db:clean-recipes

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  const { count } = await db.recipe.deleteMany();
  console.log(`Deleted ${count} recipes.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
