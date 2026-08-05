// Removes ONLY the meal plans seeded by seed-meal-plans.ts — never a real
// week the family planned. Only touches the MealPlan / MealPlanEntry tables;
// see the warning at the top of seed-meal-plans.ts for why that boundary
// matters here.
//
// Run with:  npm run db:clean-meal-plans
//
// This used to be a blanket db.mealPlan.deleteMany(). That was fine while
// meal plans were exclusively test data and became a loaded gun the moment
// the family planned a real week. It can't simply scope by `weekStart` the
// way the recipe scripts scope by title, because the seeded weeks ARE real
// weeks ("last week", "this week") — so a plan is deleted only when its
// entries match a seed template exactly. Anything edited, added to, or
// unrecognized is reported and left alone. See prisma/meal-plan-seed-data.ts.

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { entrySignature, SEED_SIGNATURES } from "./meal-plan-seed-data";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  const plans = await db.mealPlan.findMany({
    include: { entries: { select: { dayOffset: true, slot: true, title: true } } },
  });

  let deleted = 0;
  const kept: string[] = [];

  for (const plan of plans) {
    // Deliberately ignores weekStart: seeding on a Saturday and cleaning on
    // the Sunday after would shift "this week" underneath us, and the entry
    // set is the real fingerprint anyway.
    if (SEED_SIGNATURES.has(entrySignature(plan.entries))) {
      await db.mealPlan.delete({ where: { id: plan.id } });
      deleted++;
    } else {
      kept.push(
        `${plan.weekStart.toDateString()} (${plan.entries.length} meals)`,
      );
    }
  }

  console.log(`Deleted ${deleted} test weeks.`);
  if (kept.length > 0) {
    console.log(
      `Left ${kept.length} plan(s) alone — not recognized as test data:`,
    );
    for (const label of kept) console.log(`  - ${label}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
