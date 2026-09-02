// Calendar-only test data, for exercising K1 (Week/Day views, the event
// form, multi-person color bands, and the Nov 1 2026 DST week) without
// touching anything else.
//
// Run with:  npm run db:seed-calendar
// Clean up with:  npm run db:clean-calendar
//
// IMPORTANT: this only ever touches CalendarEvent, CalendarEventPerson, and
// a small handful of passwordless test User rows it creates itself — never
// pantry, grocery, recipes, meal plans, or any real household person. The
// User table holds the family's real accounts and login credentials (see
// AGENTS.md's danger register); this script creates ONLY the "ZZZ Test"
// prefixed profiles listed in calendar-seed-data.ts, and clean-calendar.ts
// removes exactly those by that same exact name, never anyone else.
//
// This script always runs from a real machine, never on Vercel — so unlike
// the app's own server code, it's safe for it to build "meaningful" local
// dates with `new Date(y, m, d, h, min)` here. See src/lib/mealPlanDates.ts
// (and the K1 calendarDates.ts it's paired with) for why that's NOT safe
// inside the app itself.
//
// Uses relative imports (not the "@/" shortcut) because this script is run
// directly by tsx, outside of Next.js.

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { addDays, sundayOf } from "../src/lib/mealPlanDates";
import {
  CALENDAR_SEED_PEOPLE,
  CALENDAR_SEED_EVENTS,
  type SeedEventTemplate,
} from "./calendar-seed-data";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

// Sunday of the current real-world week, for every template except
// "dstWeek". Sunday Nov 1, 2026 is the exact US daylight-saving fall-back
// date — a real stress test for the range query and (separately) the
// calendar-component date math in calendarDates.ts, not a contrived one.
const thisWeekSunday = sundayOf(new Date());
const dstWeekSunday = new Date(2026, 10, 1);

function referenceSunday(template: SeedEventTemplate): Date {
  return template.kind === "dstWeek" ? dstWeekSunday : thisWeekSunday;
}

/** Local midnight of `date`. */
function localMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function buildRange(template: SeedEventTemplate): { startAt: Date; endAt: Date } {
  const startDay = addDays(referenceSunday(template), template.startDayOffset);
  const lastDay = addDays(startDay, template.spanDays - 1);

  if (template.allDay) {
    // endAt is EXCLUSIVE for all-day events — midnight of the day AFTER
    // the last day covered. See CalendarEvent.endAt's own doc comment.
    return { startAt: localMidnight(startDay), endAt: addDays(localMidnight(lastDay), 1) };
  }

  const { startTime, endTime } = template;
  if (!startTime || !endTime) {
    throw new Error(`Timed event "${template.title}" is missing startTime/endTime.`);
  }

  const startAt = new Date(
    startDay.getFullYear(),
    startDay.getMonth(),
    startDay.getDate(),
    startTime.hour,
    startTime.minute,
  );
  const endAt = new Date(
    lastDay.getFullYear(),
    lastDay.getMonth(),
    lastDay.getDate(),
    endTime.hour,
    endTime.minute,
  );
  return { startAt, endAt };
}

async function main() {
  // Passwordless test profiles this script owns outright — clean-calendar.ts
  // removes exactly these by exact displayName, never any real person.
  const personNames = CALENDAR_SEED_PEOPLE.map((p) => p.displayName);
  await db.user.deleteMany({ where: { displayName: { in: personNames } } });

  const people = await Promise.all(
    CALENDAR_SEED_PEOPLE.map((person) =>
      db.user.create({
        data: {
          displayName: person.displayName,
          avatarColor: person.avatarColor,
          role: "kid",
          // passwordHash left null on purpose — a non-login profile, see
          // User's own doc comment in schema.prisma.
        },
        select: { id: true },
      }),
    ),
  );

  const eventTitles = CALENDAR_SEED_EVENTS.map((e) => e.title);
  await db.calendarEvent.deleteMany({ where: { title: { in: eventTitles } } });

  for (const template of CALENDAR_SEED_EVENTS) {
    const { startAt, endAt } = buildRange(template);
    await db.calendarEvent.create({
      data: {
        title: template.title,
        notes: template.notes ?? null,
        location: template.location ?? null,
        startAt,
        endAt,
        allDay: template.allDay,
        people: {
          create: template.people.map((index) => ({ userId: people[index].id })),
        },
      },
    });
  }

  console.log(
    `Seeded ${people.length} test people and ${eventTitles.length} test events.`,
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
