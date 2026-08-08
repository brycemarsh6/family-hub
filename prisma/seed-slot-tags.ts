// Seeds the four meal-slot tags (Breakfast, Lunch, Dinner, Snacks) from
// MEAL_SLOTS — real, permanent app data, not throwaway test data. Upsert by
// name, so running this more than once (e.g. re-running it against
// production after a deploy) never duplicates. Safe against the live shared
// database: it only ever creates these four exact rows if they're missing,
// never deletes or touches anything else.
//
// Run with:  npm run db:seed-slot-tags

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { MEAL_SLOTS } from "../src/lib/constants";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  for (const slot of MEAL_SLOTS) {
    await db.tag.upsert({ where: { name: slot }, create: { name: slot }, update: {} });
  }
  console.log(`Ensured ${MEAL_SLOTS.length} slot tags exist: ${MEAL_SLOTS.join(", ")}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
