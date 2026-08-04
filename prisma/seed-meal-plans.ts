// Meal-plan-only test data, for exercising M1 (current week, history, the +
// flow) without touching anything else.
//
// Run with:  npm run db:seed-meal-plans
// Clean up with:  npm run db:clean-meal-plans
//
// IMPORTANT: this only ever touches the MealPlan / MealPlanEntry tables.
// Like seed-recipes.ts, it must NOT touch pantry, grocery, or recipes — the
// same Neon database backs both local dev and the live production app.
//
// This script always runs from a real laptop (Mountain time), never on
// Vercel — so unlike the app's own server code, it's safe for it to build
// "meaningful" dates with `new Date(y, m, d)` here. See
// src/lib/mealPlanDates.ts for why that's NOT safe inside the app itself.
//
// Uses relative imports (not the "@/" shortcut) because this script is run
// directly by tsx, outside of Next.js.

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { addDays, sundayOf } from "../src/lib/mealPlanDates";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

type SeedEntry = { dayOffset: number; slot: string; title: string };

const thisWeek = sundayOf(new Date());
const lastWeek = addDays(thisWeek, -7);
// Sunday Nov 1, 2026 is the exact US daylight-saving fall-back date — a real
// stress test for the calendar-component date math, not a contrived one.
const dstWeek = new Date(2026, 10, 1);

const weeks: { weekStart: Date; entries: SeedEntry[] }[] = [
  {
    weekStart: lastWeek,
    entries: [
      { dayOffset: 0, slot: "Dinner", title: "Pot roast" },
      { dayOffset: 2, slot: "Dinner", title: "Leftovers" },
      { dayOffset: 4, slot: "Dinner", title: "Tacos" },
      { dayOffset: 6, slot: "Lunch", title: "Eating out" },
    ],
  },
  {
    weekStart: thisWeek,
    entries: [
      { dayOffset: 0, slot: "Breakfast", title: "Pancakes" },
      { dayOffset: 0, slot: "Dinner", title: "Honey mustard chicken" },
      { dayOffset: 1, slot: "Dinner", title: "Jambalaya" },
      { dayOffset: 3, slot: "Lunch", title: "Leftovers" },
      { dayOffset: 5, slot: "Dinner", title: "Takeout" },
    ],
  },
  {
    weekStart: dstWeek,
    entries: [
      { dayOffset: 0, slot: "Dinner", title: "Chocolate chip cookies for dessert" },
      { dayOffset: 3, slot: "Dinner", title: "Zucchini bread" },
    ],
  },
];

async function main() {
  // Only ever clears its own tables — never pantry, grocery, or recipes.
  // Entries cascade-delete with their plan, so clearing MealPlan is enough.
  await db.mealPlan.deleteMany();

  for (const week of weeks) {
    await db.mealPlan.create({
      data: {
        weekStart: week.weekStart,
        entries: { create: week.entries },
      },
    });
  }

  const planCount = await db.mealPlan.count();
  const entryCount = await db.mealPlanEntry.count();
  console.log(`Seeded ${planCount} weeks, ${entryCount} meals.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
