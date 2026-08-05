// Meal-plan-only test data, for exercising the Meal Plan UI (current week,
// history, the + flow, the DST week) without touching anything else.
//
// Run with:  npm run db:seed-meal-plans
// Clean up with:  npm run db:clean-meal-plans
//
// IMPORTANT: this only ever touches the MealPlan / MealPlanEntry tables.
// Like seed-recipes.ts, it must NOT touch pantry, grocery, or recipes — the
// same Neon database backs both local dev and the live production app.
//
// IT ALSO NEVER DELETES. This used to open with db.mealPlan.deleteMany(),
// which was correct only while meal plans were exclusively test data. The
// weeks below are "last week" and "this week" — the exact weeks the family
// plans for real — so a plan already sitting on one of them is far more
// likely to be theirs than ours. Existing weeks are therefore skipped and
// reported, never replaced. See prisma/meal-plan-seed-data.ts for the full
// reasoning and the fingerprint cleanup uses.
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
import { SEED_WEEK_TEMPLATES } from "./meal-plan-seed-data";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const thisWeek = sundayOf(new Date());
const lastWeek = addDays(thisWeek, -7);
// Sunday Nov 1, 2026 is the exact US daylight-saving fall-back date — a real
// stress test for the calendar-component date math, not a contrived one.
const dstWeek = new Date(2026, 10, 1);

const WEEK_START: Record<string, Date> = { lastWeek, thisWeek, dstWeek };

async function main() {
  let created = 0;
  let skipped = 0;

  for (const week of SEED_WEEK_TEMPLATES) {
    const weekStart = WEEK_START[week.when];

    const existing = await db.mealPlan.findUnique({ where: { weekStart } });
    if (existing) {
      // Could easily be a real plan the family made — leave it completely
      // alone rather than guessing.
      console.warn(
        `SKIPPED ${week.when} (${weekStart.toDateString()}): a plan already ` +
          `exists for that week. Not touching it — delete that week in the ` +
          `app first if you actually want the test data there.`,
      );
      skipped++;
      continue;
    }

    await db.mealPlan.create({
      data: { weekStart, entries: { create: week.entries } },
    });
    created++;
  }

  console.log(`Seeded ${created} test weeks, skipped ${skipped}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
