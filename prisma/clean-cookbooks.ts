// Removes the test cookbooks seeded by seed-cookbooks.ts, matched by their
// exact titles — never the household's own real cookbooks, which live in
// this same table on this same shared Neon database. See the warning at the
// top of seed-cookbooks.ts for why that boundary matters here.
//
// Run with:  npm run db:clean-cookbooks

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { cookbookTitles } from "./cookbook-seed-data";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  const { count } = await db.cookbook.deleteMany({
    where: { title: { in: cookbookTitles } },
  });
  console.log(`Deleted ${count} test cookbooks.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
