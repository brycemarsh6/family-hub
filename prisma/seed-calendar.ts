// Calendar-only test data, for exercising K1 (Week/Day views, the event
// form, multi-person color bands, and the Nov 1 2026 DST week) without
// touching anything else.
//
// Run with:  npm run db:seed-calendar
// Clean up with:  npm run db:clean-calendar
//
// IMPORTANT: this only ever touches CalendarEvent and CalendarEventPerson —
// never pantry, grocery, recipes, meal plans, or the User table. This
// script used to also create (and clean-calendar.ts delete) a handful of
// throwaway "ZZZ Test" User rows of its own — removed per mission-8's
// Captain B1 finding: a committed, rerunnable script may never create or
// delete `User` rows (see AGENTS.md's danger register). `displayName`
// carries no `@unique` constraint, so a name-matched delete could catch a
// row this script never created, including a same-named row that later
// gained a real login. Instead, this script ATTACHES its test events to
// whichever real people already exist in the database — it never writes to
// the User table at all, in either direction.
//
// Needs at least 3 real (non-deactivated) User rows to run — see main()
// below for the exact check and the error it prints if there aren't
// enough. Real accounts are created with `npm run db:bootstrap-users`.
//
// This script always runs from a real machine, never on Vercel — so unlike
// the app's own server code, it's safe for it to build "meaningful" local
// dates with `new Date(y, m, d, h, min)` here. See src/lib/mealPlanDates.ts
// (and the K1 calendarDates.ts it's paired with) for why that's NOT safe
// inside the app itself.
//
// All-day rows are built via calendarDates.ts's localDayToAllDayInstant —
// mission-13/CT1's fixed all-day convention: UTC midnight of the intended
// calendar date, not local midnight. This script used to build them as
// bare local midnight (the exact bug CT1 exists to close), which would
// have written freshly-wrong rows into the database on every future
// re-seed; fixed as part of CT1/C5. Timed events are unaffected — they
// keep building local-time instants exactly as before.
//
// Uses relative imports (not the "@/" shortcut) because this script is run
// directly by tsx, outside of Next.js.

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import { addDays, sundayOf } from "../src/lib/mealPlanDates";
import { localDayToAllDayInstant } from "../src/lib/calendarDates";
import { CALENDAR_SEED_EVENTS, type SeedEventTemplate } from "./calendar-seed-data";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const PEOPLE_NEEDED = 3;

// Sunday of the current real-world week, for every template except
// "dstWeek". Sunday Nov 1, 2026 is the exact US daylight-saving fall-back
// date — a real stress test for the range query and (separately) the
// calendar-component date math in calendarDates.ts, not a contrived one.
const thisWeekSunday = sundayOf(new Date());
const dstWeekSunday = new Date(2026, 10, 1);

function referenceSunday(template: SeedEventTemplate): Date {
  return template.kind === "dstWeek" ? dstWeekSunday : thisWeekSunday;
}

function buildRange(template: SeedEventTemplate): { startAt: Date; endAt: Date } {
  const startDay = addDays(referenceSunday(template), template.startDayOffset);
  const lastDay = addDays(startDay, template.spanDays - 1);

  if (template.allDay) {
    // endAt is EXCLUSIVE for all-day events — midnight of the day AFTER
    // the last day covered. See CalendarEvent.endAt's own doc comment.
    // startDay/lastDay are already local-midnight Date objects (built via
    // addDays from a local-midnight reference Sunday), so
    // localDayToAllDayInstant reads their real local Y/M/D straight off —
    // this is exactly the "LOCAL calendar day" input its own doc comment
    // describes, not a raw instant that would need re-interpreting.
    return {
      startAt: localDayToAllDayInstant(startDay),
      endAt: localDayToAllDayInstant(addDays(lastDay, 1)),
    };
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
  // Attach to real people rather than creating our own — see this file's
  // own header. Ordered by createdAt so a repeat run picks the same three
  // people every time (stable, not "whichever the database feels like").
  const people = await db.user.findMany({
    where: { deactivatedAt: null },
    orderBy: { createdAt: "asc" },
    take: PEOPLE_NEEDED,
    select: { id: true },
  });

  if (people.length < PEOPLE_NEEDED) {
    console.error(
      `Need at least ${PEOPLE_NEEDED} real people in the database to seed calendar test ` +
        `data (found ${people.length}). This script attaches its test events to real ` +
        `people rather than creating its own — see AGENTS.md's danger register on the ` +
        `User table. Run \`npm run db:bootstrap-users\` first to create real household ` +
        `accounts/profiles, then re-run this script.`,
    );
    process.exit(1);
  }

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
    `Seeded ${eventTitles.length} test events, attached to ${people.length} existing people.`,
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
