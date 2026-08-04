// Removes every meal plan (and its entries, via cascade). Only touches the
// MealPlan / MealPlanEntry tables — see the warning at the top of
// seed-meal-plans.ts for why that boundary matters here.
//
// Run with:  npm run db:clean-meal-plans

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  const { count } = await db.mealPlan.deleteMany();
  console.log(`Deleted ${count} meal plans.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
