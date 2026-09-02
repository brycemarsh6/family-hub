// Removes the test data seeded by seed-calendar.ts: the events, matched by
// their exact titles, and the passwordless test people, matched by their
// exact displayNames — never the household's own real events or real
// people, which live in these same tables.
//
// This is NOT a general clean/reset script for the User table (that's
// forbidden — see AGENTS.md's danger register): it deletes only the exact
// "ZZZ Test"-prefixed rows this script's own seed created, by exact name,
// the same narrow fingerprint-matching discipline the recipe and meal-plan
// scripts use for their own tables. It never touches any other User row.
//
// Run with:  npm run db:clean-calendar

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { CALENDAR_SEED_PEOPLE, CALENDAR_SEED_EVENTS } from "./calendar-seed-data";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  const eventTitles = CALENDAR_SEED_EVENTS.map((e) => e.title);
  const { count: eventsDeleted } = await db.calendarEvent.deleteMany({
    where: { title: { in: eventTitles } },
  });

  const personNames = CALENDAR_SEED_PEOPLE.map((p) => p.displayName);
  const { count: peopleDeleted } = await db.user.deleteMany({
    where: { displayName: { in: personNames } },
  });

  console.log(`Deleted ${eventsDeleted} test events and ${peopleDeleted} test people.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
