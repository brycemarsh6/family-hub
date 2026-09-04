// Removes the test data seeded by seed-calendar.ts: the events, matched by
// their exact "ZZZ Test"-prefixed titles — never the household's own real
// events, which live in this same table.
//
// This script touches ONLY CalendarEvent (its people rows cascade with it,
// schema-level). It never touches the User table in either direction —
// seed-calendar.ts attaches its test events to whichever real people
// already exist rather than creating its own, so there is no test person
// for this script to remove. See AGENTS.md's danger register and this
// file's own history (mission-8's Captain B1 finding): a committed script
// that creates or deletes `User` rows is forbidden outright, because
// `displayName` carries no `@unique` constraint and a name-matched delete
// can catch a row the seeder never created — including a same-named row
// that later gained a real login.
//
// Run with:  npm run db:clean-calendar

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { CALENDAR_SEED_EVENTS } from "./calendar-seed-data";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  const eventTitles = CALENDAR_SEED_EVENTS.map((e) => e.title);
  const { count: eventsDeleted } = await db.calendarEvent.deleteMany({
    where: { title: { in: eventTitles } },
  });

  console.log(`Deleted ${eventsDeleted} test events. No User rows touched.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
