// Removes the fake events (title starts "zz-m56 " or "zz-m58 ", their sync
// rows go with them) and then the fake accounts made by seed-linked-calendars.ts: only
// LinkedAccount rows whose googleSubject starts with "zz-m55-". Their
// calendars go with them (schema-level cascade). Real linked accounts and the
// User table are never touched.
//
// Run with:  npm run db:clean-linked-calendars

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  // Pulled events (mission 58) first, then the rest, so nothing is left
  // pointing at a fake calendar.
  const pulled = await db.calendarEvent.deleteMany({
    where: { title: { startsWith: "zz-m58 " } },
  });
  const events = await db.calendarEvent.deleteMany({
    where: { title: { startsWith: "zz-m56 " } },
  });
  const { count } = await db.linkedAccount.deleteMany({
    where: { googleSubject: { startsWith: "zz-m55-" } },
  });
  console.log(
    `Deleted ${events.count + pulled.count} fake event(s) and ${count} fake linked account(s). No User rows touched.`,
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
